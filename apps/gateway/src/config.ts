import crypto from 'node:crypto';

export type Role = 'admin' | 'analyst' | 'auditor';

export interface GatewayUser {
  id: string;
  username: string;
  role: Role;
  permissions: string[];
}

export interface UpstreamService {
  id: 'scanner' | 'network' | 'assessments';
  label: string;
  baseUrl: string;
  gatewayPrefix: string;
  targetPrefix: string;
  permission: string;
}

export interface AppConfig {
  appEnv: string;
  host: string;
  port: number;
  jwtSecret: string;
  cookieSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  corsOrigins: string[];
  upstreamAllowlist: string[];
  services: UpstreamService[];
}

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function listFromEnv(name: string, fallback: string): string[] {
  return (process.env[name] ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'local';
  const jwtSecret = process.env.JWT_SECRET ?? crypto.randomBytes(32).toString('hex');
  const cookieSecret = process.env.COOKIE_SECRET ?? crypto.randomBytes(32).toString('hex');

  if (appEnv === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set outside local/demo mode');
  }

  const config: AppConfig = {
    appEnv,
    host: process.env.HOST ?? '0.0.0.0',
    port: numberFromEnv('PORT', 3000),
    jwtSecret,
    cookieSecret,
    accessTokenTtlSeconds: numberFromEnv('ACCESS_TOKEN_TTL_SECONDS', 900),
    refreshTokenTtlSeconds: numberFromEnv('REFRESH_TOKEN_TTL_SECONDS', 60 * 60 * 24 * 7),
    rateLimitMax: numberFromEnv('RATE_LIMIT_MAX', 120),
    rateLimitWindowMs: numberFromEnv('RATE_LIMIT_WINDOW_MS', 60_000),
    corsOrigins: listFromEnv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000'),
    upstreamAllowlist: listFromEnv(
      'UPSTREAM_ALLOWLIST',
      'vulnerability-scanner,network-analyzer,assessment-orchestrator,localhost,127.0.0.1'
    ),
    services: [
      {
        id: 'scanner',
        label: 'Vulnerability Scanner',
        baseUrl: process.env.SCANNER_URL ?? 'http://vulnerability-scanner:8080',
        gatewayPrefix: '/api/scans',
        targetPrefix: '/scans',
        permission: 'scans:read',
      },
      {
        id: 'network',
        label: 'Network Analyzer',
        baseUrl: process.env.NETWORK_URL ?? 'http://network-analyzer:8081',
        gatewayPrefix: '/api/network',
        targetPrefix: '/monitoring',
        permission: 'network:read',
      },
      {
        id: 'assessments',
        label: 'Assessment Orchestrator',
        baseUrl: process.env.ASSESSMENT_URL ?? 'http://assessment-orchestrator:8082',
        gatewayPrefix: '/api/assessments',
        targetPrefix: '/assessments',
        permission: 'assessments:read',
      },
    ],
  };

  return { ...config, ...overrides };
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*:*'],
  analyst: [
    'services:read',
    'scans:read',
    'scans:create',
    'network:read',
    'assessments:read',
    'assessments:create',
  ],
  auditor: ['services:read', 'scans:read', 'network:read', 'assessments:read', 'audit:read'],
};
