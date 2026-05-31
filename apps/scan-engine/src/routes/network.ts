import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

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

const flows: Flow[] = [];
let capturing = false;

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeFlow(): Flow {
  const protocol = pick<Flow['protocol']>(['TCP', 'UDP', 'DNS', 'HTTPS', 'ICMP']);
  const anomaly = Math.random() < 0.14;
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    srcIp: pick(['10.10.0.15', '10.10.1.21', '172.16.4.8', '192.168.12.44', '10.42.0.9']),
    dstIp: pick(['10.10.0.50', '10.10.2.80', '172.16.9.10', '8.8.8.8', '1.1.1.1']),
    protocol,
    bytes: anomaly ? Math.floor(5_500_000 + Math.random() * 4_000_000) : Math.floor(30_000 + Math.random() * 850_000),
    packets: anomaly ? Math.floor(2000 + Math.random() * 4000) : Math.floor(12 + Math.random() * 480),
    flags: protocol === 'TCP' ? pick(['SYN', 'ACK', 'PSH,ACK', 'FIN,ACK']) : '-',
    status: anomaly ? 'anomaly' : 'normal',
  };
}

function ensureFlows(count = 8) {
  while (flows.length < count) flows.unshift(makeFlow());
  if (capturing || flows.length < 80) flows.unshift(makeFlow());
  if (flows.length > 100) flows.splice(100);
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'local-demo', tshark: 'replay' });
});

router.post('/capture/start', (_req, res) => {
  capturing = true;
  ensureFlows(12);
  res.json({ success: true, capturing });
});

router.post('/capture/stop', (_req, res) => {
  capturing = false;
  res.json({ success: true, capturing });
});

router.get('/flows', (req, res) => {
  ensureFlows(20);
  const limit = Number(req.query.limit ?? 50);
  res.json({ success: true, mode: 'local-demo', flows: flows.slice(0, limit) });
});

router.get('/anomalies', (_req, res) => {
  ensureFlows(20);
  res.json({ success: true, anomalies: flows.filter((flow) => flow.status === 'anomaly').slice(0, 25) });
});

router.get('/stats', (_req, res) => {
  ensureFlows(20);
  const byProtocol = flows.reduce<Record<string, number>>((acc, flow) => {
    acc[flow.protocol] = (acc[flow.protocol] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    success: true,
    capturing,
    totalFlows: flows.length,
    anomalies: flows.filter((flow) => flow.status === 'anomaly').length,
    bytesPerSecond: flows.slice(0, 10).reduce((sum, flow) => sum + flow.bytes, 0) / 10,
    byProtocol,
  });
});

export default router;
