# Defensive Security Platform Lab

A portfolio-grade security platform lab showing secure API gateway patterns, defensive scanner orchestration, network telemetry, async security jobs, Azure cloud-demo deployment, and evidence-backed DevSecOps automation.

Live reviewer UI: _placeholder - Azure Static Web Apps URL_

## What This Project Proves

- Secure internal security platform engineering with a dedicated gateway front door.
- JWT/RBAC auth hardening, refresh token rotation, token revocation, and refresh token reuse detection.
- Defensive request validation, rate limiting, security headers, request IDs, and audit logging.
- SSRF-safe proxying through fixed, allowlisted upstream services.
- Defensive vulnerability scanning with OWASP ZAP-style findings against allowlisted demo targets.
- Assessment orchestration across Nmap, ZAP, and optional Trivy with safe command construction and timeouts.
- Local network telemetry using tshark-capable services with labelled replay data for cloud-demo mode.
- PostgreSQL persistence and Redis/Celery async job patterns.
- Docker Compose local lab and Azure cloud-demo architecture.
- CI/CD security validation, reviewer screenshots, and evidence artifacts.

## What This Project Is Not

- Not an operations-center or managed detection program.
- Not an enterprise SaaS product.
- Not an exploitation framework.
- Not a scanner for arbitrary internet targets.
- No formal compliance certification is claimed.
- Not a live operational platform.

This is a defensive, production-inspired security platform lab for portfolio review and technical interviews.

## Reviewer UI

The reviewer UI is a React + Vite single-page app with five active tool routes:

1. Infra Lab - `/lab`
2. Threat Map - `/threat-map`
3. Network Analyzer - `/network`
4. Vulnerability Scanner - `/scanner`
5. API Gateway - `/gateway`

The root route redirects to `/lab`. Removed portfolio-shell pages such as Home, Projects, and About are not part of the active reviewer path.

The UI uses live local APIs where available and labelled replay data where external infrastructure is not running. The network analyzer and vulnerability scanner do not accept arbitrary scan targets; scanner targets are fixed to intentionally vulnerable, allowlisted demo applications.

## Architecture Overview

```text
Reviewer / Browser
        |
        | HTTP local lab / HTTPS cloud-demo
        v
Reviewer UI
        |
        +--> scan-engine local demo APIs
        |    - threat map data
        |    - network replay API
        |    - allowlisted scanner demo API
        |    - API gateway simulator
        |    - infra validation
        |
        v
Secure API Gateway (public backend ingress)
        |
        +--> Vulnerability Scanner
        +--> Network Analyzer
        +--> Assessment Orchestrator
        |
        +--> PostgreSQL / Redis / ZAP
```

Trust boundaries:

- The gateway is the only public backend entry point in the cloud-demo architecture.
- Scanner, network, and assessment services are internal services.
- ZAP, Nmap, Trivy, and tshark execution are local-lab capabilities by default.
- Cloud-demo mode uses demo/sample scanner and network data unless explicit allowlisting is configured.

## Local Full-Tool Lab

The local lab runs the active platform services with Docker Compose:

- `gateway`
- `vulnerability-scanner`
- `network-analyzer`
- `assessment-orchestrator`
- `scan-engine`
- `postgres`
- `redis`
- `zap`
- optional `traefik`
- `reviewer-ui` with the `reviewer` profile

Quick start:

```bash
cp apps/gateway/.env.example apps/gateway/.env
docker compose -f infra/local/docker-compose.yml --profile reviewer up --build -d
```

Then open:

- Reviewer UI: `http://localhost:5173`
- Gateway health: `http://localhost:3000/healthz`
- Gateway docs: `http://localhost:3000/docs`
- Scan engine health: `http://localhost:4000/api/health`

Local scanning guardrails:

- Allowed targets default to localhost and demo-app style targets only.
- The reviewer scanner page uses a fixed allowlist of intentionally vulnerable demo applications.
- ZAP is not exposed as a public service.
- Nmap runs only against allowlisted local/demo targets.
- tshark capture is optional and requires host/container packet capture permissions.
- Dev credentials and secrets are local-only examples.

## Active Services

| Service | Path | Purpose |
| --- | --- | --- |
| Gateway | `apps/gateway` | Auth, RBAC, refresh tokens, audit, validation, rate limiting, proxy allowlist. |
| Vulnerability Scanner | `apps/vulnerability-scanner` | Defensive ZAP scanning and sample finding import. |
| Network Analyzer | `apps/network-analyzer` | Local tshark capture, demo telemetry, flows, anomalies, stats. |
| Assessment Orchestrator | `apps/assessment-orchestrator` | Defensive Nmap/ZAP/Trivy assessment lifecycle and artifacts. |
| Scan Engine | `apps/scan-engine` | Local reviewer UI APIs for threat intel, safe scanner demos, network replay, infra validation, and gateway simulations. |
| Reviewer UI | `apps/reviewer-ui` | Public interactive tool UI and evidence-oriented review path. |

