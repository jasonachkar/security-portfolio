# Platform Threat Model

## Scope

The Defensive Security Platform Lab is a portfolio-grade defensive lab. The active scope is the gateway, scanner, network analyzer, assessment orchestrator, reviewer UI, PostgreSQL, Redis/Celery, local ZAP, and Azure cloud-demo architecture.

## Non-Goals

- Managed monitoring workflows.
- Scanning unmanaged public targets.
- Exploitation automation.
- Compliance certification.

## Trust Boundaries

- Browser to gateway: public boundary.
- Gateway to internal services: private service boundary.
- Internal services to PostgreSQL/Redis/ZAP: local lab boundary.
- GitHub Actions to Azure: federated identity boundary.
- Reviewer UI demo data: labelled demo evidence boundary.

## Key Threats And Controls

| Threat | Control |
| --- | --- |
| Stolen refresh token reuse | Refresh rotation and family revocation |
| Over-broad API access | RBAC and permission denial audit events |
| SSRF through proxy | Fixed upstream registry and host allowlist |
| Unsafe scanner target | Target allowlist and cloud-demo sample mode |
| Token leakage in logs | Structured audit events without token values |
| Public exposure of internal services | Only gateway external ingress in Azure |
| Privileged packet capture misuse | tshark local-only documentation and opt-in capture |
| Long-lived Azure secrets | GitHub Actions OIDC |

## Residual Risk

The lab uses local demo credentials, simplified in-memory gateway user storage, and demo-safe cloud defaults. These are acceptable for a portfolio lab but would need replacement for a shared operational deployment.
