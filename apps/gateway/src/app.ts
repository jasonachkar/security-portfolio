import crypto from 'node:crypto';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { z } from 'zod';
import { AuditLog } from './audit.js';
import { AuthError, AuthService, loginSchema } from './auth.js';
import { loadConfig, type AppConfig } from './config.js';
import { hasPermission } from './rbac.js';
import { registerRateLimit } from './rateLimit.js';
import { proxyToService } from './proxy.js';

interface CreateAppResult {
  app: FastifyInstance;
  audit: AuditLog;
  auth: AuthService;
  config: AppConfig;
}

function getBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header) {
    return undefined;
  }
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}

export async function createApp(overrides: Partial<AppConfig> = {}): Promise<CreateAppResult> {
  const config = loadConfig(overrides);
  const audit = new AuditLog();
  const auth = new AuthService(config, audit);
  const app = Fastify({
    logger: false,
    trustProxy: true,
    requestTimeout: 30_000,
    bodyLimit: 1024 * 1024,
  });

  app.decorateRequest('requestId', '');
  app.decorateRequest('user', null);

  await app.register(cookie, {
    secret: config.cookieSecret,
  });
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Defensive Security Platform Gateway',
        version: '0.1.0',
        description: 'Secure gateway for the Defensive Security Platform Lab',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.addHook('onRequest', async (request, reply) => {
    const requestId = request.headers['x-request-id']?.toString() ?? crypto.randomUUID();
    (request as any).requestId = requestId;
    reply.header('X-Request-ID', requestId);
  });
  registerRateLimit(app, config, audit);

  app.setErrorHandler((error, request, reply) => {
    const requestId = (request as any).requestId;
    if (error instanceof AuthError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
        requestId,
      });
    }
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details: error.errors },
        requestId,
      });
    }
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId,
    });
  });

  function requireAuth(request: FastifyRequest): void {
    const token = getBearerToken(request);
    if (!token) {
      throw new AuthError(401, 'UNAUTHORIZED', 'Missing bearer token');
    }
    (request as any).user = auth.verifyAccessToken(token);
  }

  function requirePermission(permission: string) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      requireAuth(request);
      const user = (request as any).user;
      if (!hasPermission(user, permission)) {
        audit.emit({
          action: 'gateway.permission_denied',
          outcome: 'denied',
          actor: user.username,
          ip: request.ip,
          requestId: (request as any).requestId,
          resource: permission,
        });
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
          requestId: (request as any).requestId,
        });
      }
    };
  }

  app.get('/healthz', async () => ({ status: 'ok', service: 'gateway' }));
  app.get('/readyz', async () => ({
    status: 'ok',
    services: config.services.map((service) => ({
      id: service.id,
      allowlisted: true,
    })),
  }));

  app.post('/auth/login', async (request, reply) => {
    const credentials = loginSchema.parse(request.body);
    const result = auth.login(credentials.username, credentials.password, request.ip, (request as any).requestId);
    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: config.appEnv === 'production',
      maxAge: config.refreshTokenTtlSeconds,
    });
    const { refreshToken: _refreshToken, ...response } = result;
    return response;
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string().optional() }).optional().parse(request.body);
    const refreshToken = request.cookies.refreshToken ?? body?.refreshToken;
    if (!refreshToken) {
      throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token cookie is required');
    }
    const result = auth.refresh(refreshToken, request.ip, (request as any).requestId);
    reply.setCookie('refreshToken', result.refreshToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: config.appEnv === 'production',
      maxAge: config.refreshTokenTtlSeconds,
    });
    const { refreshToken: _refreshToken, ...response } = result;
    return response;
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = z.object({ refreshToken: z.string().optional() }).optional().parse(request.body);
    auth.logout(request.cookies.refreshToken ?? body?.refreshToken, request.ip, (request as any).requestId);
    reply.clearCookie('refreshToken', { path: '/' });
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: async (request) => requireAuth(request) }, async (request) => {
    const user = (request as any).user;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    };
  });

  app.get('/admin/audit-events', { preHandler: requirePermission('audit:read') }, async (request) => {
    const limit = Number((request.query as any)?.limit ?? 100);
    return { events: audit.list(Math.min(Math.max(limit, 1), 250)) };
  });

  app.get('/gateway/services', { preHandler: requirePermission('services:read') }, async () => ({
    services: config.services.map((service) => ({
      id: service.id,
      label: service.label,
      gatewayPrefix: service.gatewayPrefix,
      targetPrefix: service.targetPrefix,
    })),
  }));

  for (const service of config.services) {
    const handler = async (request: FastifyRequest, reply: FastifyReply) => {
      await requirePermission(service.permission)(request, reply);
      if (reply.sent) {
        return;
      }
      audit.emit({
        action: `gateway.proxy_${service.id}`,
        outcome: 'success',
        actor: (request as any).user?.username,
        ip: request.ip,
        requestId: (request as any).requestId,
        resource: request.url,
      });
      await proxyToService(request, reply, service, config);
    };
    app.all(service.gatewayPrefix, handler);
    app.all(`${service.gatewayPrefix}/*`, handler);
  }

  return { app, audit, auth, config };
}

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    user: unknown;
  }
}
