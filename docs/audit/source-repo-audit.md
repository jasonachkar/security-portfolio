# Source Repository Audit

Date: 2026-05-24

Project target: Defensive Security Platform Lab

This audit was completed before major restructuring or implementation edits. It covers the current `security-portfolio` repo and the adjacent source repos under `../_sources`.

## Executive Summary

The current repository is a partially assembled security platform skeleton. It contains a working-style Python auth service and shared security core, plus planned or incomplete threat-intel, alert-correlation, and compliance services. The scanner, network analyzer, orchestrator, and UI paths are submodule placeholders in the base repo; the useful implementations for scanner, network analyzer, orchestrator, and gateway live in `../_sources`.

The current README overclaims the project with overstated enterprise and live-operations language. The actual repo does not yet support that claim: the active Compose file references services that are empty submodule directories, the UI path is empty, and several services are better treated as planned.

The strongest migration candidates are:

- `../_sources/secure-api-gateway`: TypeScript/Fastify gateway patterns, JWT/RBAC, refresh token rotation, rate limiting, audit logging, validation, security headers, and SSRF-aware proxy code.
- `../_sources/vulnerability-scanner`: FastAPI/ZAP scanner model with PostgreSQL, Celery, Redis, target allowlisting, scans, findings, and health endpoints.
- `../_sources/network-traffic-analyzer`: FastAPI/tshark telemetry service with flow/anomaly persistence and capture start/stop endpoints.
- `../_sources/security-assessment-orchestrator`: FastAPI/Celery orchestrator for Nmap, ZAP, optional Trivy, with strict target allowlisting and artifact persistence.

The final implementation strategy should consolidate those source repos into a clean monorepo, demote unfinished services to `_archive/planned-services/`, position scanner execution as local-lab only by default, and present Azure as a safe cloud-demo mode with seeded data where active scanning is unsafe.

## Current Base Repo

### What Exists

- `README.md`: Describes a "Cloud Security Platform" with seven microservices, a React UI, AWS integrations, live dashboards, scanning, incident response, and compliance.
- `docker-compose.yml`: Attempts to run Traefik, PostgreSQL, Redis, auth, scanner, network analyzer, orchestrator, threat intel, alert correlation, compliance, ZAP, and UI.
- `.gitmodules`: Points `vulnerability-scanner`, `network-traffic-analyzer`, `security-assessment-orchestrator`, and `security-platform-ui` to external repos.
- `shared-security-core/`: Shared Python package with JWT, RBAC dependencies, SQLAlchemy base/mixins, logging, and AWS helper modules.
- `auth-service/`: Python FastAPI auth service with users, roles, permissions, sessions, audit logs, migrations, and a Dockerfile.
- `threat-intel-service/`: Python FastAPI service with CVE, MITRE, indicators, enrichment routes, Celery files, and migrations.
- `alert-correlation-service/`: Python FastAPI service with alerts and incidents routes, models, and migrations.
- `compliance-service/`: Python FastAPI service with framework/control/report models and basic routes.
- `traefik/`: Static Traefik config routing `/api/*` paths to services.
- `scripts/postgres-init.sql`: Creates databases for all listed services.
- `.github/workflows/`: Not present.

The submodule directories for `vulnerability-scanner`, `network-traffic-analyzer`, `security-assessment-orchestrator`, and `security-platform-ui` are empty in the working tree.

### What Is Actually Implemented

- Auth service:
  - JWT login, refresh, logout, `/auth/me`, profile update, password update, user registration.
  - RBAC through `shared-security-core`.
  - PostgreSQL models and Alembic migration for users, roles, permissions, sessions, and audit logs.
  - Audit logging for auth/profile/user actions.
- Shared core:
  - JWT creation/verification using HS256.
  - Permission checks and FastAPI dependencies.
  - Logging setup and AWS helper modules.
- Threat-intel:
  - Basic CVE lookup/cache logic against NVD, routes for CVE/MITRE/indicators/enrichment, and Celery scaffolding.
  - This is not needed for the third flagship project and should be treated as planned/archive.
- Alert-correlation:
  - Basic CRUD-like alert and incident APIs.
  - Correlation behavior is mostly planned; route comments include TODOs.
- Compliance:
  - Basic framework/control/report models and read routes.
  - No complete reporting engine or certification basis.
- Traefik:
  - Path routing only. It is not a hardened API gateway and does not provide application-layer JWT/RBAC controls.

### What Is Overclaimed

