import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, HelpCircle, Network, Pause, Play, X } from 'lucide-react';

type AnomalyType = 'PORT_SCAN' | 'DATA_EXFIL' | 'DDOS_AMP' | 'LATERAL_MOVE' | 'C2_BEACON';

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
  anomalyType?: AnomalyType;
  anomalyDetail?: string;
}

const ANOMALY_INTEL: Record<
  AnomalyType,
  {
    label: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    color: string;
    mitre: string;
    mitreId: string;
    whatItMeans: string;
    recommended: string;
  }
> = {
  PORT_SCAN: {
    label: 'Port scan / reconnaissance',
    severity: 'HIGH',
    color: '#ff6b35',
    mitre: 'Network Service Discovery',
    mitreId: 'T1046',
    whatItMeans: 'A source host is probing services before a possible targeted attack.',
    recommended: 'Block or isolate the source, review firewall logs, and check for follow-up exploitation.',
  },
  DATA_EXFIL: {
    label: 'Data exfiltration pattern',
    severity: 'CRITICAL',
    color: '#ff3366',
    mitre: 'Exfiltration Over Alternative Protocol',
    mitreId: 'T1048',
    whatItMeans: 'A large transfer volume may indicate staged data leaving the environment.',
    recommended: 'Isolate the source host and preserve packet/log evidence for investigation.',
  },
  DDOS_AMP: {
    label: 'UDP amplification vector',
    severity: 'HIGH',
    color: '#ff6b35',
    mitre: 'Network Denial of Service',
    mitreId: 'T1498',
    whatItMeans: 'High-volume UDP traffic can be a denial-of-service or amplification pattern.',
    recommended: 'Apply rate limits, verify resolver exposure, and alert upstream network controls.',
  },
  LATERAL_MOVE: {
    label: 'Lateral movement indicator',
    severity: 'CRITICAL',
    color: '#ff3366',
    mitre: 'Lateral Tool Transfer',
    mitreId: 'T1570',
    whatItMeans: 'Internal host-to-host traffic is unusually heavy and may represent post-compromise pivoting.',
    recommended: 'Review host authentication logs and isolate the source from sensitive network segments.',
  },
  C2_BEACON: {
    label: 'Command-and-control beacon',
    severity: 'CRITICAL',
    color: '#ff3366',
    mitre: 'Application Layer Protocol: DNS',
    mitreId: 'T1071.004',
    whatItMeans: 'Regular DNS-heavy activity can indicate beaconing or DNS tunneling.',
    recommended: 'Restrict DNS egress to approved resolvers and inspect endpoint telemetry for implants.',
  },
};

const PROTOCOL_INFO: Record<string, { color: string; meaning: string; riskNote: string }> = {
  TCP: {
    color: '#00d4ff',
    meaning: 'Reliable connection-oriented traffic such as web, SSH, and database sessions.',
    riskNote: 'Watch for SYN floods, port scans, and reverse shell patterns.',
  },
  UDP: {
    color: '#a855f7',
    meaning: 'Connectionless traffic used by DNS, VoIP, gaming, and streaming protocols.',
    riskNote: 'Useful for amplification attacks and some tunneling patterns.',
  },
  DNS: {
    color: '#ffaa00',
    meaning: 'Domain resolution traffic.',
    riskNote: 'Can be used for C2 beaconing and data exfiltration via DNS tunneling.',
  },
  HTTPS: {
    color: '#00ff88',
    meaning: 'Encrypted web traffic over TLS.',
    riskNote: 'Legitimate by default, but can hide malware C2 without certificate and domain context.',
  },
  ICMP: {
    color: '#ff6b35',
    meaning: 'Ping and traceroute control messages.',
    riskNote: 'Common in reconnaissance and covert ICMP tunneling demonstrations.',
  },
};

const PROTOCOLS: Flow['protocol'][] = ['TCP', 'UDP', 'DNS', 'HTTPS', 'ICMP'];
const INTERNAL_IPS = ['10.10.0.15', '10.10.1.21', '172.16.4.8', '192.168.12.44', '10.0.2.100', '172.16.0.55'];
const EXTERNAL_IPS = ['8.8.8.8', '1.1.1.1', '104.18.22.44', '52.86.112.4', '185.220.101.3', '91.108.56.180'];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function classifyAnomaly(flow: Pick<Flow, 'protocol' | 'bytes' | 'packets' | 'flags' | 'srcIp' | 'dstIp'>): AnomalyType {
  if (flow.protocol === 'DNS' && flow.packets > 200) return 'C2_BEACON';
  if (flow.protocol === 'UDP' && flow.bytes > 2_000_000) return 'DDOS_AMP';
  if (flow.flags === 'SYN' && flow.packets > 500) return 'PORT_SCAN';
  if (flow.bytes > 5_000_000) return 'DATA_EXFIL';
  if (flow.srcIp.startsWith('10.') && flow.dstIp.startsWith('10.')) return 'LATERAL_MOVE';
  return 'DATA_EXFIL';
}