Archived planned services are under `_archive/planned-services/` and are not presented as active.

## Real Vs Demo Vs Planned

| Capability | Status | Notes |
| --- | --- | --- |
| Secure API Gateway | Real code | TypeScript/Fastify public front door plus UI simulator evidence. |
| JWT/RBAC | Real code | Local lab users and role permissions. |
| Refresh token rotation | Real code | Rotating refresh token family model in the gateway. |
| Request validation | Real code | Gateway, scan-engine, and service request schemas. |
| Rate limiting | Real code | Gateway and demo gateway simulator. |
| Audit logging | Real code | Security events exposed for reviewer evidence. |
| ZAP-backed vulnerability scanner | Real local-lab code | Active scans are allowlisted and local/demo by default. |
| Reviewer scanner UI | Demo/API-backed | Uses allowlisted targets and replay fallback when backend infrastructure is unavailable. |
| Network telemetry UI | Demo/API-backed | Uses local API or labelled replay; tshark capture remains local-lab only. |
| Docker Compose local lab | Real code | Full active lab under `infra/local`. |
| Azure Static Web Apps reviewer UI | Cloud-demo | Terraform/workflow architecture with URL placeholder. |
| Fly.io network/scanner services | Optional cloud-demo | Manifests and deployment docs are included; requires interactive Fly.io login. |
| Production cloud scanning | Planned | Not active. |
| Kubernetes deployment | Planned | Not active. |
| Full alert correlation | Planned | Archived as future scope. |
| Full compliance engine | Planned | Archived as future scope. |

## Security Guardrails

- Only allowlisted targets can be scanned.
- Cloud-demo services default to demo/sample mode.
- Tokens are not logged.
- Refresh tokens use httpOnly cookies for browser flows where applicable.
- Gateway errors avoid internal stack trace leakage.
- Internal services are reached through fixed upstream IDs, not user-supplied URLs.
- Scanner execution is local-lab only unless a target is explicitly allowlisted.
- Packet capture is opt-in and documented as local-only.
- CI does not scan unmanaged public targets.

## Optional Fly.io Demo Services

The Phase 2 reviewer UI can run fully local through `apps/scan-engine`. Optional Fly.io manifests are included for separate public demo backends:

- `apps/network-analyzer/fly.toml`
- `apps/vulnerability-scanner/fly.toml`

Deployment steps are documented in `docs/deployment/flyio-phase2-services.md`. These deployments require an interactive Fly.io login and are not required for local review.

## Azure Deploy Overview

The Azure cloud-demo path is under `infra/azure/terraform/` and documented in `infra/azure/README.md`.

At a high level:

1. Terraform creates the resource group, Log Analytics workspace, ACR, Container Apps environment, Container Apps, and Static Web App.
2. GitHub Actions authenticates to Azure with OIDC.
3. Images are built and pushed to ACR.
4. Only the gateway receives external Container Apps ingress.
5. Internal services run in demo mode unless explicitly configured otherwise.

## Evidence

Evidence is organized under:

- `evidence/screenshots/`
- `evidence/workflows/`
- `evidence/api/`
- `evidence/azure/`
- `docs/evidence/evidence-guide.md`

Generated evidence includes reviewer UI screenshots, local API smoke outputs, sample scan output, sample assessment output, sample network anomaly output, CI evidence, Terraform validation output, and Azure screenshot placeholders.

## CI/CD

Workflows under `.github/workflows/` validate builds, tests, Docker Compose config, security scans, Terraform validation, and evidence generation. Azure deployment uses GitHub Actions OIDC with minimal workflow permissions.

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
- The gateway is the trust boundary and the only public backend ingress in cloud-demo.
- Scanner and assessment execution is allowlisted, defensive, and local-lab first.
- Cloud-demo mode prioritizes safe architecture demonstration over active scanning.
- The project complements SecureObs and the Sentinel lab by focusing on internal security platform engineering.

Resume bullet:

Built a defensive security platform lab with a hardened API gateway, JWT/RBAC, refresh-token reuse detection, ZAP/Nmap/Trivy assessment orchestration, tshark-based network telemetry, Docker Compose local lab, Azure Container Apps cloud-demo architecture, and evidence-backed CI/CD automation.
