import type { Proof } from '../components/shared/ProofLink';
import type { BadgeTone } from '../components/shared/Badge';

/** The five trust boundaries used across both architecture modes. */
export type TrustZone = 'public' | 'internal' | 'local-tools' | 'demo' | 'evidence';

export interface TrustZoneMeta {
  zone: TrustZone;
  label: string;
  tone: BadgeTone;
  description: string;
}

export const TRUST_ZONES: TrustZoneMeta[] = [
  { zone: 'public', label: 'Public', tone: 'teal', description: 'Reviewer UI and the gateway — the only externally reachable surfaces.' },
  { zone: 'internal', label: 'Internal', tone: 'indigo', description: 'Services and datastores reachable only through the gateway.' },
  { zone: 'local-tools', label: 'Local-only tools', tone: 'amber', description: 'Active security tools that run in the local lab by default.' },
  { zone: 'demo', label: 'Demo data', tone: 'violet', description: 'Seeded sample findings and telemetry used in cloud-demo mode.' },
  { zone: 'evidence', label: 'Evidence / logging', tone: 'green', description: 'Audit events, persisted artifacts, and platform logs.' },
];

export interface ArchNode {
  name: string;
  role: string;
  detail: string;
  zone: TrustZone;
  proof?: Proof;
}

export interface ArchMode {
  id: 'local' | 'cloud';
  title: string;
  summary: string;
  requestPath: string[];
  nodes: ArchNode[];
  /** Zones not active in this mode, with an explanation. */
  inactiveZones?: { zone: TrustZone; note: string }[];
  proof: Proof;
}

export const LOCAL_MODE: ArchMode = {
  id: 'local',
  title: 'Local Full-Tool Lab',
  summary:
    'Docker Compose brings up the gateway, three internal services, PostgreSQL, Redis, and a ZAP daemon. This is the only mode where ZAP, Nmap, Trivy, and tshark actively run — against allowlisted local/demo targets.',
  requestPath: ['Reviewer / browser', 'Secure Gateway', 'Internal service', 'PostgreSQL / Redis', 'Local tools'],
  proof: { kind: 'code', path: 'infra/local/docker-compose.yml' },
  nodes: [
    { name: 'Reviewer UI', role: 'Vite app', detail: 'React reviewer path; talks to the gateway only.', zone: 'public', proof: { kind: 'code', path: 'apps/reviewer-ui/src/app/App.tsx' } },
    { name: 'Secure Gateway', role: 'Fastify · :3000', detail: 'The only public backend ingress; authenticates and proxies.', zone: 'public', proof: { kind: 'code', path: 'apps/gateway/src/app.ts' } },
    { name: 'Traefik', role: 'optional edge', detail: 'Optional reverse proxy profile in front of the gateway.', zone: 'public', proof: { kind: 'code', path: 'infra/local/traefik/traefik.yml' } },
    { name: 'Vulnerability Scanner', role: 'FastAPI · :8080', detail: 'ZAP-backed scans, allowlisted targets, Celery jobs.', zone: 'internal', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py' } },
    { name: 'Network Analyzer', role: 'FastAPI · :8081', detail: 'tshark capture, flows, anomalies, stats.', zone: 'internal', proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/api/routes/monitoring.py' } },
    { name: 'Assessment Orchestrator', role: 'FastAPI · :8082', detail: 'Nmap/ZAP/Trivy lifecycle and artifacts.', zone: 'internal', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/api/routes/assessments.py' } },
    { name: 'PostgreSQL', role: 'datastore', detail: 'Persists scans, findings, flows, assessments, artifacts.', zone: 'internal', proof: { kind: 'code', path: 'infra/local/postgres-init.sql' } },
    { name: 'Redis / Celery', role: 'job queue', detail: 'Async scan and assessment workers.', zone: 'internal', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/workers/celery_app.py' } },
    { name: 'OWASP ZAP', role: 'web scanner', detail: 'Spider + active scan daemon for local/demo targets.', zone: 'local-tools', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/services/zap_client.py' } },
    { name: 'Nmap', role: 'service discovery', detail: 'Built with no shell interpolation and a timeout.', zone: 'local-tools', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
    { name: 'tshark', role: 'packet capture', detail: 'Streams packets, aggregates flows, raises spikes.', zone: 'local-tools', proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/services/capture.py' } },
    { name: 'Trivy', role: 'image scan (optional)', detail: 'Disabled by default (ENABLE_TRIVY=false).', zone: 'local-tools', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
    { name: 'Audit & artifacts', role: 'evidence', detail: 'Gateway audit events and persisted findings/artifacts.', zone: 'evidence', proof: { kind: 'code', path: 'apps/gateway/src/audit.ts' } },
  ],
};

export const CLOUD_MODE: ArchMode = {
  id: 'cloud',
  title: 'Azure Cloud-Demo',
  summary:
    'Terraform provisions Container Apps with external ingress on the gateway only, internal services, ACR, Log Analytics, and a Static Web App. Services run with CLOUD_DEMO_MODE=true and serve seeded data — active scanning tools are disabled.',
  requestPath: ['Reviewer / browser', 'Static Web Apps', 'Gateway Container App', 'Internal Container Apps', 'Seeded data + Log Analytics'],
  proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' },
  inactiveZones: [
    { zone: 'local-tools', note: 'Active ZAP/Nmap/Trivy/tshark execution is disabled in cloud-demo (ENABLE_* = false, capture off).' },
  ],
  nodes: [
    { name: 'Azure Static Web Apps', role: 'reviewer UI host', detail: 'Hosts this reviewer UI; URL is a placeholder until deploy.', zone: 'public', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'Gateway Container App', role: 'external ingress', detail: 'external_enabled = true — the only public backend.', zone: 'public', proof: { kind: 'code', path: 'infra/azure/terraform/modules/container-app/main.tf' } },
    { name: 'Scanner Container App', role: 'internal ingress', detail: 'external_enabled = false; cloud-demo mode.', zone: 'internal', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'Network Container App', role: 'internal ingress', detail: 'external_enabled = false; capture disabled.', zone: 'internal', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'Assessment Container App', role: 'internal ingress', detail: 'external_enabled = false; tools disabled.', zone: 'internal', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'Azure Container Registry', role: 'image store', detail: 'admin_enabled = false; stores service images.', zone: 'internal', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'Seeded scan findings', role: 'demo data', detail: 'Deterministic ZAP findings via /demo/import.', zone: 'demo', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py' } },
    { name: 'Seeded network telemetry', role: 'demo data', detail: 'Deterministic flows + anomaly via /demo/import.', zone: 'demo', proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/api/routes/monitoring.py' } },
    { name: 'Log Analytics', role: 'platform logs', detail: 'Receives Container Apps diagnostics.', zone: 'evidence', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
    { name: 'GitHub Actions OIDC', role: 'deploy identity', detail: 'Federated login, no long-lived Azure secrets.', zone: 'evidence', proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' } },
  ],
};

export const WHY_GATEWAY_PUBLIC =
  'Only the gateway is reachable from outside. Internal services have no public ingress, so authentication, RBAC, rate limiting, validation, and audit are enforced in exactly one place. The gateway never forwards user-supplied URLs — it proxies to a fixed registry of service IDs checked against an allowlist, which closes the SSRF path to internal metadata endpoints.';