- `README.md` uses overstated enterprise and live threat-intelligence language; this is not defensible for a portfolio lab.
- The README lists a unified React UI, vulnerability scanner, network analyzer, and orchestrator as active, but those paths are empty submodule placeholders in the base repo.
- The README claims automated compliance reporting, Security Hub publishing, ECS scanning, full incident correlation, and live dashboards beyond what is implemented.
- The root Compose file attempts to run inactive/planned services and empty submodule paths.
- Traefik is labelled as the API gateway, but it is only a reverse proxy. The secure gateway patterns are in the separate TypeScript source repo.
- Default secrets such as `JWT_SECRET=dev-jwt-secret-change-in-production`, `AUTH_TOKEN=dev-token`, and `postgres:postgres` are acceptable only if clearly marked local-only.

### Duplicated Functionality

- Auth/RBAC exists in both base Python auth service/shared core and the TypeScript secure gateway source.
- Audit logging exists in the Python auth service and the TypeScript gateway source.
- Service routing exists in Traefik, while application-layer proxy and SSRF-aware logic exists in the TypeScript gateway.
- Scanner/network/orchestrator service concepts are described in the base repo and implemented in source repos.
- PostgreSQL/Celery/Redis scaffolding is duplicated across Python services.

### Current Build/Test Status

- Base repo `git status --short --branch`: branch `refactor/defensive-security-platform-lab`; no tracked changes before audit creation.
- `.github/workflows/`: absent.
- Root `docker-compose.yml`: references empty submodule paths and an absent UI implementation; expected to fail as a full stack until services are migrated.
- Auth/shared/planned Python services: not fully validated during audit because dependency manifests use container-only direct references such as `shared-security-core @ file:///app/shared-security-core`.
- Source validation probes are listed in each repo section below.

### Known Security Risks

- Root README contains unsafe positioning claims.
- Local-only secrets are present in Compose and README and must be clearly scoped.
- Python shared JWT handler defaults to a weak fallback secret if `JWT_SECRET` is not set.
- Python auth refresh tokens are JWTs but are not rotated with reuse detection in the base auth service.
- Root Compose exposes multiple backend services directly on host ports.
- ZAP is exposed on `8090` with `api.disablekey=true`.
- Network analyzer uses host networking and packet capture capabilities in the root Compose.
- Traefik dashboard is configured as insecure.
- CORS defaults are broad in several services.

## Source Repo: secure-api-gateway

Path: `../_sources/secure-api-gateway`

### What Exists

- TypeScript/Fastify API gateway.
- `package.json`, `package-lock.json`, Dockerfiles, Compose, docs, OpenAPI file, tests, scripts, mock service, and a dashboard.
- Modules for auth, audit, proxy, reports, admin/security dashboard data, ingestion adapters, metrics, validation, rate limiting, security headers, request IDs, and logging.

### What Is Actually Implemented

- JWT access tokens and refresh tokens.
- Refresh token storage in Redis.
- Refresh token rotation and blacklist support.
- Token hash verification and a token-family revocation API.
- RBAC helpers and protected routes.
- Route and global rate limiting.
- Zod request validation.
- Security headers through Fastify plugins/middleware.
- Request IDs and structured logging with redaction intent.
- Audit service and audit routes.
- SSRF-aware proxy concept through an HTTP client/upstream allowlist.
- OpenAPI/Swagger setup and health/readiness endpoints.
- Local demo users in an in-memory user store.

### What Is Overclaimed

- README and package description use overstated production and enterprise wording; these must be removed for the portfolio lab.
- Some documented production checklist items are not implemented operational controls.
- Circuit breaker behavior is described as "ready for implementation" and should remain planned if not implemented.

### What Is Duplicated

- Auth, RBAC, audit, and gateway routing overlap with the base Python auth service plus Traefik.
- Dashboard assets overlap with the requested reviewer UI but are not a fit for this project because they imply a broader operational product.

### What Should Be Migrated

- Fastify application structure where useful.
- Auth routes and service logic, after fixing issues.
- Refresh token rotation/reuse detection concept.
- Token store, RBAC, validation, rate limiting, security headers, request ID, safe error handling, audit logging.
- SSRF-safe proxy pattern and allowlisted upstream validation.
- Relevant tests, rewritten to pass in the monorepo.

### What Should Be Ignored

- Marketing-heavy README language.
- Broad admin dashboard modules not needed for the defensive lab story.
- Cloud provider ingestion adapters unless referenced only as planned/archive.
- Existing dashboard UI as the primary reviewer UI.

### What Should Be Labelled Planned

- Circuit breakers, distributed tracing, response caching, MFA, GraphQL gateway, WebSocket proxy.

### Build/Test Status

Commands run:

- `npm ci`: passed, but npm audit reported 18 vulnerabilities: 8 moderate, 9 high, 1 critical.
- `npm run build`: failed.
- `npm run typecheck`: failed.
- `npm test -- --runInBand`: failed on Windows because `NODE_ENV=test` is not valid in PowerShell.
- `$env:NODE_ENV='test'; npx jest --runInBand`: failed before running tests because Jest could not resolve `.js` imports from TypeScript sources.

Primary build error:

