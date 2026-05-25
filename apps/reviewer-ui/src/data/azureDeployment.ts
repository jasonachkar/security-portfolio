import type { Proof } from '../components/shared/ProofLink';
import type { BadgeTone } from '../components/shared/Badge';

export const AZURE_GOAL =
  'The Azure cloud-demo exists to prove cloud security architecture — a public gateway, private internal services, managed identity for deploys, and centralized logs — without running broad scanning from the cloud. It is a Terraform skeleton and a deploy workflow, not a live production deployment.';

export interface AzureResource {
  name: string;
  role: string;
  detail: string;
  proof: Proof;
}

export const AZURE_RESOURCES: AzureResource[] = [
  { name: 'Static Web Apps', role: 'reviewer UI host', detail: 'Hosts this reviewer UI (Free tier). The public URL is a placeholder until a real deploy.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
  { name: 'Container Apps', role: 'gateway + services', detail: 'Gateway with external ingress; scanner, network, and assessment with internal ingress only.', proof: { kind: 'code', path: 'infra/azure/terraform/modules/container-app/main.tf' } },
  { name: 'Container Registry', role: 'image store', detail: 'ACR with admin_enabled = false; stores the built service images.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
  { name: 'Log Analytics', role: 'platform logs', detail: 'Workspace wired to the Container Apps environment for diagnostics.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
  { name: 'Terraform', role: 'infrastructure as code', detail: 'A reusable container-app module plus a dev environment composition.', proof: { kind: 'code', path: 'infra/azure/terraform/modules/container-app/main.tf' } },
  { name: 'GitHub Actions OIDC', role: 'deploy identity', detail: 'Federated azure/login with id-token: write — no long-lived client secrets.', proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' } },
];

export interface SecurityPoint {
  title: string;
  detail: string;
  proof: Proof;
}

export const AZURE_SECURITY: SecurityPoint[] = [
  { title: 'Gateway is the only external app', detail: 'The gateway module sets external_enabled = true; every other service module sets it to false.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
  { title: 'Internal services stay private', detail: 'Scanner, network, and assessment Container Apps use internal ingress and are reached only via the gateway.', proof: { kind: 'code', path: 'infra/azure/terraform/modules/container-app/main.tf' } },
  { title: 'Cloud-demo serves sample data', detail: 'Each service runs with APP_ENV=cloud-demo and CLOUD_DEMO_MODE=true, returning seeded findings/telemetry.', proof: { kind: 'doc', path: 'docs/security/cloud-demo-safety-model.md' } },
  { title: 'No broad scanning from cloud', detail: 'ENABLE_NMAP/ZAP/TRIVY are all false in cloud-demo, and packet capture is disabled.', proof: { kind: 'code', path: 'infra/azure/terraform/environments/dev/main.tf' } },
];

export type StepStatus = 'Automated' | 'Manual / placeholder';

export interface CicdStep {
  title: string;
  detail: string;
  status: StepStatus;
  proof: Proof;
}

export const STEP_STATUS_TONE: Record<StepStatus, BadgeTone> = {
  Automated: 'green',
  'Manual / placeholder': 'amber',
};

export const CICD_FLOW: CicdStep[] = [
  { title: 'Build', detail: 'CI builds and type-checks the gateway, the three Python services, and the reviewer UI.', status: 'Automated', proof: { kind: 'workflow', path: '.github/workflows/ci.yml' } },
  { title: 'Scan', detail: 'Gitleaks secret scan, Trivy filesystem scan, and npm critical audit run in CI.', status: 'Automated', proof: { kind: 'workflow', path: '.github/workflows/ci.yml' } },
  { title: 'Push images', detail: 'A Docker build workflow builds service images; pushing to a specific ACR is environment-specific.', status: 'Manual / placeholder', proof: { kind: 'workflow', path: '.github/workflows/docker-build.yml' } },
  { title: 'Terraform validate / plan', detail: 'The deploy workflow runs fmt -check, init -backend=false, validate, and plan.', status: 'Automated', proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' } },
  { title: 'Deploy', detail: 'terraform apply is intentionally a guarded manual step until image variables are set for the target ACR.', status: 'Manual / placeholder', proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' } },
  { title: 'Smoke test', detail: 'Post-deploy gateway /healthz and reviewer UI checks are scripted as the final step.', status: 'Manual / placeholder', proof: { kind: 'workflow', path: '.github/workflows/azure-deploy.yml' } },
];

/** Azure portal evidence that still needs to be captured from a real deploy. */
export const AZURE_PLACEHOLDERS: { title: string; proof: Proof }[] = [
  { title: 'Resource group overview', proof: { kind: 'doc', path: 'evidence/azure/README.md' } },
  { title: 'Container Apps list (gateway external only)', proof: { kind: 'doc', path: 'evidence/azure/README.md' } },
  { title: 'Static Web App overview', proof: { kind: 'doc', path: 'evidence/azure/README.md' } },
  { title: 'Log Analytics workspace + OIDC run summary', proof: { kind: 'doc', path: 'evidence/azure/README.md' } },
];
