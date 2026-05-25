import type { Proof } from '../components/shared/ProofLink';
import type { BadgeTone } from '../components/shared/Badge';

export type EvidenceStatus = 'Verified' | 'Generated' | 'Demo data' | 'To capture';

export const EVIDENCE_STATUS_TONE: Record<EvidenceStatus, BadgeTone> = {
  Verified: 'green',
  Generated: 'teal',
  'Demo data': 'amber',
  'To capture': 'slate',
};

export interface EvidenceItem {
  title: string;
  status: EvidenceStatus;
  proof: Proof;
  proves: string;
  limitation: string;
}

/** Verified evidence — leads the page. */
export const VERIFIED_EVIDENCE: EvidenceItem[] = [
  {
    title: 'Gateway auth & controls (10 tests)',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/gateway/test/gateway.test.ts' },
    proves: 'Login, refresh rotation, reuse detection + family revocation, RBAC denial, validation, rate limiting, and the SSRF upstream check.',
    limitation: 'node:test against in-memory stores; not a load or pen test.',
  },
  {
    title: 'Scanner behavior (6 tests)',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/vulnerability-scanner/tests/test_scans.py' },
    proves: 'Target allowlisting, scan lifecycle, and deterministic demo import.',
    limitation: 'ZAP is mocked in tests; live scanning runs in the local lab.',
  },
  {
    title: 'Network telemetry (4 tests)',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/network-analyzer/tests/test_monitoring.py' },
    proves: 'Stats, flows, anomalies, and seeded demo telemetry endpoints.',
    limitation: 'tshark capture is mocked; real capture needs host permissions.',
  },
  {
    title: 'Assessment orchestration (6 tests)',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/assessment-orchestrator/tests/test_assessments.py' },
    proves: 'Target validation, the artifact pipeline, and demo artifact import.',
    limitation: 'Nmap/ZAP/Trivy are mocked; tools run in the local lab.',
  },
  {
    title: 'Reviewer UI path (Playwright)',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/reviewer-ui/tests/reviewer-path.spec.ts' },
    proves: 'Every route renders on desktop and mobile, honest language is visible, and the body has no horizontal overflow.',
    limitation: 'Functional/layout checks, not visual-regression assertions.',
  },
  {
    title: 'No-overclaiming scan',
    status: 'Verified',
    proof: { kind: 'test', path: 'apps/reviewer-ui/scripts/no-overclaiming.test.mjs' },
    proves: 'UI source contains no banned overclaiming phrases (negated forms allowed).',
    limitation: 'Phrase-based guardrail, not a semantic review.',
  },
  {
    title: 'Docker Compose validation',
    status: 'Verified',
    proof: { kind: 'workflow', path: '.github/workflows/ci.yml' },
    proves: 'docker compose config validates the local lab wiring in CI.',
    limitation: 'Config validation only; full container startup needs a Docker daemon.',
  },
  {
    title: 'Terraform validate / plan',
    status: 'Verified',
    proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' },
    proves: 'terraform fmt, validate, and plan run for the Azure dev environment.',
    limitation: 'Plan only — not applied to a live subscription here.',
  },
  {
    title: 'Gitleaks secret scan',
    status: 'Verified',
    proof: { kind: 'workflow', path: '.github/workflows/ci.yml' },
    proves: 'A secret scan runs on every push/PR and reported no leaks.',
    limitation: 'Pattern-based detection; not a guarantee of zero secrets ever.',
  },
];

export interface ApiSample {
  title: string;
  proof: Proof;
  note: string;
}

export const API_SAMPLES: ApiSample[] = [
  { title: 'Gateway health', proof: { kind: 'evidence', path: 'evidence/api/gateway-health.example.json' }, note: 'Shape of the /healthz response.' },
  { title: 'Sample scan', proof: { kind: 'evidence', path: 'evidence/api/sample-scan.example.json' }, note: 'Demo ZAP finding, labelled demo: true.' },
  { title: 'Sample assessment', proof: { kind: 'evidence', path: 'evidence/api/sample-assessment.example.json' }, note: 'Demo Nmap/ZAP/Trivy artifacts.' },
  { title: 'Sample network anomaly', proof: { kind: 'evidence', path: 'evidence/api/sample-network-anomaly.example.json' }, note: 'Seeded traffic-spike anomaly, labelled demo: true.' },
];

export interface ScreenshotItem {
  title: string;
  proof: Proof;
}

/** Generated reviewer-UI screenshots (produced by npm run evidence:screenshots). */
export const SCREENSHOTS: ScreenshotItem[] = [
  { title: 'Start Here', proof: { kind: 'screenshot', path: 'evidence/screenshots/start-here.png' } },
  { title: 'Architecture', proof: { kind: 'screenshot', path: 'evidence/screenshots/architecture.png' } },
  { title: 'Secure Gateway', proof: { kind: 'screenshot', path: 'evidence/screenshots/gateway.png' } },
  { title: 'Assessment Pipeline', proof: { kind: 'screenshot', path: 'evidence/screenshots/assessment-pipeline.png' } },
  { title: 'Network Telemetry', proof: { kind: 'screenshot', path: 'evidence/screenshots/network-telemetry.png' } },
  { title: 'Azure Deployment', proof: { kind: 'screenshot', path: 'evidence/screenshots/azure-deployment.png' } },
  { title: 'Evidence', proof: { kind: 'screenshot', path: 'evidence/screenshots/evidence.png' } },
  { title: 'Mobile · Start Here', proof: { kind: 'screenshot', path: 'evidence/screenshots/mobile-start-here.png' } },
];

/** Azure portal evidence still to capture — intentionally last on the page. */
export const AZURE_TO_CAPTURE: EvidenceItem[] = [
  {
    title: 'Azure portal screenshots',
    status: 'To capture',
    proof: { kind: 'doc', path: 'evidence/azure/README.md' },
    proves: 'Resource group, Container Apps ingress (gateway external only), Static Web App, Log Analytics, and the OIDC run.',
    limitation: 'Captured after a real cloud-demo deploy and redacted per the evidence guide.',
  },
];

export const EVIDENCE_TEST_TOTALS = {
  gateway: 10,
  scanner: 6,
  network: 4,
  orchestrator: 6,
  get backendTotal() {
    return this.gateway + this.scanner + this.network + this.orchestrator;
  },
};