- `src/modules/admin/admin.routes.ts` around lines 874-875 has malformed route registration syntax.

### Known Security Risks

- Demo users are in-memory and seeded with known local credentials.
- Redis is required for token behavior; tests assume Redis but do not isolate it cleanly.
- Existing CORS configuration allows all origins in the app source.
- Token family support exists in the store but must be verified in the service flow after migration.
- Tests need reliable Redis/in-memory behavior and should not depend on external services.

## Source Repo: vulnerability-scanner

Path: `../_sources/vulnerability-scanner`

### What Exists

- FastAPI scanner service with SQLAlchemy models, Alembic migrations, PostgreSQL, Celery, Redis, ZAP client, Dockerfile, Compose, tests, and bootstrap script.
- Endpoints for health, scan create/list/get/findings.

### What Is Actually Implemented

- `POST /scans`, `GET /scans`, `GET /scans/{id}`, `GET /scans/{id}/findings`.
- Target URL allowlist validation for http/https hosts and IP/CIDR entries.
- JWT/RBAC dependencies imported from shared security core.
- Celery task that runs ZAP spider, active scan, and maps ZAP alerts to findings.
- PostgreSQL persistence for scans and findings.
- Request ID middleware, structured logging, and consistent error responses.

### What Is Overclaimed

- `pyproject.toml` uses overstated readiness wording; this must be changed.
- README is mostly defensible but should explicitly separate local-lab scanning from cloud-demo sample import.

### What Is Duplicated

- Shared security dependency and service scaffolding are duplicated with other Python services.
- Compose duplicates Postgres/Redis rather than using the root/local lab stack.

### What Should Be Migrated

- FastAPI route structure, models, migrations, ZAP client, Celery worker/task, allowlist validation, findings mapping.
- Health endpoints.
- Tests should be expanded for allowlist behavior, sample ZAP mapping, cloud-demo import, and findings retrieval.

### What Should Be Ignored

- Broken standalone Compose file.
- Any default allowlist entry that permits public targets such as `example.com`.

### What Should Be Labelled Planned

- Production cloud scanning and scheduled scanner fleet behavior.

### Build/Test Status

Commands run:

- `python -m pytest`: failed because `pytest` is not installed in the current Python environment.
- `python -m pip install -e ".[dev]"`: failed because the package depends on `shared-security-core @ file:///app/shared-security-core`, which does not exist on the host.
- `docker compose config`: failed with `services must be a mapping`; the source Compose file is malformed.

### Known Security Risks

- ZAP active scan should be local-lab only unless explicitly allowlisted.
- No scan timeout in the current task loop.
- ZAP API key is not used in the source Compose.
- Allowlist accepts subdomains of allowlisted domains; this is acceptable for lab targets but must be documented.
- Tokens should not be logged; verify structured logs after migration.

## Source Repo: network-traffic-analyzer

Path: `../_sources/network-traffic-analyzer`

### What Exists

- FastAPI service with SQLAlchemy models, Alembic migrations, PostgreSQL, tshark capture service, Dockerfile, Compose, tests, and bootstrap script.
- Endpoints for health, stats, flows, anomalies, capture start, and capture stop.

### What Is Actually Implemented

- `GET /monitoring/stats`, `GET /monitoring/flows`, `GET /monitoring/anomalies`, `POST /monitoring/capture/start`, `POST /monitoring/capture/stop`.
- Bearer token auth dependency.
- `tshark -T ek` subprocess runner with JSON parsing into packet summaries.
- Flow aggregation and simple traffic-spike anomaly persistence.
- PostgreSQL persistence for flows and anomalies.
- Request ID middleware and error handlers.

### What Is Overclaimed

- `pyproject.toml` uses overstated readiness wording.
- API description says "Real-time network traffic monitoring and anomaly detection"; for this project it should be positioned as a local telemetry lab with demo anomaly detection.

### What Is Duplicated

- FastAPI/logging/database scaffolding overlaps with other services.

### What Should Be Migrated

- Models, endpoints, tshark parser/capture wrapper, flow/anomaly logic.
- Add deterministic sample telemetry import and parser tests.

### What Should Be Ignored

- Broken standalone Compose file.
- Any production NDR positioning.

### What Should Be Labelled Planned

- Production network detection/response, distributed sensors, cloud packet capture.

### Build/Test Status

Commands run:

- `python -m pytest`: failed because `pytest` is not installed.
- `python -m pip install -e ".[dev]"`: timed out during dependency installation in this environment; dependency manifest also includes the container-only shared core path.
- `docker compose config`: failed with `services must be a mapping`; the source Compose file is malformed.

### Known Security Risks

- Capture requires host privileges or container capabilities.
- The current capture runner starts subprocesses without explicit timeout/kill handling beyond stop/terminate.
- Running tshark in cloud-demo is inappropriate; cloud mode should use seeded telemetry.

