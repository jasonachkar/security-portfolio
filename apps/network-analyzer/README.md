# Network Analyzer

Local network telemetry and anomaly lab backed by FastAPI, PostgreSQL, and optional tshark capture.

## Guardrails

- tshark capture is local-only and requires host/container permissions.
- Cloud-demo mode uses seeded telemetry.
- This service is not presented as production NDR.

## Endpoints

- `GET /monitoring/stats`
- `GET /monitoring/flows`
- `GET /monitoring/anomalies`
- `POST /monitoring/capture/start`
- `POST /monitoring/capture/stop`
- `POST /monitoring/demo/import`
- `GET /healthz`
- `GET /readyz`
