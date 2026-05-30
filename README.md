# Defensive Security Platform Lab

A portfolio-grade security platform lab showing secure API gateway patterns, defensive scanner orchestration, network telemetry, async security jobs, Azure cloud-demo deployment, and evidence-backed DevSecOps automation.

Live reviewer UI: _placeholder - Azure Static Web Apps URL_

## What This Project Proves

- Secure internal security platform engineering with a dedicated gateway front door.
- JWT/RBAC auth hardening, refresh token rotation, token revocation, and refresh token reuse detection.
- Defensive request validation, rate limiting, security headers, request IDs, and audit logging.
- SSRF-safe proxying through fixed, allowlisted upstream services.
- Defensive vulnerability scanning with OWASP ZAP against allowlisted local/demo targets.
- Assessment orchestration across Nmap, ZAP, and optional Trivy with safe command construction and timeouts.
- Local network telemetry using tshark with deterministic demo telemetry for cloud-demo mode.
- PostgreSQL persistence and Redis/Celery async job patterns.
- Docker Compose local full-tool lab and Azure cloud-demo architecture.
- CI/CD security validation, reviewer screenshots, and evidence artifacts.

## What This Project Is Not

- Not an operations-center or managed detection program.
- Not an enterprise SaaS product.
- Not an exploitation framework.
- Only allowlisted local/demo targets are in scope.
- No formal compliance certification is claimed.
- Not a live operational platform.

This is a defensive, production-inspired security platform lab for portfolio review and technical interviews.

## Architecture Overview

```text
Reviewer / Browser
        |
        | HTTPS in cloud-demo / HTTP in local lab
        v
Azure Static Web Apps reviewer UI
        |
        v
Secure API Gateway (public ingress)
        |
        | allowlisted internal upstreams only
        +----------------------+-------------------------+
        |                      |                         |
        v                      v                         v
Vulnerability Scanner    Network Analyzer        Assessment Orchestrator
FastAPI + ZAP client     FastAPI + tshark/demo    FastAPI + Nmap/ZAP/Trivy
        |                      |                         |
        +-----------+----------+------------+------------+
                    |                       |
                    v                       v
              PostgreSQL                 Redis/Celery
```

Trust boundaries:

- The gateway is the only public backend entry point.
- Scanner, network, and assessment services are internal services.
- ZAP, Nmap, Trivy, and tshark execution are local-lab capabilities by default.
- Cloud-demo mode uses demo/sample scanner and network data unless explicit allowlisting is configured.

## Local Full-Tool Lab

The local lab runs the active platform services with Docker Compose:

- `gateway`
- `vulnerability-scanner`
- `network-analyzer`
- `assessment-orchestrator`
- `postgres`
- `redis`
- `zap`
- optional `traefik`
- optional `reviewer-ui`

Local scanning guardrails:

- Allowed targets default to localhost and demo-app style targets only.
- ZAP is not exposed as a public service.
- Nmap runs only against allowlisted local/demo targets.
- tshark capture is optional and requires host/container packet capture permissions.
- Dev credentials and secrets are local-only examples.

Quick start:

```bash
./scripts/local-up.sh
./scripts/seed-demo-data.sh
./scripts/smoke-test-local.sh
```

## Azure Cloud-Demo Architecture

Azure cloud-demo mode is designed to show architecture and review workflows safely:

- Azure Static Web Apps hosts the reviewer UI.
- Azure Container Apps hosts the gateway with external ingress.
- Scanner, network analyzer, and assessment orchestrator use internal Container Apps ingress.
- Azure Container Registry stores built container images.
- Log Analytics receives platform logs.
- GitHub Actions deploys through OIDC, not long-lived Azure client secrets.
- Demo/sample scanner and network data is used where live scanning would be unsafe.

Cloud-demo mode does not run arbitrary internet scanning by default.

## Real Vs Demo Vs Planned

