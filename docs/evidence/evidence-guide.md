# Evidence Guide

This project uses evidence to support portfolio claims without implying a live production platform.

## Generated Automatically

- Reviewer UI screenshots from `apps/reviewer-ui/scripts/generate-screenshots.ts`.
- Gateway build, typecheck, and test output from CI.
- Python service pytest and ruff output from CI on Python 3.12.
- Docker Compose config validation for `infra/local/docker-compose.yml`.
- Terraform fmt/validate/plan output for `infra/azure/terraform/environments/dev`.
- Local API smoke outputs written by `scripts/smoke-test-local.sh`.
- Demo scan, network, and assessment outputs written by `scripts/seed-demo-data.sh`.

## Manual Azure Evidence

Capture screenshots after a real cloud-demo deploy:

- Resource group overview.
- Container Apps list showing only gateway external ingress.
- Gateway Container App ingress blade.
- Internal service ingress blades.
- Static Web App overview.
- Log Analytics workspace overview.
- GitHub Actions OIDC run summary.

## Redaction Rules

- Blur subscription IDs, tenant IDs, public IPs if not intended for publication, user email addresses, deployment tokens, registry credentials, and any log lines containing bearer tokens.
- Do not publish Terraform state.
- Do not publish `.env` files.

## Claim Mapping

| Claim | Evidence |
| --- | --- |
| Gateway auth and refresh reuse detection | `apps/gateway/test/gateway.test.ts` and CI output |
| Allowlisted scanner behavior | `apps/vulnerability-scanner/tests/test_scans.py` |
| Network telemetry demo mode | `apps/network-analyzer/tests/test_monitoring.py` |
| Assessment artifact pipeline | `apps/assessment-orchestrator/tests/test_assessments.py` |
| Local lab wiring | `infra/local/docker-compose.yml` and Compose config output |
| Azure cloud-demo architecture | Terraform plan and Azure screenshots |
| Reviewer UI quality | Playwright report and screenshots |
