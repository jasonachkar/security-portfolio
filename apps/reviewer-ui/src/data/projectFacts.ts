import type { Proof } from '../components/shared/ProofLink';
import type { BadgeTone } from '../components/shared/Badge';

export const PROJECT_NAME = 'Defensive Security Platform Lab';

export const PROJECT_MISSION =
  'A controlled, defensive security platform lab: a hardened API gateway front door, allowlisted scanner orchestration, network telemetry, a local full-tool lab, and an Azure cloud-demo — every strong claim linked to the code, test, or evidence that backs it.';

export interface HonestBadge {
  label: string;
  tone: BadgeTone;
}

/** Honest framing chips shown in the hero. */
export const HERO_BADGES: HonestBadge[] = [
  { label: 'Portfolio-grade', tone: 'teal' },
  { label: 'Defensive lab', tone: 'green' },
  { label: 'Local full-tool lab', tone: 'indigo' },
  { label: 'Azure cloud-demo', tone: 'violet' },
  { label: 'Allowlisted targets only', tone: 'amber' },
];

export interface ProofPillar {
  title: string;
  blurb: string;
  proof: Proof;
}

/** "What this proves" — four pillars of the project. */
export const PROOF_PILLARS: ProofPillar[] = [
  {
    title: 'Secure API Gateway Engineering',
    blurb:
      'JWT/RBAC, rotating refresh-token families with reuse detection, rate limiting, request validation, audit events, and an SSRF-safe proxy through a fixed upstream registry.',
    proof: { kind: 'code', path: 'apps/gateway/src/auth.ts' },
  },
  {
    title: 'Defensive Scanner Orchestration',
    blurb:
      'ZAP web scanning plus an Nmap/ZAP/Trivy orchestrator with strict target allowlisting, no-shell command construction, subprocess timeouts, and persisted artifacts.',
    proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' },
  },
  {
    title: 'Network Security Telemetry',
    blurb:
      'A tshark capture pipeline that aggregates packets into flows and raises a simple traffic-spike anomaly, with deterministic seeded telemetry for cloud-demo mode.',
    proof: { kind: 'code', path: 'apps/network-analyzer/src/network_analyzer/services/capture.py' },
  },
  {
    title: 'Azure Cloud-Demo Architecture',
    blurb:
      'Container Apps with external ingress on the gateway only, internal services, ACR, Log Analytics, a Static Web App, and GitHub Actions OIDC — all in Terraform.',
    proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' },
  },
];

export interface ReviewerStep {
  index: number;
  label: string;
  to: string;
  blurb: string;
}

/** The recommended 5-minute reviewer path. */
export const REVIEWER_PATH: ReviewerStep[] = [
  {
    index: 1,
    label: 'Architecture',
    to: '/architecture',
    blurb: 'See the local full-tool lab and the Azure cloud-demo, and why only the gateway is public.',
  },
  {
    index: 2,
    label: 'Secure Gateway',
    to: '/gateway',
    blurb: 'The auth flow, security controls, and OWASP API Top 10 mapping — tied to real tests.',
  },
  {
    index: 3,
    label: 'Assessment Pipeline',
    to: '/assessment-pipeline',
    blurb: 'Defensive ZAP/Nmap/Trivy orchestration and the allowlist-first safety model.',
  },
  {
    index: 4,
    label: 'Evidence',
    to: '/evidence',
    blurb: 'Verified tests, samples, and screenshots first; not-yet-captured Azure evidence last.',
  },
];

export type CapabilityStatus = 'Real' | 'Real (local lab)' | 'Cloud-demo' | 'Demo data' | 'Planned';

export interface CapabilityRow {
  capability: string;
  status: CapabilityStatus;
  note: string;
}

/** Compact Real vs Demo vs Planned table. */
export const CAPABILITY_MATRIX: CapabilityRow[] = [
  { capability: 'Gateway auth, RBAC, refresh reuse detection', status: 'Real', note: 'TypeScript/Fastify, covered by gateway tests.' },
  { capability: 'Rate limiting, validation, audit, SSRF-safe proxy', status: 'Real', note: 'Fixed upstream registry; no user-supplied URLs.' },
  { capability: 'ZAP scans, Nmap discovery, optional Trivy', status: 'Real (local lab)', note: 'Allowlisted local/demo targets only.' },
  { capability: 'tshark packet capture → flows + anomalies', status: 'Real (local lab)', note: 'Requires host capture permissions.' },
  { capability: 'PostgreSQL persistence, Redis/Celery jobs', status: 'Real', note: 'Used by scanner and orchestrator services.' },
  { capability: 'Azure Static Web Apps + Container Apps', status: 'Cloud-demo', note: 'Terraform skeleton; URL is a placeholder.' },
  { capability: 'Cloud scanner / network data', status: 'Demo data', note: 'Seeded sample findings and flows; labelled.' },
  { capability: 'Production cloud scanning, Kubernetes, full SOC', status: 'Planned', note: 'Documented as future scope, not implemented.' },
];

export const STATUS_TONE: Record<CapabilityStatus, BadgeTone> = {
  Real: 'green',
  'Real (local lab)': 'teal',
  'Cloud-demo': 'violet',
  'Demo data': 'amber',
  Planned: 'slate',
};