| Capability | Status | Notes |
| --- | --- | --- |
| Secure API Gateway | Real code | TypeScript/Fastify public front door. |
| JWT/RBAC | Real code | Local lab users and role permissions. |
| Refresh token rotation | Real code | Rotating refresh token family model. |
| Token revocation/reuse detection | Real code | Reuse attempts revoke the token family and emit audit events. |
| Request validation | Real code | Gateway and service request schemas. |
| Rate limiting | Real code | Gateway per-client limits. |
| Audit logging | Real code | Security events exposed for reviewer evidence. |
| SSRF-safe proxy concept | Real code | Fixed service registry and allowlisted internal upstreams. |
| ZAP-backed vulnerability scanner | Real local-lab code | Active scans are allowlisted and local/demo by default. |
| Nmap/ZAP/Trivy assessment orchestration | Real local-lab code | Trivy is optional; tools are gated by allowlist and mode. |
| tshark network telemetry | Real local-lab code | Capture requires local permissions. |
| PostgreSQL persistence | Real code | Service data models persist to PostgreSQL in local lab. |
| Redis/Celery async jobs | Real code | Scanner and orchestrator use async job patterns. |
| Docker Compose local lab | Real code | Full active lab under `infra/local`. |
| Reviewer UI | Real code | Public portfolio UI with demo data labels. |
| CI validation | Real code | Build, test, compose, IaC, and security checks. |
| Azure Static Web Apps reviewer UI | Cloud-demo | Terraform/workflow architecture with URL placeholder. |
| Azure Container Apps backend demo services | Cloud-demo | Gateway external, internal services private. |
| Log Analytics logs | Cloud-demo | Configured in Terraform for app diagnostics. |
| Demo scanner/network data | Demo | Used in cloud-demo where actual scanning is unsafe. |
| Production cloud scanning | Planned | Not active. |
| Kubernetes deployment | Planned | Not active. |
| Full alert correlation | Planned | Archived as future scope. |
| Full compliance engine | Planned | Archived as future scope. |
| Live AWS Security Hub integration | Planned | Not active in this project. |
| Managed monitoring workflows | Planned | Not a goal of this lab. |

## Active Services

| Service | Path | Purpose |
| --- | --- | --- |
| Gateway | `apps/gateway` | Auth, RBAC, refresh tokens, audit, validation, rate limiting, proxy allowlist. |
| Vulnerability Scanner | `apps/vulnerability-scanner` | Defensive ZAP scanning and sample finding import. |
| Network Analyzer | `apps/network-analyzer` | Local tshark capture, demo telemetry, flows, anomalies, stats. |
| Assessment Orchestrator | `apps/assessment-orchestrator` | Defensive Nmap/ZAP/Trivy assessment lifecycle and artifacts. |
| Reviewer UI | `apps/reviewer-ui` | Public review path, architecture, controls, evidence, and limitations. |

Archived planned services are under `_archive/planned-services/` and are not presented as active.

## Security Guardrails

- Only allowlisted targets can be scanned.
- Cloud-demo services default to demo/sample mode.
- Tokens are not logged.
- Refresh tokens use httpOnly cookies for browser flows.
- Gateway errors avoid internal stack trace leakage.
- Internal services are reached through fixed upstream IDs, not user-supplied URLs.
- Scanner execution is local-lab only unless a target is explicitly allowlisted.
- Packet capture is opt-in and documented as local-only.
- CI does not scan unmanaged public targets.

## Reviewer UI

The reviewer UI is a React + Vite single-page app with **real, deep-linkable routes** (React
Router), structured/typed data, and reusable components — not a single-file brochure. It is
designed for a five-minute review path:

1. Start Here — `/`
2. Architecture — `/architecture`
3. Secure Gateway — `/gateway`
4. Assessment Pipeline — `/assessment-pipeline`
5. Network Telemetry — `/network-telemetry`
6. Azure Deployment — `/azure-deployment`
7. Evidence — `/evidence`

