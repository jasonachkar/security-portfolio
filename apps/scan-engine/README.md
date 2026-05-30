# scan-engine

Threat-intelligence + scan-execution API for the portfolio lab.

## What it does

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Liveness check |
| `/api/threats/cves` | GET | Recent CVEs (live NVD feed, bundled sample fallback) |
| `/api/threats/noise` | GET | Noisy IPs (live GreyNoise feed, bundled sample fallback) |
| `/api/threats/host/:ip` | GET | Shodan InternetDB lookup for an IP |
| `/api/infra/validate` | POST | Evaluate a cloud-architecture graph → security findings |
| `/api/infra/terraform` | POST | Render the graph to Terraform HCL |
| `/api/scan/nmap` | POST (SSE) | Nmap port scan against an allow-listed target |
| `/api/scan/trivy` | POST (SSE) | Trivy image vulnerability scan |
| `/api/scan/checkov` | POST (SSE) | Checkov IaC misconfiguration scan |

## Honesty notes (important)

- **Threat feeds** call the real NVD / GreyNoise / Shodan APIs. When the network
  is unavailable, the API returns a curated set of **real, published** CVEs/IPs
  flagged with `"sample": true` so the UI can label it as sample data.
- **Scanners** run the real binaries (`nmap`, `trivy`, `checkov`) when they are
  installed. When a binary is missing, the response is **clearly flagged**
  `"simulated": true` and the SSE stream says so. This is not represented as a
  live scan.
- Nmap targets are restricted to an allow-list (`scanme.nmap.org`). There is no
  scanning of arbitrary hosts.

## Run locally

```bash
npm install
npm run dev          # http://localhost:4000
curl http://localhost:4000/api/health
```

The full scanner toolchain ships in the Docker image (`Dockerfile`).
