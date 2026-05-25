import type { Proof } from '../components/shared/ProofLink';
import type { BadgeTone } from '../components/shared/Badge';

export const TELEMETRY_MISSION =
  'The network analyzer turns packets into flows and raises a simple, explainable anomaly. It is a telemetry-to-evidence demonstration, not a production network detection and response system.';

export interface TelemetryMode {
  title: string;
  detail: string;
  tone: BadgeTone;
  proof: Proof;
}

export const TELEMETRY_MODES: TelemetryMode[] = [
  {
    title: 'Local tshark capture',
    detail: 'TsharkCapture runs tshark with Elasticsearch/Kibana JSON output, parses each packet, and aggregates it into a flow. This is the only mode that touches real packets.',
    tone: 'amber',
    proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/services/capture.py' },
  },
  {
    title: 'Cloud-demo seeded telemetry',
    detail: 'POST /monitoring/demo/import seeds deterministic flows and one anomaly. Capture is disabled when CLOUD_DEMO_MODE is set.',
    tone: 'violet',
    proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/api/routes/monitoring.py' },
  },
  {
    title: 'No production NDR claim',
    detail: 'This is not a real-time SOC sensor. The detection logic is a single, readable traffic-spike heuristic meant to show the telemetry pipeline end to end.',
    tone: 'slate',
    proof: { kind: 'doc', path: 'docs/architecture/local-vs-cloud.md' },
  },
];

export interface FlowField {
  field: string;
  example: string;
  note: string;
}

/** The Flow record model, sourced from the network analyzer. */
export const FLOW_MODEL: FlowField[] = [
  { field: 'source', example: '10.10.0.15', note: 'src_ip of the aggregated flow.' },
  { field: 'destination', example: '10.10.0.50', note: 'dst_ip of the aggregated flow.' },
  { field: 'protocol', example: 'tcp', note: 'tcp / udp / other from the parsed layers.' },
  { field: 'port', example: '8080', note: 'dst_port when tcp/udp.' },
  { field: 'bytes', example: '7,500,000', note: 'Summed frame length over the flow.' },
  { field: 'packets', example: '900', note: 'Packet count incremented per match.' },
];

export interface AnomalyExample {
  source: string;
  destination: string;
  port: number;
  bytes: string;
  packets: number;
  severity: string;
  kind: string;
}

export const ANOMALY_EXAMPLE: AnomalyExample = {
  source: '10.10.0.15',
  destination: '10.10.0.50',
  port: 8080,
  bytes: '7.5 MB',
  packets: 900,
  severity: 'high',
  kind: 'traffic_spike',
};

export const ANOMALY_LOGIC = {
  rule: 'Bytes per source IP over a rolling ~10s window',
  threshold: '> 5 MB / 10s',
  severity: 'high',
  evidence: 'Persisted as an Anomaly row with the observed byte count as the score.',
  proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/services/capture.py' } as Proof,
};

/** A baseline (informational) flow shown alongside the spike for contrast. */
export const BASELINE_FLOW: AnomalyExample = {
  source: '10.10.0.10',
  destination: '10.10.0.20',
  port: 443,
  bytes: '84 KB',
  packets: 42,
  severity: 'informational',
  kind: 'baseline',
};

export const CAPTURE_CAVEATS: string[] = [
  'Packet capture requires host/container capture permissions; it is opt-in, not automatic.',
  'Capturing host interfaces from Docker needs special privileges — use host Python or --network host on Linux.',
  'Capture is local-only and disabled in cloud-demo mode.',
  'The anomaly rule is a demonstration threshold, not a tuned detection model.',
];

export const TELEMETRY_EVIDENCE: Proof[] = [
  { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/services/capture.py', label: 'Capture parser' },
  { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/api/routes/monitoring.py', label: 'Monitoring routes' },
  { kind: 'test', path: 'apps/network-analyzer/tests/test_monitoring.py', label: 'Monitoring tests' },
  { kind: 'evidence', path: 'evidence/api/sample-network-anomaly.example.json', label: 'Sample anomaly output' },
];
