import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Filter, Lock, RotateCcw, ShieldCheck, Users, Zap } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  result: 'ALLOWED' | 'BLOCKED' | 'RATE_LIMITED';
  detail: string;
}

interface AttackAttempt {
  index: number;
  payload?: string;
  interceptedBy?: string;
  response?: string;
  result: string;
  detail?: string;
}

interface AttackResult {
  attackType: string;
  attempts: number;
  results: AttackAttempt[];
  mitigations: string[];
  blocked?: number;
}

interface AttackDefinition {
  id: string;
  label: string;
  color: string;
  desc: string;
  what: string;
}

const ATTACKS: AttackDefinition[] = [
  {
    id: 'BRUTE_FORCE',
    label: 'Brute Force Login',
    color: '#ff3366',
    desc: 'Attempts common passwords and shows rate-limit plus lockout behavior.',
    what: 'A credential attack systematically tries weak passwords. Rate limiting and account lockout reduce speed and preserve audit evidence.',
  },
  {
    id: 'SQL_INJECTION',
    label: 'SQL Injection',
    color: '#ff6b35',
    desc: 'Submits classic SQLi payloads. Request validation blocks the input before query handling.',
    what: 'SQL injection embeds database syntax into input fields. The gateway demonstrates validation and parameterized access patterns as controls.',
  },
  {
    id: 'RATE_FLOOD',
    label: 'Rate Limit Flood',
    color: '#ffaa00',
    desc: 'Fires a burst of requests and returns 429 after the request budget is exhausted.',
    what: 'Flood traffic can degrade service or hide other attacks. Per-IP request budgets make abuse visible and bounded.',
  },
  {
    id: 'JWT_TAMPER',
    label: 'JWT Tampering',
    color: '#a855f7',
    desc: 'Tests forged, expired, and algorithm-confusion token samples.',
    what: 'JWTs are trusted only after signature, algorithm, expiry, and revocation checks pass.',
  },
  {
    id: 'PRIVILEGE_ESCALATION',
    label: 'Privilege Escalation',
    color: '#3b82f6',
    desc: 'Low-privilege identities attempt admin permissions and are denied.',
    what: 'RBAC keeps compromise blast radius small by checking permissions per action rather than trusting login alone.',
  },
  {
    id: 'BOLA',
    label: 'BOLA / IDOR',
    color: '#06b6d4',
    desc: 'A user token tries to access resources owned by other users. Object-level authorization denies it.',
    what: 'Broken Object Level Authorization is common in APIs where changing an ID grants access to another user resource.',
  },
  {
    id: 'MASS_ASSIGNMENT',
    label: 'Mass Assignment',
    color: '#10b981',
    desc: 'Request bodies include privileged fields. The schema strips them before persistence.',
    what: 'Auto-binding request bodies can accidentally apply client-supplied role, isAdmin, or balance fields.',
  },
  {
    id: 'TOKEN_REPLAY',
    label: 'Token Replay',
    color: '#f59e0b',
    desc: 'Previously revoked token IDs are replayed and rejected by a revocation check.',
    what: 'A stolen JWT can remain valid without server-side revocation. The demo tracks token IDs and blocks revoked sessions.',
  },
  {
    id: 'SSRF',
    label: 'SSRF Proxy Route',
    color: '#ef4444',
    desc: 'Proxy requests to metadata, private, and loopback destinations are blocked by destination controls.',
    what: 'SSRF abuses server-side HTTP clients. Internal, loopback, and metadata ranges must be blocked unless explicitly allowed.',
  },
];

const RESULT_COLOR: Record<string, string> = {
  ALLOWED: '#00ff88',
  BLOCKED: '#ff3366',
  RATE_LIMITED: '#ffaa00',
  SUCCESS: '#ff3366',
  FAILED: '#00ff88',
  FORBIDDEN: '#ff3366',
  STRIPPED: '#00d4ff',
  REVOKED: '#ff3366',
};

const LOCAL_CREDS: Record<string, string> = {
  admin: 'Admin123!',
  user: 'User123!',
  service: 'Service123!',
};

