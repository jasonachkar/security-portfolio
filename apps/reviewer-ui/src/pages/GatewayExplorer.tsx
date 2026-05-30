import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Lock, RotateCcw, ShieldCheck, Users, Zap } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  event: string;
  user: string;
  ip: string;
  result: 'ALLOWED' | 'BLOCKED' | 'RATE_LIMITED';
  detail: string;
}

interface AttackResult {
  attackType: string;
  attempts: number;
  results: Array<Record<string, unknown>>;
  mitigations: string[];
  blocked?: number;
}

const ATTACKS = [
  { id: 'BRUTE_FORCE', label: 'Brute Force Login', color: '#ff3366', desc: 'Common password attempts with rate-limit and lockout evidence.' },
  { id: 'SQL_INJECTION', label: 'SQL Injection', color: '#ff6b35', desc: 'Classic SQLi payloads blocked by validation and query discipline.' },
  { id: 'RATE_FLOOD', label: 'Rate Limit Flood', color: '#ffaa00', desc: 'Burst traffic demonstrates 429 behavior after the request budget.' },
  { id: 'JWT_TAMPER', label: 'JWT Tampering', color: '#a855f7', desc: 'Malformed, forged, and expired token samples are rejected.' },
  { id: 'PRIVILEGE_ESCALATION', label: 'Privilege Escalation', color: '#3b82f6', desc: 'Low-privilege identities attempt admin permissions and are denied.' },
];

const RESULT_COLOR: Record<string, string> = {
  ALLOWED: '#00ff88',
  BLOCKED: '#ff3366',
  RATE_LIMITED: '#ffaa00',
  SUCCESS: '#ff3366',
  FAILED: '#00ff88',
  FORBIDDEN: '#ff3366',
};