A secondary, optional Lab Sandbox (`/sandbox`) is available for hands-on API exploration. Every
demo dataset is labelled, and every strong claim renders as a clickable `ProofLink` to the exact
code, test, workflow, doc, or evidence file on GitHub. See `docs/reviewer-ui-redesign-report.md`
for the redesign details.

## Evidence

Evidence is organized under:

- `evidence/screenshots/`
- `evidence/workflows/`
- `evidence/api/`
- `evidence/azure/`
- `docs/evidence/evidence-guide.md`

Generated evidence includes reviewer UI screenshots, local API smoke outputs, sample scan output, sample assessment output, sample network anomaly output, CI evidence, Terraform validation output, and Azure screenshot placeholders.

## CI/CD

Workflows under `.github/workflows/` validate:

- Gateway build, typecheck, lint, and tests.
- Python service tests and linting where configured.
- Reviewer UI build and reviewer path tests.
- Docker Compose config.
- Gitleaks and Trivy filesystem scans where tools are available.
- Terraform format/validation/plan for Azure cloud-demo.
- Portfolio evidence generation and screenshot upload.

Azure deployment uses GitHub Actions OIDC with minimal workflow permissions.

## Repository Layout

```text
apps/
  reviewer-ui/
  gateway/
  vulnerability-scanner/
  network-analyzer/
  assessment-orchestrator/
packages/
  shared-security-core/
  contracts/
infra/
  local/
  azure/terraform/
docs/
  audit/
  architecture/
  threat-model/
  deployment/
  security/
  evidence/
  adr/
evidence/
  screenshots/
  workflows/
  api/
  azure/
_archive/
  planned-services/
```

## Local Quick Start

```bash
cp apps/gateway/.env.example apps/gateway/.env
docker compose -f infra/local/docker-compose.yml up --build
```

Then open:

- Gateway health: `http://localhost:3000/healthz`
- Gateway docs: `http://localhost:3000/docs`
- Reviewer UI: `http://localhost:5173`

Local-only demo users:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `Admin123!` | Admin |
| `analyst` | `Analyst123!` | Analyst |
| `auditor` | `Auditor123!` | Auditor |

## Azure Deploy Overview

The Azure cloud-demo path is under `infra/azure/terraform/` and documented in `infra/azure/README.md`.

At a high level:

1. Terraform creates the resource group, Log Analytics workspace, ACR, Container Apps environment, Container Apps, and Static Web App.
2. GitHub Actions authenticates to Azure with OIDC.
3. Images are built and pushed to ACR.
4. Only the gateway receives external Container Apps ingress.
5. Internal services run in demo mode unless explicitly configured otherwise.

## Limitations

- The local lab is intended for controlled demo targets.
- Cloud-demo scanner and network data may be seeded sample data.
- tshark capture depends on host OS and permissions.
- ZAP/Nmap/Trivy execution can be slow and should be bounded by timeouts.
- Terraform is a cloud-demo skeleton unless configured with real Azure subscription values.
- Archived services are not part of the active showcase.

## Roadmap

- Add more sample ZAP/Nmap/Trivy artifacts.
- Expand service-level OpenAPI examples.
- Add optional Azure Database for PostgreSQL and Azure Cache for Redis modules.
- Add richer Log Analytics queries for cloud-demo review.
- Add more visual evidence capture from a real Azure deployment.

## Interview Talking Points

- I intentionally separated real, demo, and planned capabilities to avoid overclaiming.
- The gateway is the trust boundary and the only public backend ingress.
- Scanner and assessment execution is allowlisted, defensive, and local-lab first.
- Cloud-demo mode prioritizes safe architecture demonstration over active scanning.
- The project complements SecureObs and the Sentinel lab by focusing on internal security platform engineering.

Resume bullet:

Built a defensive security platform lab with a hardened API gateway, JWT/RBAC, refresh-token reuse detection, ZAP/Nmap/Trivy assessment orchestration, tshark-based network telemetry, Docker Compose local lab, Azure Container Apps cloud-demo architecture, and evidence-backed CI/CD automation.