function decodeJwt(token: string) {
  try {
    const [, body] = token.split('.');
    return JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function normalizeResults(raw: Array<Record<string, unknown>>): AttackAttempt[] {
  return raw.map((row, index) => {
    const result = String(row.result ?? (row.blocked ? 'BLOCKED' : 'ALLOWED'));
    return {
      index: index + 1,
      payload:
        (row.payload as string | undefined) ??
        (row.password ? `password=${String(row.password)}` : undefined) ??
        (row.token as string | undefined) ??
        (row.tryAccess ? `permission=${String(row.tryAccess)}` : undefined),
      interceptedBy: (row.interceptedBy as string | undefined) ?? (row.reason as string | undefined),
      response: row.response as string | undefined,
      result,
      detail: (row.detail as string | undefined) ?? (row.issue as string | undefined),
    };
  });
}

function AttemptRow({ attempt }: { attempt: AttackAttempt }) {
  const resultColor = RESULT_COLOR[attempt.result] ?? 'var(--text-muted)';
  const blocked = ['BLOCKED', 'FAILED', 'FORBIDDEN', 'RATE_LIMITED', 'REVOKED', 'STRIPPED'].includes(attempt.result);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: attempt.index * 0.035 }}
      style={{ display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', marginBottom: '0.25rem' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: resultColor, flexShrink: 0, marginTop: 4 }} />
        <div style={{ width: 1, flex: 1, background: 'rgba(148,163,184,0.12)', marginTop: 2 }} />
      </div>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '0.6rem 0.8rem', marginLeft: '0.35rem', marginBottom: '0.35rem', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: attempt.payload ? 4 : 0, gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Request #{attempt.index}</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: resultColor, background: `${resultColor}18`, padding: '0.1rem 0.5rem', borderRadius: 4 }}>
            {blocked ? 'blocked' : 'allowed'} / {attempt.result}
          </span>
        </div>
        {attempt.payload && (
          <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#ffaa00', marginBottom: 3, wordBreak: 'break-all' }}>
            Payload: <span style={{ color: 'var(--text-primary)' }}>{attempt.payload}</span>
          </div>
        )}
        {attempt.interceptedBy && (
          <div style={{ fontSize: '0.68rem', color: '#00d4ff' }}>
            Intercepted by: <strong>{attempt.interceptedBy}</strong>
          </div>
        )}
        {attempt.response && (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Response: <span style={{ fontFamily: 'monospace' }}>{attempt.response}</span>
          </div>
        )}
        {attempt.detail && (
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', opacity: 0.78, marginTop: 2 }}>{attempt.detail}</div>
        )}
      </div>
    </motion.div>
  );
}

export default function GatewayExplorer() {
  const [activeTab, setActiveTab] = useState<'attacks' | 'rbac' | 'audit'>('attacks');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'ALLOWED' | 'BLOCKED' | 'RATE_LIMITED'>('ALL');
  const [rbac, setRBAC] = useState<{ users: Array<{ username: string; roles: string[]; permissions: string[] }>; allPermissions: string[] } | null>(null);
  const [status, setStatus] = useState<{ totalRequests: number; blockedIPs: number; uptime?: number; features: string[] } | null>(null);
  const [runningAttack, setRunningAttack] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<AttackDefinition | null>(null);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'Admin123!' });
  const [loginResult, setLoginResult] = useState<Record<string, unknown> | null>(null);

  const fetchAudit = async () => {
    try {
      const response = await fetch('/api/gateway/audit');
      const data = await response.json();
      if (data.success) setAuditLog(data.entries);
    } catch {
      setAuditLog([]);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/gateway/status');
      const data = await response.json();
      if (data.success) setStatus(data);
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    fetch('/api/gateway/rbac')
      .then((response) => response.json())
      .then((data) => {
        if (data.success) setRBAC(data);
      })
      .catch(() => setRBAC(null));
    fetchStatus();
    fetchAudit();
    const interval = window.setInterval(fetchAudit, 3000);
    return () => window.clearInterval(interval);
  }, []);

  const runAttack = async (attack: AttackDefinition) => {
    setRunningAttack(attack.id);
    setLastResult(null);
    setSelectedAttack(attack);
    try {
      const response = await fetch('/api/gateway/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: attack.id, username: 'admin' }),
      });
      const data = await response.json();
      setLastResult({
        attackType: data.attackType ?? attack.id,
        attempts: data.attempts ?? 0,
        blocked: data.blocked,
        mitigations: Array.isArray(data.mitigations) ? data.mitigations : [],
        results: normalizeResults(Array.isArray(data.results) ? data.results : []),
      });
      await fetchAudit();
      await fetchStatus();
    } finally {
      setRunningAttack(null);
    }
  };

  const handleLogin = async () => {
    const response = await fetch('/api/gateway/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    });
    const data = await response.json();
    setLoginResult(data);
    await fetchAudit();
    await fetchStatus();
  };

  const resetDemo = async () => {
    await fetch('/api/gateway/reset', { method: 'DELETE' });
    setAuditLog([]);
    setLastResult(null);
    setLoginResult(null);
    setSelectedAttack(null);
    await fetchStatus();
  };

  const decoded = useMemo(
    () => (typeof loginResult?.accessToken === 'string' ? decodeJwt(loginResult.accessToken) : null),
    [loginResult]
  );

  const filteredAudit = useMemo(
    () => (auditFilter === 'ALL' ? auditLog : auditLog.filter((entry) => entry.result === auditFilter)),
    [auditLog, auditFilter]
  );

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return minutes > 0 ? `${minutes}m ${sec}s` : `${sec}s`;
  };

  return (
    <main style={{ height: '100vh', paddingTop: 52, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Lock size={19} color="#a855f7" />
          <div>
            <h1 style={{ color: '#a855f7', fontSize: '0.96rem' }}>API Gateway Security Explorer</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 2 }}>
              JWT, RBAC, rate limiting, input validation, audit logging, and SSRF-safe proxy controls
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {status && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>Uptime: <strong style={{ color: 'var(--text-primary)' }}>{formatUptime(status.uptime)}</strong></span>
              <span>Events: <strong style={{ color: 'var(--text-primary)' }}>{status.totalRequests}</strong></span>
              <span>Blocked IPs: <strong style={{ color: '#ff3366' }}>{status.blockedIPs}</strong></span>
            </div>
          )}
          <button type="button" onClick={resetDemo} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.7rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 800 }}>
            <RotateCcw size={13} /> Reset Demo
          </button>
        </div>
      </header>

      <nav style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', overflowX: 'auto' }}>
        {[
          { id: 'attacks', label: 'Attack Simulator', icon: Zap },
          { id: 'rbac', label: 'RBAC Explorer', icon: Users },
          { id: 'audit', label: 'Audit Log', icon: Activity },
        ].map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} type="button" onClick={() => setActiveTab(id as typeof activeTab)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1.25rem', background: active ? 'rgba(168,85,247,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #a855f7' : '2px solid transparent', color: active ? '#a855f7' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              <Icon size={14} /> {label}
              {id === 'attacks' && <span style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7', borderRadius: 10, padding: '0.05rem 0.4rem', fontSize: '0.62rem', fontWeight: 900 }}>{ATTACKS.length}</span>}
            </button>
          );
        })}
      </nav>

      <section style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'attacks' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0,1fr)', height: '100%', overflow: 'hidden' }}>
            <aside style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '0.65rem' }}>
                SELECT ATTACK VECTOR
              </div>
              {ATTACKS.map((attack) => (
                <motion.article
                  key={attack.id}
                  whileHover={{ scale: 1.01 }}
                  style={{
                    background: selectedAttack?.id === attack.id ? `${attack.color}12` : 'var(--bg-card)',
                    border: `1px solid ${selectedAttack?.id === attack.id ? `${attack.color}55` : `${attack.color}22`}`,
                    borderLeft: `3px solid ${attack.color}`,
                    borderRadius: 8,
                    padding: '0.8rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <h2 style={{ color: attack.color, fontSize: '0.82rem', fontWeight: 900, marginBottom: '0.3rem' }}>{attack.label}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.45, marginBottom: '0.45rem' }}>{attack.desc}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.45, opacity: 0.82, marginBottom: '0.65rem' }}>{attack.what}</p>
                  <button type="button" onClick={() => runAttack(attack)} disabled={runningAttack !== null} style={{ width: '100%', border: `1px solid ${attack.color}55`, background: `${attack.color}15`, color: attack.color, borderRadius: 6, padding: '0.45rem', fontWeight: 900, cursor: runningAttack ? 'not-allowed' : 'pointer', opacity: runningAttack && runningAttack !== attack.id ? 0.5 : 1 }}>
                    {runningAttack === attack.id ? 'Running' : 'Launch simulation'}
                  </button>
                </motion.article>
              ))}
            </aside>

            <div style={{ overflowY: 'auto', padding: '1.2rem' }}>
              {!lastResult && !runningAttack && (
                <div style={{ minHeight: 420, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <Zap size={48} style={{ opacity: 0.32, marginBottom: '1rem' }} />
                  <div>Select an attack vector to see the gateway control response.</div>
                  <div style={{ marginTop: '0.45rem', fontSize: '0.76rem' }}>All scenarios are defensive simulations and emit audit events.</div>
                </div>
              )}
              {runningAttack && !lastResult && (
                <div style={{ minHeight: 420, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontWeight: 900 }}>Executing defensive simulation...</div>
              )}
              {lastResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>{lastResult.attackType.replace(/_/g, ' ')}</h2>
                  {selectedAttack && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.55, marginBottom: '0.75rem' }}>{selectedAttack.what}</p>}
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span>Attempts: <strong style={{ color: 'var(--text-primary)' }}>{lastResult.attempts}</strong></span>
                    {lastResult.blocked !== undefined && <span>Blocked: <strong style={{ color: '#ff3366' }}>{lastResult.blocked}</strong></span>}
                  </div>
                  <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ color: '#00ff88', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.55rem' }}>MITIGATIONS THAT RESPONDED</div>
                    {lastResult.mitigations.map((mitigation) => (
                      <div key={mitigation} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.25rem' }}>- {mitigation}</div>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '0.65rem' }}>ATTEMPT TIMELINE</div>
                  {lastResult.results.map((attempt) => (
                    <AttemptRow key={attempt.index} attempt={attempt} />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rbac' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1rem' }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#a855f7', fontWeight: 900 }}>Permission matrix</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Click a row to pre-fill login</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.65rem', color: 'var(--text-muted)' }}>User</th>
                      {rbac?.allPermissions.map((permission) => (
                        <th key={permission} style={{ textAlign: 'center', padding: '0.65rem', color: 'var(--text-muted)' }}>{permission}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rbac?.users.map((user) => (
                      <tr
                        key={user.username}
                        onClick={() => setLoginForm({ username: user.username, password: LOCAL_CREDS[user.username] ?? '' })}
                        style={{ borderTop: '1px solid rgba(148,163,184,0.08)', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '0.65rem', color: 'var(--text-primary)', fontWeight: 900 }}>
                          {user.username}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{user.roles.join(', ')}</div>
                        </td>
                        {rbac.allPermissions.map((permission) => {
                          const allowed = user.permissions.includes(permission);
                          return (
                            <td key={permission} style={{ textAlign: 'center', padding: '0.65rem', color: allowed ? '#00ff88' : '#ff3366', fontWeight: 900 }}>
                              {allowed ? 'YES' : 'NO'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <aside style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', alignSelf: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#a855f7', fontWeight: 900, marginBottom: '0.75rem' }}>
                <ShieldCheck size={16} /> Issue JWT token
              </div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Username</label>
              <input value={loginForm.username} onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.55rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} />
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Password</label>
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.55rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} />
              <button type="button" onClick={handleLogin} style={{ width: '100%', border: 'none', borderRadius: 7, padding: '0.6rem', background: 'linear-gradient(135deg, #a855f7, #00d4ff)', color: '#0a0e1a', fontWeight: 900, cursor: 'pointer' }}>Issue Token</button>
              {loginResult && (
                <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: decoded ? '#00ff88' : '#ff3366', fontSize: '0.72rem', lineHeight: 1.5, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '0.75rem' }}>
                  {decoded ? JSON.stringify(decoded, null, 2) : JSON.stringify(loginResult, null, 2)}
                </pre>
              )}
            </aside>
          </div>
        )}

        {activeTab === 'audit' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Filter size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, marginRight: '0.25rem' }}>FILTER:</span>
              {(['ALL', 'ALLOWED', 'BLOCKED', 'RATE_LIMITED'] as const).map((filter) => {
                const colors: Record<string, string> = { ALL: '#00d4ff', ALLOWED: '#00ff88', BLOCKED: '#ff3366', RATE_LIMITED: '#ffaa00' };
                const active = auditFilter === filter;
                const count = filter === 'ALL' ? auditLog.length : auditLog.filter((entry) => entry.result === filter).length;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setAuditFilter(filter)}
                    style={{
                      border: `1px solid ${active ? colors[filter] : 'var(--border)'}`,
                      background: active ? `${colors[filter]}18` : 'transparent',
                      color: active ? colors[filter] : 'var(--text-muted)',
                      borderRadius: 5,
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {filter} ({count})
                  </button>
                );
              })}
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Auto-refreshes every 3s. {filteredAudit.length} events shown.
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
              {filteredAudit.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                  No events yet. Run an attack or login attempt.
                </p>
              )}
              {filteredAudit.map((entry) => {
                const color = RESULT_COLOR[entry.result] ?? '#64748b';
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '150px 210px 100px 110px minmax(0, 1fr)',
                      gap: '0.6rem',
                      alignItems: 'center',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderLeft: `4px solid ${color}`,
                      borderRadius: 8,
                      padding: '0.65rem 0.85rem',
                      marginBottom: '0.4rem',
                      fontSize: '0.72rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.68rem' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{entry.event}</strong>
                    <span style={{ color: '#00d4ff' }}>{entry.user}</span>
                    <span style={{ color, fontWeight: 900, background: `${color}15`, padding: '0.1rem 0.4rem', borderRadius: 4, textAlign: 'center' }}>{entry.result}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', overflowWrap: 'anywhere' }}>{entry.detail}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