function decodeJwt(token: string) {
  try {
    const [, body] = token.split('.');
    return JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export default function GatewayExplorer() {
  const [activeTab, setActiveTab] = useState<'attacks' | 'rbac' | 'audit'>('attacks');
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [rbac, setRBAC] = useState<{ users: Array<{ username: string; roles: string[]; permissions: string[] }>; allPermissions: string[] } | null>(null);
  const [status, setStatus] = useState<{ totalRequests: number; blockedIPs: number; features: string[] } | null>(null);
  const [runningAttack, setRunningAttack] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AttackResult | null>(null);
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

  const runAttack = async (attackId: string) => {
    setRunningAttack(attackId);
    setLastResult(null);
    try {
      const response = await fetch('/api/gateway/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: attackId, username: 'admin' }),
      });
      const data = await response.json();
      setLastResult(data);
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
    await fetchStatus();
  };

  const decoded = useMemo(
    () => (typeof loginResult?.accessToken === 'string' ? decodeJwt(loginResult.accessToken) : null),
    [loginResult]
  );

  return (
    <main style={{ height: '100vh', paddingTop: 52, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Lock size={19} color="#a855f7" />
          <div>
            <h1 style={{ color: '#a855f7', fontSize: '0.96rem' }}>API Gateway</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
              JWT validation demo, RBAC, rate limiting, input validation, and audit events
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {status && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Events: <strong style={{ color: 'var(--text-primary)' }}>{status.totalRequests}</strong></span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Blocked IPs: <strong style={{ color: '#ff3366' }}>{status.blockedIPs}</strong></span>
            </>
          )}
          <button type="button" onClick={resetDemo} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 7, padding: '0.45rem 0.75rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>
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
            <button key={id} type="button" onClick={() => setActiveTab(id as typeof activeTab)} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.75rem 1.2rem', background: active ? 'rgba(168,85,247,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #a855f7' : '2px solid transparent', color: active ? '#a855f7' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap' }}>
              <Icon size={15} /> {label}
            </button>
          );
        })}
      </nav>

      <section style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activeTab === 'attacks' && (
          <div style={{ display: 'grid', gridTemplateColumns: '330px minmax(0, 1fr)', height: '100%' }}>
            <aside style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', padding: '1rem', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>SELECT ATTACK VECTOR</div>
              {ATTACKS.map((attack) => (
                <motion.article key={attack.id} whileHover={{ scale: 1.02 }} style={{ background: 'var(--bg-card)', border: `1px solid ${attack.color}33`, borderLeft: `3px solid ${attack.color}`, borderRadius: 8, padding: '0.85rem', marginBottom: '0.6rem' }}>
                  <h2 style={{ color: attack.color, fontSize: '0.84rem', marginBottom: '0.35rem' }}>{attack.label}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', lineHeight: 1.45, marginBottom: '0.65rem' }}>{attack.desc}</p>
                  <button type="button" onClick={() => runAttack(attack.id)} disabled={runningAttack !== null} style={{ width: '100%', border: `1px solid ${attack.color}55`, background: `${attack.color}15`, color: attack.color, borderRadius: 6, padding: '0.45rem', fontWeight: 900, cursor: runningAttack ? 'not-allowed' : 'pointer', opacity: runningAttack && runningAttack !== attack.id ? 0.5 : 1 }}>
                    {runningAttack === attack.id ? 'Running' : 'Launch Attack'}
                  </button>
                </motion.article>
              ))}
            </aside>

            <div style={{ overflowY: 'auto', padding: '1.4rem' }}>
              {!lastResult && !runningAttack && (
                <div style={{ minHeight: 420, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <Zap size={48} style={{ opacity: 0.32, marginBottom: '1rem' }} />
                  <div>Select an attack and launch it to see the gateway control response.</div>
                </div>
              )}
              {runningAttack && !lastResult && (
                <div style={{ minHeight: 420, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontWeight: 900 }}>Executing defensive simulation...</div>
              )}
              {lastResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h2 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.35rem' }}>{lastResult.attackType.replace(/_/g, ' ')}</h2>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                    <span>Attempts: <strong style={{ color: 'var(--text-primary)' }}>{lastResult.attempts}</strong></span>
                    {lastResult.blocked !== undefined && <span>Blocked: <strong style={{ color: '#ff3366' }}>{lastResult.blocked}</strong></span>}
                  </div>
                  <div style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ color: '#00ff88', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: '0.55rem' }}>MITIGATIONS THAT RESPONDED</div>
                    {lastResult.mitigations.map((mitigation) => <div key={mitigation} style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.25rem' }}>- {mitigation}</div>)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {lastResult.results.map((result, index) => {
                      const outcome = String(result.result ?? (result.blocked ? 'BLOCKED' : 'ALLOWED'));
                      return (
                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '56px 150px 1fr', gap: '0.75rem', alignItems: 'center', padding: '0.55rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.76rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>
                          <span style={{ color: RESULT_COLOR[outcome] ?? 'var(--text-primary)', fontWeight: 900 }}>{outcome}</span>
                          <code style={{ color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{JSON.stringify(result)}</code>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rbac' && (
          <div style={{ height: '100%', overflowY: 'auto', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '1rem' }}>
            <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border)', color: '#a855f7', fontWeight: 900 }}>Permission matrix</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead><tr><th style={{ textAlign: 'left', padding: '0.65rem', color: 'var(--text-muted)' }}>User</th>{rbac?.allPermissions.map((permission) => <th key={permission} style={{ textAlign: 'center', padding: '0.65rem', color: 'var(--text-muted)' }}>{permission}</th>)}</tr></thead>
                  <tbody>
                    {rbac?.users.map((user) => (
                      <tr key={user.username} style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                        <td style={{ padding: '0.65rem', color: 'var(--text-primary)', fontWeight: 900 }}>{user.username}<div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{user.roles.join(', ')}</div></td>
                        {rbac.allPermissions.map((permission) => {
                          const allowed = user.permissions.includes(permission);
                          return <td key={permission} style={{ textAlign: 'center', padding: '0.65rem', color: allowed ? '#00ff88' : '#ff3366', fontWeight: 900 }}>{allowed ? 'YES' : 'NO'}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <aside style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#a855f7', fontWeight: 900, marginBottom: '0.75rem' }}><ShieldCheck size={16} /> Login demo</div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Username</label>
              <input value={loginForm.username} onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.55rem', marginBottom: '0.75rem' }} />
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>Password</label>
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', padding: '0.55rem', marginBottom: '0.75rem' }} />
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
          <div style={{ height: '100%', overflowY: 'auto', padding: '1rem' }}>
            {auditLog.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No audit events yet. Run an attack or login attempt.</p>}
            {auditLog.map((entry) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gridTemplateColumns: '170px 190px 110px 120px 1fr', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `4px solid ${RESULT_COLOR[entry.result]}`, borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.76rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{entry.event}</strong>
                <span style={{ color: 'var(--text-muted)' }}>{entry.user}</span>
                <span style={{ color: RESULT_COLOR[entry.result], fontWeight: 900 }}>{entry.result}</span>
                <span style={{ color: 'var(--text-muted)' }}>{entry.detail}</span>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
