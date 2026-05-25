# Azure Cloud-Demo Deployment

## Prerequisites

- Azure subscription.
- GitHub environment configured for OIDC.
- Terraform 1.6 or newer.
- Docker images pushed to ACR.

## Flow

1. Run Terraform fmt and validate.
2. Build service images.
3. Push images to ACR.
4. Apply Terraform with image variables.
5. Deploy reviewer UI to Static Web Apps.
6. Run post-deploy smoke checks.
7. Capture Azure evidence screenshots and redact identifiers.

## Ingress Model

The gateway is external. Scanner, network analyzer, and assessment orchestrator are internal only.
