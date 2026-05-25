# Contracts

Shared API and evidence contract notes for the Defensive Security Platform Lab.

The active services expose OpenAPI through FastAPI/Fastify runtime docs. This package records cross-service concepts used by the reviewer UI and evidence docs:

- scan status: `queued`, `running`, `completed`, `failed`
- assessment status: `queued`, `running`, `completed`, `failed`
- artifact kind: `nmap`, `zap`, `trivy`
- network anomaly kind: `traffic_spike`
- evidence mode: `real`, `local-lab`, `cloud-demo`, `planned`
