# Fly.io Phase 2 Demo Services

This repo includes Fly-ready manifests for the optional public demo backends:

- `apps/network-analyzer/fly.toml` for `jason-network-analyzer`
- `apps/vulnerability-scanner/fly.toml` for `jason-vuln-scanner`

These services are optional because the reviewer UI has a labelled replay fallback and the local Docker lab runs without public scanning infrastructure.

## Network Analyzer

```bash
cd apps/network-analyzer
fly apps create jason-network-analyzer
fly postgres create --name jason-network-analyzer-db --region iad --vm-size shared-cpu-1x --volume-size 1
fly postgres attach jason-network-analyzer-db
fly secrets set AUTH_TOKEN=portfolio-demo-token-jason
fly deploy
```

## Vulnerability Scanner

```bash
cd apps/vulnerability-scanner
fly apps create jason-vuln-scanner
fly postgres create --name jason-vuln-db --region iad --vm-size shared-cpu-1x --volume-size 1
fly postgres attach jason-vuln-db
fly redis create --name jason-vuln-redis --region iad
fly redis attach jason-vuln-redis
fly secrets set AUTH_TOKEN=portfolio-demo-token-jason
fly secrets set ALLOWED_TARGETS=http://testphp.vulnweb.com,http://zero.webappsecurity.com
fly deploy
```

## Safety Model

- Scanner targets remain allowlisted.
- Replay data is labelled in the UI when the backend is unreachable.
- Local tshark capture remains a local-lab capability.
- Cloud demo services should default to sample/replay behavior unless explicitly configured for approved targets.
