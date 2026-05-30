import type { Proof } from '../components/shared/ProofLink';

export const GATEWAY_MISSION =
  'The gateway is the single public front door for the platform. Authentication, authorization, rate limiting, request validation, audit, and a fixed-registry proxy are all enforced here, so the internal scanner, network, and assessment services never need public ingress of their own.';

export interface AuthStep {
  title: string;
  detail: string;
  proof: Proof;
}

/** Login → access token → rotation → reuse detection → logout. */
export const AUTH_FLOW: AuthStep[] = [
  {
    title: 'Login',
    detail: 'POST /auth/login verifies a scrypt-hashed password, issues an access + refresh pair, and sets the refresh token as an httpOnly, SameSite=strict cookie.',
    proof: { kind: 'code', path: 'apps/gateway/src/app.ts' },
  },
  {
    title: 'Access token',
    detail: 'Short-lived JWT (default 15 min) carrying role + permissions. Verified on every request; the wrong token type is rejected.',
    proof: { kind: 'code', path: 'apps/gateway/src/auth.ts' },
  },
  {
    title: 'Refresh rotation',
    detail: 'POST /auth/refresh revokes the presented refresh token and issues a new one in the same family — refresh tokens are single-use.',
    proof: { kind: 'code', path: 'apps/gateway/src/auth.ts' },
  },
  {
    title: 'Reuse detection',
    detail: 'Replaying an already-rotated or revoked refresh token revokes the entire token family and emits an audit event. A reuse attempt logs you out everywhere.',
    proof: { kind: 'test', path: 'apps/gateway/test/gateway.test.ts' },
  },
  {
    title: 'Logout & revocation',
    detail: 'POST /auth/logout revokes the refresh token and clears the cookie; the revoked token is then rejected on the next refresh.',
    proof: { kind: 'code', path: 'apps/gateway/src/app.ts' },
  },
];

export interface SecurityControl {
  name: string;
  detail: string;
  proofs: Proof[];
}

export const SECURITY_CONTROLS: SecurityControl[] = [
  {
    name: 'JWT + RBAC',
    detail: 'Stateless JWT access tokens; role→permission map with wildcard matching (admin = *:*, analyst, auditor). Permission checks gate every protected route.',
    proofs: [
      { kind: 'code', path: 'apps/gateway/src/rbac.ts' },
      { kind: 'code', path: 'apps/gateway/src/config.ts', label: 'config.ts · ROLE_PERMISSIONS' },
    ],
  },
  {
    name: 'Refresh-token rotation',
    detail: 'Rotating refresh-token families. Each refresh mints a new token and revokes the old one; tokens are stored as SHA-256 hashes, never in plaintext.',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/auth.ts' }],
  },
  {
    name: 'Reuse detection',
    detail: 'A reused refresh token triggers family revocation and an auth.refresh_reuse_detected audit event — directly tested.',
    proofs: [{ kind: 'test', path: 'apps/gateway/test/gateway.test.ts' }],
  },
  {
    name: 'Rate limiting',
    detail: 'Per-client-IP fixed-window buckets with RateLimit-* headers; over-limit requests get 429 and an audit event. Health/ready probes are exempt.',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/rateLimit.ts' }],
  },
  {
    name: 'Request validation',
    detail: 'Strict Zod schemas (.strict()) reject unknown properties; a central error handler turns ZodErrors into 400 VALIDATION_ERROR responses. Body size and request timeout are bounded.',
    proofs: [
      { kind: 'code', path: 'apps/gateway/src/auth.ts', label: 'auth.ts · loginSchema' },
      { kind: 'code', path: 'apps/gateway/src/app.ts' },
    ],
  },
  {
    name: 'Audit events',
    detail: 'Login success/failure, refresh rotation, reuse detection, logout, rate-limit, permission denial, and proxy attempts are recorded. Exposed at /admin/audit-events behind audit:read.',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/audit.ts' }],
  },
  {
    name: 'SSRF-safe proxy',
    detail: 'The gateway never forwards user-supplied URLs. It proxies to a fixed registry of service IDs, checks the upstream host against an allowlist, and strips hop-by-hop and cookie headers.',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/proxy.ts' }],
  },
  {
    name: 'Security headers',
    detail: 'Helmet sets standard security headers; CORS is restricted to a configured origin allowlist with credentials.',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/app.ts' }],
  },
  {
    name: 'Safe errors & request IDs',
    detail: 'Every response carries an X-Request-ID; the error handler returns structured codes and never leaks stack traces (500s are opaque).',
    proofs: [{ kind: 'code', path: 'apps/gateway/src/app.ts' }],
  },
];

export interface OwaspRow {
  id: string;
  risk: string;
  mitigation: string;
  proof: Proof;
}

/** OWASP API Security Top 10 (2023) — the risks this gateway addresses. */
export const OWASP_API_TOP10: OwaspRow[] = [
  { id: 'API2', risk: 'Broken Authentication', mitigation: 'Short-TTL JWTs, scrypt password hashing, refresh rotation, and reuse detection.', proof: { kind: 'code', path: 'apps/gateway/src/auth.ts' } },
  { id: 'API5', risk: 'Broken Function Level Authorization', mitigation: 'Permission-gated routes; an analyst is denied /admin/audit-events (tested).', proof: { kind: 'test', path: 'apps/gateway/test/gateway.test.ts' } },
  { id: 'API3', risk: 'Broken Object Property Level Auth', mitigation: 'Strict Zod schemas reject unknown/extra properties on inbound bodies.', proof: { kind: 'code', path: 'apps/gateway/src/auth.ts' } },
  { id: 'API4', risk: 'Unrestricted Resource Consumption', mitigation: 'Per-IP rate limiting, 1 MB body limit, and a 30s request timeout.', proof: { kind: 'code', path: 'apps/gateway/src/rateLimit.ts' } },
  { id: 'API7', risk: 'Server-Side Request Forgery', mitigation: 'Fixed upstream registry + host allowlist; the test blocks 169.254.169.254.', proof: { kind: 'code', path: 'apps/gateway/src/proxy.ts' } },
  { id: 'API8', risk: 'Security Misconfiguration', mitigation: 'Helmet headers, CORS allowlist, and a safe error handler with no stack traces.', proof: { kind: 'code', path: 'apps/gateway/src/app.ts' } },
  { id: 'API9', risk: 'Improper Inventory Management', mitigation: '/readyz and /gateway/services expose the known, fixed service inventory.', proof: { kind: 'code', path: 'apps/gateway/src/app.ts' } },
];

/** Honest "what production hardening would add next" — not claims of having it. */
export const GATEWAY_TRADEOFFS: string[] = [
  'Token store, rate-limit buckets, and audit log are in-memory; a multi-instance deployment would move them to Redis and ship audit to Log Analytics / a SIEM.',
  'Authorization is role-level, not per-object (no BOLA/object-ownership checks yet).',
  'Local users are seeded with scrypt hashes; production would use a real identity provider, password policy, and MFA.',
  "Helmet's Content-Security-Policy is disabled for the demo and would be defined for a real deployment.",
  'The gateway throws on startup if JWT_SECRET is unset outside local mode, but secrets should live in Key Vault / Container Apps secrets, not env defaults.',
];
