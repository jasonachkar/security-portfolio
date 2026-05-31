import type { Proof } from '../components/shared/ProofLink';

export const PIPELINE_MISSION =
  'A defensive assessment runs through one safe lifecycle: every request is allowlist-checked before any tool starts, work is queued to background workers, tools run with timeouts and no shell interpolation, and results are persisted as reviewable artifacts.';

export interface LifecycleStage {
  title: string;
  detail: string;
  proof: Proof;
}

export const ASSESSMENT_LIFECYCLE: LifecycleStage[] = [
  { title: 'Request', detail: 'An analyst submits a target through the gateway (scans:create / assessments).', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py' } },
  { title: 'Target allowlist', detail: 'validate_target_url / validate_target reject any host outside ALLOWED_TARGETS with 403 before work starts.', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/infra/security/target_validation.py' } },
  { title: 'Queue job', detail: 'The record is persisted as "queued" and a Celery task is enqueued (run_zap_scan.delay / run_assessment.delay).', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/workers/tasks.py' } },
  { title: 'Run tools', detail: 'A worker drives ZAP (spider + active scan), Nmap, or optional Trivy, each bounded by a timeout.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
  { title: 'Persist artifacts', detail: 'Findings and tool artifacts are written to PostgreSQL against the scan/assessment record.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/api/routes/assessments.py' } },
  { title: 'Review evidence', detail: 'Reviewers read findings/artifacts; cloud-demo seeds deterministic results via /demo/import.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/api/routes/assessments.py' } },
];

export interface StoryPoint {
  title: string;
  detail: string;
  proof: Proof;
}

export const SCANNER_STORY: StoryPoint[] = [
  { title: 'Scan creation', detail: 'POST /scans validates the target, persists a queued scan tied to the requesting user, and enqueues the ZAP job.', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py' } },
  { title: 'Worker', detail: 'A Celery worker runs the ZAP spider, then the active scan, polling status until each completes.', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/workers/worker.py' } },
  { title: 'Alerts → findings', detail: 'ZapClient.alerts() maps each ZAP alert to a Finding (risk, confidence, CVSS, CWE, evidence) for persistence.', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/services/zap_client.py' } },
  { title: 'Demo import mode', detail: 'POST /scans/demo/import seeds deterministic findings (missing CSP, server version header) for reviewer/cloud-demo mode.', proof: { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py' } },
];

export const ORCHESTRATOR_STORY: StoryPoint[] = [
  { title: 'Nmap', detail: 'build_nmap_command returns a fixed arg list (nmap -sV -T3 --reason <target>) — no shell, no string interpolation.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
  { title: 'ZAP', detail: 'run_zap_quick_scan drives spider + active scan against an httpx client with a monotonic deadline guard.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
  { title: 'Optional Trivy', detail: 'run_trivy_image scans a container image; disabled by default via ENABLE_TRIVY=false in Compose.', proof: { kind: 'code', path: 'infra/local/docker-compose.yml' } },
  { title: 'Artifact model', detail: 'Each tool returns a ToolResult(kind, content_type, content) persisted as an Artifact row on the assessment.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/parsers.py' } },
  { title: 'Safe subprocess + timeouts', detail: 'subprocess.run uses an argv list with check=False, capture_output, and SUBPROCESS_TIMEOUT_SECONDS.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py' } },
];

export interface Guardrail {
  title: string;
  detail: string;
  proof: Proof;
}

export const PIPELINE_GUARDRAILS: Guardrail[] = [
  { title: 'No public target scanning by default', detail: 'Targets must match ALLOWED_TARGETS; otherwise the request is rejected with 403 before any tool runs.', proof: { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/infra/security/target_validation.py' } },
  { title: 'Allowlisted local/demo targets', detail: 'The lab allowlist is localhost, 127.0.0.1, demo-app.local, and host.docker.internal.', proof: { kind: 'code', path: 'infra/local/docker-compose.yml' } },
  { title: 'No exploitation', detail: 'Tools perform discovery and defensive scanning only — there is no exploitation or credential attack code.', proof: { kind: 'doc', path: 'docs/security/scanner-safety-model.md' } },
  { title: 'Cloud-demo uses seeded data', detail: 'In cloud-demo mode ENABLE_NMAP/ZAP/TRIVY are false and services serve seeded artifacts.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
];

export const PIPELINE_EVIDENCE: Proof[] = [
  { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/api/routes/scans.py', label: 'Scanner routes' },
  { kind: 'code', path: 'apps/vulnerability-scanner/src/vulnerability_scanner/workers/worker.py', label: 'Scanner worker' },
  { kind: 'code', path: 'apps/assessment-orchestrator/src/security_assessment_orchestrator/services/runners.py', label: 'Orchestrator runners' },
  { kind: 'test', path: 'apps/vulnerability-scanner/tests/test_scans.py', label: 'Scanner tests' },
  { kind: 'test', path: 'apps/assessment-orchestrator/tests/test_assessments.py', label: 'Orchestrator tests' },
  { kind: 'code', path: 'infra/local/docker-compose.yml', label: 'Docker Compose lab' },
  { kind: 'evidence', path: 'evidence/api/sample-assessment.example.json', label: 'Sample assessment output' },
];