## Source Repo: security-assessment-orchestrator

Path: `../_sources/security-assessment-orchestrator`

### What Exists

- FastAPI service with SQLAlchemy models, Alembic migrations, PostgreSQL, Celery, Redis, runners for Nmap/ZAP/Trivy, Dockerfile, Compose, tests, and bootstrap script.
- Endpoints for health, assessment create/list/get/artifacts.

### What Is Actually Implemented

- `POST /assessments`, `GET /assessments`, `GET /assessments/{id}`, `GET /assessments/{id}/artifacts`.
- Target allowlist validation for host, IP, CIDR, or URL host.
- Celery task for lifecycle transitions and artifact persistence.
- Nmap command construction with an argument list and `shell=False` default behavior through `subprocess.run`.
- ZAP JSON API scan runner.
- Optional Trivy image runner.
- PostgreSQL persistence for assessments and artifacts.

### What Is Overclaimed

- `pyproject.toml` uses overstated readiness wording.
- Runners need timeouts and stricter mode gating before being presented as robust.

### What Is Duplicated

- ZAP behavior overlaps with the vulnerability scanner service.
- Shared scaffolding overlaps with the other FastAPI services.

### What Should Be Migrated

- Assessment lifecycle model, artifact model, allowlist validation, Nmap/ZAP/Trivy runner concepts, and Celery worker.
- Add safe subprocess timeouts, no `shell=True`, cloud-demo sample import, and parser tests.

### What Should Be Ignored

- Broken standalone Compose file.
- Any exploitation framing.

### What Should Be Labelled Planned

- Production cloud scanning, broad target scanning, Kubernetes deployment, automated remediation.

### Build/Test Status

Commands run:

- `python -m pytest`: failed because `pytest` is not installed.
- `python -m pip install -e ".[dev]"`: failed because the package depends on `shared-security-core @ file:///app/shared-security-core`, which does not exist on the host.
- `docker compose config`: failed with `services must be a mapping`; the source Compose file is malformed.

### Known Security Risks

- Nmap runner needs explicit timeout and safe target mode controls.
- ZAP loops need timeout bounds.
- Trivy image refs should be validated if exposed to users.
- Cloud-demo must not run active network tools by default.

## What Should Be Migrated

- Consolidate into a monorepo:
  - `apps/gateway`
  - `apps/vulnerability-scanner`
  - `apps/network-analyzer`
  - `apps/assessment-orchestrator`
  - `apps/reviewer-ui`
  - `packages/shared-security-core`
  - `packages/contracts`
  - `infra/local`
  - `infra/azure/terraform`
- Use the TypeScript gateway as the public front door and demote Traefik to optional local routing if useful.
- Use the source scanner/network/orchestrator as the active Python services after fixing packaging, Compose, tests, demo mode, and safety controls.
- Keep PostgreSQL, Redis, Celery, ZAP as local lab components.
- Create a new reviewer UI instead of migrating the old gateway dashboard.
- Build evidence automation and docs around defensible claims.

## What Should Be Ignored or Archived

- Archive current `threat-intel-service`, `alert-correlation-service`, and `compliance-service` as planned services unless a narrow stub is needed for documentation.
- Ignore the broken standalone Compose files in the source Python repos.
- Ignore production/enterprise wording from source READMEs.
- Do not migrate AWS Security Hub, CloudWatch, broad CVE enrichment, compliance reporting, or incident response into the active service set for this flagship project.

## What Should Be Labelled Planned

- Production cloud scanning.
- Kubernetes deployment.
- Full alert correlation.
- Full compliance engine.
- Live AWS Security Hub integration.
- Production SOC workflows.
- MFA, distributed tracing, circuit breakers, response caching.

## Final Implementation Strategy

1. Reposition the project as "Defensive Security Platform Lab" with explicit real/demo/planned boundaries.
2. Create a clean monorepo layout and move unfinished services to `_archive/planned-services/`.
3. Migrate the gateway into `apps/gateway`, fixing TypeScript syntax/test issues and tailoring routes to scanner, network, and assessment services.
4. Migrate scanner, network analyzer, and orchestrator into `apps/`, fixing packaging paths, invalid Compose files, tests, local-vs-cloud modes, and safety controls.
5. Build a polished `apps/reviewer-ui` focused on reviewer comprehension, architecture, evidence, and honest limitations.
6. Add `infra/local/docker-compose.yml` with only active services plus PostgreSQL, Redis, ZAP, and optional Traefik/reviewer UI.
7. Add Azure Terraform as cloud-demo architecture: Static Web Apps, Container Apps, ACR, Log Analytics, only gateway external ingress, internal services private.
8. Add CI/CD workflows for build/test/security validation and evidence generation.
9. Add threat model, security docs, ADRs, and final implementation report.
10. Validate everything possible locally and record failures honestly.
