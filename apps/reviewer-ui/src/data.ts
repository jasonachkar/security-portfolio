import {
  Activity,
  Boxes,
  Cloud,
  FileCheck,
  KeyRound,
  Network,
  Radar,
  Route,
  ShieldCheck,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type PageId =
  | 'start'
  | 'architecture'
  | 'gateway'
  | 'pipeline'
  | 'network'
  | 'azure'
  | 'evidence'
  | 'sandbox';

export interface NavItem {
  id: PageId;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

export const navItems: NavItem[] = [
  { id: 'start', label: 'Start Here', icon: ShieldCheck },
  { id: 'architecture', label: 'Architecture', icon: Boxes },
  { id: 'gateway', label: 'Secure Gateway', icon: KeyRound },
  { id: 'pipeline', label: 'Assessment Pipeline', icon: Route },
  { id: 'network', label: 'Network Telemetry', icon: Network },
  { id: 'azure', label: 'Azure Deployment', icon: Cloud },
  { id: 'evidence', label: 'Evidence', icon: FileCheck },
  { id: 'sandbox', label: 'Lab Sandbox', icon: Activity },
];

export const activeServices = [
  ['gateway', 'JWT/RBAC, refresh rotation, audit, validation, proxy allowlist'],
  ['vulnerability-scanner', 'ZAP scans and deterministic demo finding import'],
  ['network-analyzer', 'tshark local capture, seeded flows, anomalies, stats'],
  ['assessment-orchestrator', 'Nmap/ZAP/Trivy lifecycle and artifacts'],
  ['reviewer-ui', 'Public reviewer path, evidence, architecture, limitations'],
];

export const realDemoPlanned = [
  ['Real code', 'Gateway auth, RBAC, refresh reuse detection, audit, rate limiting, validation'],
  ['Real local-lab code', 'ZAP scans, Nmap discovery, optional Trivy, tshark capture'],
  ['Cloud-demo', 'Static Web Apps, Container Apps, Log Analytics, seeded scanner/network data'],
  ['Planned', 'Kubernetes, full alert correlation, full compliance engine, production cloud scanning'],
];

export const controls = [
  ['JWT/RBAC', 'apps/gateway/src/auth.ts'],
  ['Refresh token rotation', 'apps/gateway/src/auth.ts'],
  ['Reuse detection', 'apps/gateway/test/gateway.test.ts'],
  ['Rate limiting', 'apps/gateway/src/rateLimit.ts'],
  ['Request validation', 'apps/gateway/src/app.ts'],
  ['SSRF-safe proxying', 'apps/gateway/src/proxy.ts'],
  ['Audit events', 'apps/gateway/src/audit.ts'],
];

export const evidenceItems = [
  ['Gateway tests', 'apps/gateway/test/gateway.test.ts'],
  ['Scanner tests', 'apps/vulnerability-scanner/tests/test_scans.py'],
  ['Network tests', 'apps/network-analyzer/tests/test_monitoring.py'],
  ['Assessment tests', 'apps/assessment-orchestrator/tests/test_assessments.py'],
  ['Compose validation', 'infra/local/docker-compose.yml'],
  ['Terraform validation', 'infra/azure/terraform/environments/dev'],
  ['Screenshots', 'evidence/screenshots'],
  ['API samples', 'evidence/api'],
];

export const anomalies = [
  { source: '10.10.0.15', target: '10.10.0.50:8080', severity: 'high', bytes: '7.5 MB' },
  { source: '10.10.0.10', target: '10.10.0.20:443', severity: 'informational', bytes: '84 KB' },
];

export const radarIcon = Radar;
