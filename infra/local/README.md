# Local Full-Tool Lab

This Compose stack runs the active Defensive Security Platform Lab services:

- gateway
- vulnerability-scanner
- network-analyzer
- assessment-orchestrator
- PostgreSQL
- Redis
- OWASP ZAP
- optional reviewer UI profile
- optional Traefik profile

Local defaults are intentionally marked local-only. Do not reuse them in shared environments.

## Start

```bash
./scripts/local-up.sh
```

Gateway:

- `http://localhost:3000/healthz`
- `http://localhost:3000/docs`

Reviewer UI:

```bash
docker compose -f infra/local/docker-compose.yml --profile reviewer up --build
```

## Seed Demo Data

```bash
./scripts/seed-demo-data.sh
```

The seed script logs in through the gateway and imports labelled demo scan, network, and assessment data.

## Safety Model

- ZAP is internal to the Compose network and not published to the host.
- Scanner and assessment targets are allowlisted.
- Nmap and ZAP are intended for local/demo targets.
- tshark capture is optional and depends on host/container permissions.
- Cloud-demo mode should use seeded sample data unless an explicit allowlist is configured.

## Known Local Caveats

- First Docker build can be slow because Python dependencies and tshark/Nmap packages are installed.
- tshark packet capture may require Linux host networking or additional capabilities if enabled.
- The Python services create local/demo tables at startup; Alembic files are retained for explicit migration review.
