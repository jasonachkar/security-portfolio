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
    features: ['JWT validation demo', 'RBAC', 'Rate limiting', 'Account lockout', 'Audit logging', 'Input validation'],
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
