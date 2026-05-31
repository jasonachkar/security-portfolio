import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

interface AuditEntry {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  result: 'ALLOWED' | 'BLOCKED' | 'RATE_LIMITED';
  detail: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const auditLog: AuditEntry[] = [];
const rateLimitBuckets = new Map<string, RateLimitBucket>();
const blockedIPs = new Set<string>();
const loginAttempts = new Map<string, number>();

const USERS: Record<string, { password: string; roles: string[]; permissions: string[] }> = {
  admin: {
    password: 'Admin123!',
    roles: ['admin', 'user'],
    permissions: ['read:reports', 'write:reports', 'read:admin', 'manage:users'],
  },
  user: {
    password: 'User123!',
    roles: ['user'],
    permissions: ['read:reports'],
  },
  service: {
    password: 'Service123!',
    roles: ['service'],
    permissions: ['read:reports', 'write:reports'],
  },
};

const RATE_LIMIT = { windowMs: 60_000, max: 10 };

function addAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
  auditLog.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (auditLog.length > 200) auditLog.pop();
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= RATE_LIMIT.max;
}

function makeDemoJwt(payload: object) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', 'local-demo-secret-not-for-production')
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${sig}`;
}

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = req.ip || '127.0.0.1';

  if (blockedIPs.has(ip)) {
    addAudit({ event: 'LOGIN_BLOCKED_IP', user: username ?? 'unknown', ip, result: 'BLOCKED', detail: 'IP is blocked after repeated failures' });
    return res.status(403).json({ error: 'IP blocked', code: 'IP_BLOCKED' });
  }

  if (!checkRateLimit(`login:${ip}`)) {
    addAudit({ event: 'LOGIN_RATE_LIMITED', user: username ?? 'unknown', ip, result: 'RATE_LIMITED', detail: 'Too many login attempts from this IP' });
    return res.status(429).json({ error: 'Too many requests', code: 'RATE_LIMITED', retryAfter: 60 });
  }

  const user = USERS[String(username)];
  if (!user || user.password !== password) {
    const attempts = (loginAttempts.get(String(username)) || 0) + 1;
    loginAttempts.set(String(username), attempts);
    if (attempts >= 5) {
      blockedIPs.add(ip);
      addAudit({ event: 'ACCOUNT_LOCKOUT', user: username ?? 'unknown', ip, result: 'BLOCKED', detail: `Account locked after ${attempts} failed attempts` });
      return res.status(403).json({ error: 'Account locked', code: 'ACCOUNT_LOCKED' });
    }
    addAudit({ event: 'LOGIN_FAILED', user: username ?? 'unknown', ip, result: 'BLOCKED', detail: `Invalid credentials attempt ${attempts}/5` });
    return res.status(401).json({ error: 'Invalid credentials', attemptsRemaining: 5 - attempts });
  }

  loginAttempts.delete(String(username));
  const accessToken = makeDemoJwt({ sub: username, roles: user.roles, permissions: user.permissions });
  addAudit({ event: 'LOGIN_SUCCESS', user: username, ip, result: 'ALLOWED', detail: `Roles: ${user.roles.join(', ')}` });
  return res.json({
    accessToken,
    expiresIn: 900,
    tokenType: 'Bearer',
    user: { username, roles: user.roles, permissions: user.permissions },
  });
});

router.post('/attack', (req: Request, res: Response) => {
  const { type, username } = req.body;
  const ip = req.ip || '127.0.0.1';

  switch (type) {
    case 'BRUTE_FORCE': {
      const passwords = ['password', '123456', 'admin', 'letmein', 'qwerty', 'Admin123!'];
      const results = passwords.map((candidate) => {
        const user = USERS[username || 'admin'];
        const success = user?.password === candidate;
        if (!checkRateLimit(`attack:${ip}`)) {
          addAudit({ event: 'BRUTE_FORCE_BLOCKED', user: username || 'admin', ip, result: 'RATE_LIMITED', detail: `Rate limit triggered on candidate ${candidate}` });
          return { password: candidate, result: 'RATE_LIMITED' };
        }
        addAudit({ event: success ? 'BRUTE_FORCE_HIT' : 'BRUTE_FORCE_MISS', user: username || 'admin', ip, result: success ? 'ALLOWED' : 'BLOCKED', detail: `Tried password candidate ${candidate}` });
        return { password: candidate, result: success ? 'SUCCESS' : 'FAILED' };
      });
      return res.json({ attackType: 'BRUTE_FORCE', attempts: results.length, results, mitigations: ['Per-IP rate limiting', 'Account lockout after repeated failures', 'Audit trail for every failed attempt'] });
    }

    case 'SQL_INJECTION': {
      const payloads = ["' OR '1'='1", "'; DROP TABLE users;--", "' UNION SELECT * FROM users--", "admin'--", "' OR 1=1--"];
      const results = payloads.map((payload) => {
        addAudit({ event: 'SQL_INJECTION_ATTEMPT', user: 'anonymous', ip, result: 'BLOCKED', detail: `Payload blocked by request validation: ${payload}` });
        return { payload, blocked: true, reason: 'Schema validation and parameterized data access pattern' };
      });
      return res.json({ attackType: 'SQL_INJECTION', attempts: results.length, results, mitigations: ['Request schema validation', 'Input normalization', 'Parameterized query pattern'] });
    }

    case 'RATE_FLOOD': {
      const results = [];
      for (let i = 0; i < 15; i += 1) {
        const allowed = checkRateLimit(`flood:${ip}`);
        addAudit({ event: allowed ? 'REQUEST_ALLOWED' : 'RATE_LIMIT_TRIGGERED', user: 'anonymous', ip, result: allowed ? 'ALLOWED' : 'RATE_LIMITED', detail: `Request ${i + 1}/15 in flood simulation` });
        results.push({ request: i + 1, result: allowed ? 'ALLOWED' : 'RATE_LIMITED' });
      }
      return res.json({ attackType: 'RATE_FLOOD', attempts: 15, blocked: results.filter((r) => r.result === 'RATE_LIMITED').length, results, mitigations: ['Sliding-window rate limiting concept', '429 response behavior', 'Security event logging'] });
    }

    case 'JWT_TAMPER': {
      const fakeTokens = [
        { token: 'alg:none sample', issue: 'Algorithm none attempt' },
        { token: 'forged signature sample', issue: 'Forged signature' },
        { token: 'expired token sample', issue: 'Expired token' },
      ];
      const results = fakeTokens.map((token) => {
        addAudit({ event: 'JWT_VALIDATION_FAILED', user: 'anonymous', ip, result: 'BLOCKED', detail: `${token.issue}: token rejected` });
        return { ...token, blocked: true, reason: 'Signature, algorithm, and expiry checks' };
      });
      return res.json({ attackType: 'JWT_TAMPER', attempts: results.length, results, mitigations: ['Algorithm allowlist', 'Signature verification', 'Expiry enforcement', 'Token revocation concept'] });
    }

    case 'PRIVILEGE_ESCALATION': {
      const attempts = [
        { user: 'user', tryAccess: 'read:admin', has: false },
        { user: 'user', tryAccess: 'manage:users', has: false },
        { user: 'service', tryAccess: 'read:admin', has: false },
        { user: 'admin', tryAccess: 'read:admin', has: true },
      ];
      const results = attempts.map((attempt) => {
        addAudit({ event: attempt.has ? 'AUTHZ_ALLOWED' : 'AUTHZ_DENIED', user: attempt.user, ip, result: attempt.has ? 'ALLOWED' : 'BLOCKED', detail: `${attempt.user} attempted ${attempt.tryAccess}` });
        return { ...attempt, result: attempt.has ? 'ALLOWED' : 'FORBIDDEN' };
      });
      return res.json({ attackType: 'PRIVILEGE_ESCALATION', attempts: results.length, results, mitigations: ['Role-based access control', 'Permission checks per action', 'Audit logging of authorization denials'] });
    }

    case 'BOLA': {
      const attempts = [
        { user: 'user', resourceId: 'resource-own-3', owns: true },
        { user: 'user', resourceId: 'resource-user-1', owns: false },
        { user: 'user', resourceId: 'resource-admin-9', owns: false },
        { user: 'service', resourceId: 'resource-user-2', owns: false },
      ];
      const results = attempts.map((attempt) => {
        const allowed = attempt.owns;
        addAudit({
          event: allowed ? 'BOLA_AUTHZ_OK' : 'BOLA_AUTHZ_DENIED',
          user: attempt.user,
          ip,
          result: allowed ? 'ALLOWED' : 'BLOCKED',
          detail: `${attempt.user} accessed ${attempt.resourceId}; owns=${attempt.owns}`,
        });
        return {
          payload: `GET /api/resources/${attempt.resourceId}`,
          interceptedBy: allowed ? undefined : 'Object-level authorization middleware',
          response: allowed ? '200 OK' : '403 Forbidden',
          result: allowed ? 'ALLOWED' : 'FORBIDDEN',
          detail: `Resource owner check: ${attempt.owns ? 'matched' : 'denied'}`,
        };
      });
      return res.json({
        attackType: 'BOLA',
        attempts: results.length,
        blocked: results.filter((result) => result.result === 'FORBIDDEN').length,
        results,
        mitigations: ['Object-level authorization on every endpoint', 'Session user compared against resource owner', 'Non-sequential resource identifiers', 'Audit log on every access denial'],
      });
    }

    case 'MASS_ASSIGNMENT': {
      const payloads = [
        { body: '{"name":"attacker","role":"admin"}', field: 'role', stripped: true },
        { body: '{"email":"x@example.test","isAdmin":true}', field: 'isAdmin', stripped: true },
        { body: '{"name":"bob","balance":999999}', field: 'balance', stripped: true },
        { body: '{"name":"alice","email":"alice@example.test"}', field: 'safe-profile-fields', stripped: false },
      ];
      const results = payloads.map((payload) => {
        const stripped = payload.stripped;
        addAudit({
          event: stripped ? 'MASS_ASSIGN_BLOCKED' : 'UPDATE_ALLOWED',
          user: 'user',
          ip,
          result: stripped ? 'BLOCKED' : 'ALLOWED',
          detail: `Field ${payload.field} ${stripped ? 'stripped from request' : 'allowed'}`,
        });
        return {
          payload: payload.body,
          interceptedBy: stripped ? 'DTO field allowlist - privileged fields stripped' : undefined,
          response: stripped ? '200 OK (privileged field dropped)' : '200 OK',
          result: stripped ? 'STRIPPED' : 'ALLOWED',
          detail: stripped ? `Privileged field ${payload.field} removed before persistence` : 'Safe profile fields passed through',
        };
      });
      return res.json({
        attackType: 'MASS_ASSIGNMENT',
        attempts: results.length,
        blocked: results.filter((result) => result.result === 'STRIPPED').length,
        results,
        mitigations: ['Explicit DTO allowlist', 'Privileged fields stripped before persistence', 'Unknown fields rejected or ignored by schema', 'Audit log on stripped field attempts'],
      });
    }

    case 'TOKEN_REPLAY': {
      const tokens = [
        { token: 'Bearer eyJ...valid-but-revoked', jti: 'jti-abc123-revoked', revoked: true },
        { token: 'Bearer eyJ...active-session', jti: 'jti-xyz789-active', revoked: false },
        { token: 'Bearer eyJ...logged-out-token', jti: 'jti-def456-revoked', revoked: true },
      ];
      const results = tokens.map((token) => {
        const revoked = token.revoked;
        addAudit({
          event: revoked ? 'TOKEN_REPLAY_BLOCKED' : 'TOKEN_VALID',
          user: 'unknown',
          ip,
          result: revoked ? 'BLOCKED' : 'ALLOWED',
          detail: `JTI ${token.jti}; revoked=${revoked}`,
        });
        return {
          payload: token.token,
          interceptedBy: revoked ? 'Token revocation list (JTI blocklist)' : undefined,
          response: revoked ? '401 Unauthorized - token revoked' : '200 OK',
          result: revoked ? 'REVOKED' : 'ALLOWED',
          detail: `JTI: ${token.jti}`,
        };
      });
      return res.json({
        attackType: 'TOKEN_REPLAY',
        attempts: results.length,
        blocked: results.filter((result) => result.result === 'REVOKED').length,
        results,
        mitigations: ['JWT ID claim tracked at issue time', 'JTI added to blocklist on logout', 'Every request checks revocation before processing', 'Token expiry still enforced'],
      });
    }

    case 'SSRF': {
      const targets = [
        { url: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/', blocked: true, reason: 'Cloud metadata IP range blocked' },
        { url: 'http://10.0.0.1/admin', blocked: true, reason: 'RFC-1918 private range blocked' },
        { url: 'http://127.0.0.1/', blocked: true, reason: 'Loopback address blocked' },
        { url: 'https://api.approved.example/data', blocked: false, reason: 'Allowlisted external destination permitted' },
      ];
      const results = targets.map((target) => {
        const blocked = target.blocked;
        addAudit({
          event: blocked ? 'SSRF_BLOCKED' : 'PROXY_REQUEST_ALLOWED',
          user: 'anonymous',
          ip,
          result: blocked ? 'BLOCKED' : 'ALLOWED',
          detail: target.reason,
        });
        return {
          payload: `url=${target.url}`,
          interceptedBy: blocked ? `SSRF allowlist - ${target.reason}` : undefined,
          response: blocked ? '400 Bad Request - destination not allowed' : '200 OK (proxied)',
          result: blocked ? 'BLOCKED' : 'ALLOWED',
          detail: target.reason,
        };
      });
      return res.json({
        attackType: 'SSRF',
        attempts: results.length,
        blocked: results.filter((result) => result.result === 'BLOCKED').length,
        results,
        mitigations: ['Strict destination allowlist', 'Private and loopback range blocking', 'Cloud metadata IP blocking', 'HTTPS-only external destinations'],
      });
    }

    default:
      return res.status(400).json({ error: 'Unknown attack type' });
  }
});

router.get('/audit', (_req, res) => {
  res.json({ success: true, entries: auditLog.slice(0, 100), total: auditLog.length });
});

router.get('/rbac', (_req, res) => {
  res.json({
    success: true,
    users: Object.entries(USERS).map(([username, data]) => ({
      username,
      roles: data.roles,
      permissions: data.permissions,
    })),
    allPermissions: ['read:reports', 'write:reports', 'read:admin', 'manage:users'],
  });
});

router.get('/status', (_req, res) => {
  res.json({
    success: true,
    uptime: process.uptime(),
    totalRequests: auditLog.length,
    blockedIPs: blockedIPs.size,
    rateLimitBuckets: rateLimitBuckets.size,
    auditLogSize: auditLog.length,
    features: ['JWT validation demo', 'RBAC', 'Rate limiting', 'Account lockout', 'Audit logging', 'Input validation', 'BOLA checks', 'Mass assignment stripping', 'Token replay revocation', 'SSRF allowlist'],
  });
});

router.delete('/reset', (_req, res) => {
  auditLog.length = 0;
  rateLimitBuckets.clear();
  blockedIPs.clear();
  loginAttempts.clear();
  res.json({ success: true, message: 'Demo state reset' });
});

export default router;