function normalizeFlow(flow: Flow): Flow {
  if (flow.status !== 'anomaly') return flow;
  const anomalyType = flow.anomalyType ?? classifyAnomaly(flow);
  return {
    ...flow,
    anomalyType,
    anomalyDetail: ANOMALY_INTEL[anomalyType].whatItMeans,
  };
}

function replayFlow(): Flow {
  const anomaly = Math.random() < 0.14;
  const protocol = pick(PROTOCOLS);
  const internalDestination = Math.random() > 0.4;
  const bytes = anomaly
    ? Math.floor(3_500_000 + Math.random() * 4_000_000)
    : Math.floor(12_000 + Math.random() * 600_000);
  const packets = anomaly
    ? Math.floor(900 + Math.random() * 2500)
    : Math.floor(8 + Math.random() * 350);
  const flags = protocol === 'TCP' ? pick(['SYN', 'ACK', 'PSH,ACK', 'FIN,ACK']) : '-';
  const base: Flow = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    srcIp: pick(INTERNAL_IPS),
    dstIp: internalDestination ? pick(INTERNAL_IPS) : pick(EXTERNAL_IPS),
    protocol,
    bytes,
    packets,
    flags,
    status: anomaly ? 'anomaly' : 'normal',
  };
  return normalizeFlow(base);
}

function formatBytes(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}

