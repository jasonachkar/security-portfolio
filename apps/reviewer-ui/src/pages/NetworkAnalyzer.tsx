import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Network, Pause, Play } from 'lucide-react';

interface Flow {
  id: string;
  timestamp: string;
  srcIp: string;
  dstIp: string;
  protocol: 'TCP' | 'UDP' | 'DNS' | 'HTTPS' | 'ICMP';
  bytes: number;
  packets: number;
  flags: string;
  status: 'normal' | 'anomaly';
}

const PROTOCOLS: Flow['protocol'][] = ['TCP', 'UDP', 'DNS', 'HTTPS', 'ICMP'];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function replayFlow(): Flow {
  const anomaly = Math.random() < 0.12;
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    srcIp: pick(['10.10.0.15', '10.10.1.21', '172.16.4.8', '192.168.12.44']),
    dstIp: pick(['10.10.0.50', '10.10.2.80', '172.16.9.10', '8.8.8.8']),
    protocol: pick(PROTOCOLS),
    bytes: anomaly ? Math.floor(5_800_000 + Math.random() * 3_000_000) : Math.floor(40_000 + Math.random() * 780_000),
    packets: anomaly ? Math.floor(1800 + Math.random() * 3000) : Math.floor(15 + Math.random() * 420),
    flags: pick(['SYN', 'ACK', 'PSH,ACK', 'FIN,ACK', '-']),
    status: anomaly ? 'anomaly' : 'normal',
  };
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1000)} KB`;
}

export default function NetworkAnalyzer() {
  const [mode, setMode] = useState<'checking' | 'live' | 'replay'>('checking');
  const [capturing, setCapturing] = useState(false);
  const [flows, setFlows] = useState<Flow[]>(() => Array.from({ length: 18 }, replayFlow));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/network/health')
      .then((response) => {
        if (!response.ok) throw new Error('network backend unavailable');
        return response.json();
      })
      .then(() => {
        if (!cancelled) setMode('live');
      })
      .catch(() => {
        if (!cancelled) setMode('replay');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!capturing) return undefined;
    const interval = window.setInterval(async () => {
      if (mode === 'live') {
        try {
          const response = await fetch('/api/network/flows?limit=8');
          const data = await response.json();
          if (Array.isArray(data.flows)) {
            setFlows((current) => [...data.flows, ...current].slice(0, 50));
            return;
          }
        } catch {
          setMode('replay');
        }
      }
      setFlows((current) => [replayFlow(), ...current].slice(0, 50));
    }, 2000);

    return () => window.clearInterval(interval);
  }, [capturing, mode]);

  const anomalies = flows.filter((flow) => flow.status === 'anomaly');
  const totalBytes = flows.reduce((sum, flow) => sum + flow.bytes, 0);
  const protocolCounts = useMemo(
    () =>
      PROTOCOLS.map((protocol) => ({
        protocol,
        count: flows.filter((flow) => flow.protocol === protocol).length,
      })),
    [flows]
  );
  const chartData = flows.slice(0, 20).reverse();
  const chartMax = Math.max(1, ...chartData.map((flow) => flow.bytes));
  const points = chartData
    .map((flow, index) => {
      const x = 20 + index * (560 / Math.max(chartData.length - 1, 1));
      const y = 180 - (flow.bytes / chartMax) * 150;
      return `${x},${y}`;
    })
    .join(' ');

  const toggleCapture = async () => {
    const next = !capturing;
    setCapturing(next);
    if (mode === 'live') {
      await fetch(`/api/network/capture/${next ? 'start' : 'stop'}`, { method: 'POST' }).catch(() => setMode('replay'));
    }
  };

  return (
    <main style={{ height: '100vh', paddingTop: 52, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ flexShrink: 0, padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Network size={19} color="#00ff88" />
          <div>
            <h1 style={{ color: '#00ff88', fontSize: '0.96rem' }}>Network Analyzer</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 2 }}>
              Local tshark-capable telemetry UI with safe replay fallback
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: mode === 'live' ? '#00ff88' : '#ffaa00', fontSize: '0.75rem', fontWeight: 800 }}>
            {mode === 'checking' ? 'Checking backend' : mode === 'live' ? 'Live backend' : 'Replay mode'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{flows.length} flows</span>
          <span style={{ color: anomalies.length ? '#ff3366' : 'var(--text-muted)', fontSize: '0.75rem' }}>{anomalies.length} anomalies</span>
          <button type="button" onClick={toggleCapture} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #00ff8855', background: capturing ? 'rgba(255,51,102,0.12)' : 'rgba(0,255,136,0.12)', color: capturing ? '#ff3366' : '#00ff88', borderRadius: 8, padding: '0.5rem 0.8rem', cursor: 'pointer', fontWeight: 800 }}>
            {capturing ? <Pause size={14} /> : <Play size={14} />}
            {capturing ? 'Stop' : 'Start Capture'}
          </button>
        </div>
      </header>

      <section style={{ flex: 1, minHeight: 0, padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.8fr)', gridTemplateRows: 'minmax(220px, 0.75fr) minmax(0, 1.25fr)', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>
            <Activity size={15} color="#00ff88" /> Bytes per capture window
          </div>
          <svg viewBox="0 0 600 200" style={{ width: '100%', height: 'calc(100% - 28px)', minHeight: 160 }}>
            <line x1="20" x2="580" y1="180" y2="180" stroke="rgba(148,163,184,0.18)" />
            <line x1="20" x2="580" y1="52" y2="52" stroke="rgba(255,51,102,0.35)" strokeDasharray="6 4" />
            <polyline points={points} fill="none" stroke="#00ff88" strokeWidth="3" strokeLinejoin="round" />
            {chartData.map((flow, index) => {
              const x = 20 + index * (560 / Math.max(chartData.length - 1, 1));
              const y = 180 - (flow.bytes / chartMax) * 150;
              return <circle key={flow.id} cx={x} cy={y} r={flow.status === 'anomaly' ? 5 : 3} fill={flow.status === 'anomaly' ? '#ff3366' : '#00ff88'} />;
            })}
            <text x="24" y="45" fill="#ff3366" fontSize="12">spike threshold</text>
          </svg>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.85rem' }}>Protocol mix</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {protocolCounts.map(({ protocol, count }) => (
              <div key={protocol}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: 4 }}>
                  <span>{protocol}</span><span>{count}</span>
                </div>
                <div style={{ height: 8, background: 'rgba(100,116,139,0.22)', borderRadius: 999, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${(count / Math.max(flows.length, 1)) * 100}%` }} style={{ height: '100%', background: '#00ff88', borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Window bytes: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(totalBytes)}</strong>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800 }}>Flow table</div>
          <div style={{ overflow: 'auto', height: 'calc(100% - 44px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', minWidth: 760 }}>
              <thead style={{ color: 'var(--text-muted)', background: 'rgba(15,22,41,0.65)' }}>
                <tr>{['Timestamp', 'Src IP', 'Dst IP', 'Protocol', 'Bytes', 'Packets', 'Flags', 'Status'].map((head) => <th key={head} style={{ textAlign: 'left', padding: '0.55rem' }}>{head}</th>)}</tr>
              </thead>
              <tbody>
                {flows.map((flow) => (
                  <tr key={flow.id} style={{ borderTop: '1px solid rgba(148,163,184,0.08)', color: flow.status === 'anomaly' ? '#ff99aa' : 'var(--text-primary)', background: flow.status === 'anomaly' ? 'rgba(255,51,102,0.08)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(flow.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{flow.srcIp}</td>
                    <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{flow.dstIp}</td>
                    <td style={{ padding: '0.5rem' }}>{flow.protocol}</td>
                    <td style={{ padding: '0.5rem' }}>{formatBytes(flow.bytes)}</td>
                    <td style={{ padding: '0.5rem' }}>{flow.packets}</td>
                    <td style={{ padding: '0.5rem' }}>{flow.flags}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 800 }}>{flow.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff3366', fontSize: '0.75rem', fontWeight: 800 }}>
            <AlertTriangle size={15} /> Anomaly feed
          </div>
          <div style={{ height: 'calc(100% - 44px)', overflowY: 'auto', padding: '0.75rem' }}>
            {anomalies.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No traffic spikes in the current window.</p>}
            {anomalies.map((flow) => (
              <motion.div key={flow.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '0.7rem', borderRadius: 8, background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.22)', marginBottom: '0.55rem' }}>
                <div style={{ color: '#ff3366', fontSize: '0.8rem', fontWeight: 900 }}>Traffic spike</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 4 }}>{flow.srcIp} to {flow.dstIp} over {flow.protocol}</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.72rem', marginTop: 4 }}>{formatBytes(flow.bytes)} across {flow.packets} packets</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
