# Assessment Orchestrator

Defensive assessment coordinator for allowlisted Nmap, ZAP, and optional Trivy jobs.

## Guardrails

- No public target scanning by default.
- Targets must be allowlisted.
- Tool execution uses argument arrays and timeouts.
- Cloud-demo mode uses sample artifacts.

## Endpoints

- `POST /assessments`
- `GET /assessments`
- `GET /assessments/{id}`
- `GET /assessments/{id}/artifacts`
- `POST /assessments/demo/import`
- `GET /healthz`
- `GET /readyz`
