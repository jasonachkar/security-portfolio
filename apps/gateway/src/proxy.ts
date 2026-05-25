import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig, UpstreamService } from './config.js';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'cookie',
]);

export function isUpstreamAllowed(baseUrl: string, allowlist: string[]): boolean {
  try {
    const parsed = new URL(baseUrl);
    return allowlist.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function buildTargetUrl(service: UpstreamService, requestUrl: string): string {
  const incoming = new URL(requestUrl, 'http://gateway.local');
  const suffix = incoming.pathname.slice(service.gatewayPrefix.length);
  const path = `${service.targetPrefix}${suffix}`;
  const target = new URL(path || service.targetPrefix, service.baseUrl);
  target.search = incoming.search;
  return target.toString();
}

export async function proxyToService(
  request: FastifyRequest,
  reply: FastifyReply,
  service: UpstreamService,
  config: AppConfig
): Promise<void> {
  if (!isUpstreamAllowed(service.baseUrl, config.upstreamAllowlist)) {
    return reply.status(502).send({
      error: {
        code: 'UPSTREAM_NOT_ALLOWLISTED',
        message: 'Configured upstream is not allowlisted',
      },
    });
  }

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers)) {
    const lower = name.toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lower) && value !== undefined) {
      headers[name] = Array.isArray(value) ? value.join(',') : String(value);
    }
  }
  headers['x-request-id'] = String(request.headers['x-request-id'] ?? (request as any).requestId ?? '');

  const response = await fetch(buildTargetUrl(service, request.url), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body ?? {}),
  });

  reply.status(response.status);
  for (const [name, value] of response.headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      reply.header(name, value);
    }
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json') && text) {
    return reply.send(JSON.parse(text));
  }
  return reply.send(text);
}
