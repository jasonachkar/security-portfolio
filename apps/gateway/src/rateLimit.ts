import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AuditLog } from './audit.js';
import type { AppConfig } from './config.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export function registerRateLimit(app: FastifyInstance, config: AppConfig, audit: AuditLog): void {
  const buckets = new Map<string, Bucket>();

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.url === '/healthz' || request.url === '/readyz') {
      return;
    }

    const key = request.ip;
    const now = Date.now();
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + config.rateLimitWindowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, config.rateLimitMax - bucket.count);
    reply.header('RateLimit-Limit', config.rateLimitMax);
    reply.header('RateLimit-Remaining', remaining);
    reply.header('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > config.rateLimitMax) {
      audit.emit({
        action: 'gateway.rate_limit_exceeded',
        outcome: 'failure',
        ip: request.ip,
        requestId: request.headers['x-request-id']?.toString(),
        resource: request.url,
      });
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
        requestId: request.headers['x-request-id'],
      });
    }
  });
}