export default function NetworkAnalyzer() {
  const [mode, setMode] = useState<'checking' | 'live' | 'replay'>('checking');
  const [capturing, setCapturing] = useState(false);
  const [flows, setFlows] = useState<Flow[]>(() => Array.from({ length: 20 }, replayFlow));
  const [selectedAnomaly, setSelectedAnomaly] = useState<Flow | null>(null);
  const [showLegend, setShowLegend] = useState(false);

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
            setFlows((current) => [...data.flows.map(normalizeFlow), ...current].slice(0, 60));
            return;
          }
        } catch {
          setMode('replay');
        }
      }
      setFlows((current) => [replayFlow(), ...current].slice(0, 60));
    }, 2000);

    return () => window.clearInterval(interval);
  }, [capturing, mode]);

  const anomalies = flows.filter((flow) => flow.status === 'anomaly');
  const totalBytes = flows.reduce((sum, flow) => sum + flow.bytes, 0);
  const uniqueIPs = new Set(flows.flatMap((flow) => [flow.srcIp, flow.dstIp])).size;
  const anomalyRate = flows.length > 0 ? (anomalies.length / flows.length) * 100 : 0;
  const anomalyRateColor = anomalyRate > 15 ? '#ff3366' : anomalyRate > 5 ? '#ffaa00' : '#00ff88';

  const protocolCounts = useMemo(
    () =>
      PROTOCOLS.map((protocol) => ({
        protocol,
        count: flows.filter((flow) => flow.protocol === protocol).length,
      })),
    [flows]
  );

  const chartData = flows.slice(0, 24).reverse();
  const chartMax = Math.max(1, ...chartData.map((flow) => flow.bytes));
  const points = chartData
    .map((flow, index) => {
      const x = 24 + index * (552 / Math.max(chartData.length - 1, 1));
      const y = 175 - (flow.bytes / chartMax) * 145;
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
    <main style={{ height: '100vh', paddingTop: 52, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, padding: '0.7rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Network size={19} color="#00ff88" />
          <div>
            <h1 style={{ color: '#00ff88', fontSize: '0.96rem' }}>Network Analyzer</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginTop: 2 }}>
              tshark-capable flow inspection, replay-safe telemetry, anomaly classification, and MITRE mapping
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ color: mode === 'live' ? '#00ff88' : '#ffaa00', fontSize: '0.72rem', fontWeight: 800 }}>
            {mode === 'checking' ? 'Checking' : mode === 'live' ? 'Live backend' : 'Replay mode'}
          </span>
          <button
            type="button"
            onClick={() => setShowLegend(true)}
            style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: '0.35rem 0.6rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem' }}
          >
            <HelpCircle size={13} /> Protocol guide
          </button>
          <button
            type="button"
            onClick={toggleCapture}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #00ff8855', background: capturing ? 'rgba(255,51,102,0.12)' : 'rgba(0,255,136,0.12)', color: capturing ? '#ff3366' : '#00ff88', borderRadius: 8, padding: '0.45rem 0.8rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem' }}
          >
            {capturing ? <Pause size={13} /> : <Play size={13} />}
            {capturing ? 'Stop capture' : 'Start capture'}
          </button>
        </div>
      </header>

      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        {[
          { label: 'Total flows', value: flows.length, color: 'var(--text-primary)' },
          { label: 'Bytes transferred', value: formatBytes(totalBytes), color: '#00d4ff' },
          { label: 'Unique IPs', value: uniqueIPs, color: '#a855f7' },
          { label: 'Anomaly rate', value: `${anomalyRate.toFixed(1)}%`, color: anomalyRateColor },
          { label: 'Active anomalies', value: anomalies.length, color: anomalies.length > 0 ? '#ff3366' : '#00ff88' },
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '0.55rem 0.5rem', borderRight: '1px solid var(--border)', textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: stat.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.value}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setShowLegend(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              onClick={(event) => event.stopPropagation()}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem', width: 540, maxWidth: '92vw' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ color: '#00ff88', fontSize: '0.95rem' }}>Protocol guide</h2>
                <button type="button" onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              {Object.entries(PROTOCOL_INFO).map(([protocol, info]) => (
                <div key={protocol} style={{ marginBottom: '0.85rem', paddingBottom: '0.85rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ background: `${info.color}22`, color: info.color, padding: '0.1rem 0.55rem', borderRadius: 4, fontWeight: 900, fontSize: '0.78rem' }}>{protocol}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{info.meaning}</span>
                  </div>
                  <div style={{ color: '#ffaa00', fontSize: '0.72rem' }}>{info.riskNote}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section style={{ flex: 1, minHeight: 0, padding: '0.85rem', display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(260px,0.75fr)', gridTemplateRows: 'minmax(200px,0.7fr) minmax(0,1.3fr)', gap: '0.85rem', overflow: 'hidden' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800 }}>
              <Activity size={14} color="#00ff88" /> Bytes per capture window
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Red dots are anomalies</div>
          </div>
          <svg viewBox="0 0 600 200" style={{ width: '100%', height: 'calc(100% - 32px)', minHeight: 150 }}>
            <defs>
              <linearGradient id="network-chart-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff88" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((index) => (
              <line key={index} x1="24" x2="576" y1={175 - index * 48} y2={175 - index * 48} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            ))}
            <line x1="24" x2="576" y1="48" y2="48" stroke="rgba(255,51,102,0.4)" strokeWidth="1" strokeDasharray="5 4" />
            <text x="28" y="44" fill="#ff336688" fontSize="10">spike threshold</text>
            {chartData.length > 1 && (
              <polygon
                points={`24,175 ${points} ${24 + (chartData.length - 1) * (552 / Math.max(chartData.length - 1, 1))},175`}
                fill="url(#network-chart-grad)"
              />
            )}
            <polyline points={points} fill="none" stroke="#00ff88" strokeWidth="2.5" strokeLinejoin="round" />
            {chartData.map((flow, index) => {
              const x = 24 + index * (552 / Math.max(chartData.length - 1, 1));
              const y = 175 - (flow.bytes / chartMax) * 145;
              return <circle key={flow.id} cx={x} cy={y} r={flow.status === 'anomaly' ? 5 : 3} fill={flow.status === 'anomaly' ? '#ff3366' : '#00ff88'} />;
            })}
          </svg>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem', overflow: 'hidden' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800, marginBottom: '0.75rem' }}>Protocol distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {protocolCounts.map(({ protocol, count }) => {
              const info = PROTOCOL_INFO[protocol];
              const pct = flows.length > 0 ? (count / flows.length) * 100 : 0;
              return (
                <div key={protocol}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
                    <span style={{ color: info.color, fontWeight: 800 }}>{protocol}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 7, background: 'rgba(100,116,139,0.2)', borderRadius: 999, overflow: 'hidden' }}>
                    <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} style={{ height: '100%', background: info.color, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            Window total: <strong style={{ color: 'var(--text-primary)' }}>{formatBytes(totalBytes)}</strong>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 800 }}>Flow table</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Click anomaly rows for defensive intel</span>
          </div>
          <div style={{ overflow: 'auto', height: 'calc(100% - 40px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', minWidth: 780 }}>
              <thead style={{ color: 'var(--text-muted)', background: 'rgba(15,22,41,0.7)', position: 'sticky', top: 0 }}>
                <tr>
                  {['Time', 'Src IP', 'Dst IP', 'Protocol', 'Bytes', 'Packets', 'Flags', 'Status'].map((head) => (
                    <th key={head} style={{ textAlign: 'left', padding: '0.5rem 0.6rem', fontWeight: 700 }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flows.map((flow) => (
                  <tr
                    key={flow.id}
                    onClick={() => flow.status === 'anomaly' && setSelectedAnomaly(flow)}
                    style={{
                      borderTop: '1px solid rgba(148,163,184,0.07)',
                      background: flow.status === 'anomaly' ? 'rgba(255,51,102,0.07)' : 'transparent',
                      color: flow.status === 'anomaly' ? '#ff99aa' : 'var(--text-primary)',
                      cursor: flow.status === 'anomaly' ? 'pointer' : 'default',
                    }}
                  >
                    <td style={{ padding: '0.45rem 0.6rem', opacity: 0.7 }}>{new Date(flow.timestamp).toLocaleTimeString()}</td>
                    <td style={{ padding: '0.45rem 0.6rem', fontFamily: 'monospace', fontSize: '0.68rem' }}>{flow.srcIp}</td>
                    <td style={{ padding: '0.45rem 0.6rem', fontFamily: 'monospace', fontSize: '0.68rem' }}>{flow.dstIp}</td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <span style={{ background: `${PROTOCOL_INFO[flow.protocol]?.color}22`, color: PROTOCOL_INFO[flow.protocol]?.color, padding: '0.1rem 0.45rem', borderRadius: 4, fontWeight: 800, fontSize: '0.65rem' }}>
                        {flow.protocol}
                      </span>
                    </td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>{formatBytes(flow.bytes)}</td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>{flow.packets}</td>
                    <td style={{ padding: '0.45rem 0.6rem', fontFamily: 'monospace', fontSize: '0.65rem' }}>{flow.flags}</td>
                    <td style={{ padding: '0.45rem 0.6rem' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '0.65rem',
                          color: flow.status === 'anomaly' ? '#ff3366' : '#00ff88',
                          background: flow.status === 'anomaly' ? 'rgba(255,51,102,0.15)' : 'rgba(0,255,136,0.1)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 4,
                        }}
                      >
                        {flow.status === 'anomaly' ? 'ANOMALY' : 'normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff3366', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>
            <AlertTriangle size={14} /> Anomaly intelligence
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
            {anomalies.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                No anomalies in the current capture window.
              </div>
            )}
            {anomalies.map((flow) => {
              const intel = flow.anomalyType ? ANOMALY_INTEL[flow.anomalyType] : null;
              const isSelected = selectedAnomaly?.id === flow.id;
              return (
                <motion.div
                  key={flow.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedAnomaly(isSelected ? null : flow)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 8,
                    marginBottom: '0.55rem',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255,51,102,0.12)' : 'rgba(255,51,102,0.06)',
                    border: `1px solid ${isSelected ? '#ff3366' : 'rgba(255,51,102,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ color: intel?.color ?? '#ff3366', fontSize: '0.8rem', fontWeight: 900 }}>
                      {intel?.label ?? 'Anomalous traffic'}
                    </div>
                    {intel && (
                      <span style={{ background: `${intel.color}22`, color: intel.color, fontSize: '0.62rem', fontWeight: 900, padding: '0.1rem 0.45rem', borderRadius: 4 }}>
                        {intel.severity}
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{flow.srcIp}</span>
                    <span style={{ opacity: 0.5 }}> to </span>
                    <span style={{ fontFamily: 'monospace' }}>{flow.dstIp}</span>
                    <span style={{ marginLeft: '0.5rem', color: PROTOCOL_INFO[flow.protocol]?.color, fontWeight: 800 }}>{flow.protocol}</span>
                    <span style={{ marginLeft: '0.5rem' }}>{formatBytes(flow.bytes)} / {flow.packets} packets</span>
                  </div>

                  <AnimatePresence>
                    {isSelected && intel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: '0.6rem' }}
                      >
                        <div style={{ padding: '0.65rem', background: 'rgba(0,0,0,0.3)', borderRadius: 6, fontSize: '0.72rem', lineHeight: 1.6 }}>
                          <div style={{ color: '#00d4ff', fontWeight: 800, marginBottom: '0.3rem' }}>What this means</div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{intel.whatItMeans}</div>
                          <div style={{ color: '#ffaa00', fontWeight: 800, marginBottom: '0.3rem' }}>Recommended action</div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{intel.recommended}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.15rem 0.5rem', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800 }}>
                              MITRE {intel.mitreId}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{intel.mitre}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
