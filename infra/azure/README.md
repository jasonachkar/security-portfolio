# Azure Cloud-Demo Deployment

This folder contains Terraform for a safe cloud-demo architecture.

Key properties:

- Only the gateway Container App has external ingress.
- Scanner, network analyzer, and assessment orchestrator Container Apps use internal ingress.
- Cloud-demo services default to sample/demo mode.
- Active ZAP, Nmap, Trivy, and tshark execution remains local-lab by default.
- Logs are connected to Log Analytics.
- Images are expected to be built through GitHub Actions and stored in Azure Container Registry.
- GitHub Actions should authenticate to Azure with OIDC.

## Validate

```bash
terraform -chdir=infra/azure/terraform/environments/dev init -backend=false
terraform -chdir=infra/azure/terraform/environments/dev validate
```

## Deploy

```bash
terraform -chdir=infra/azure/terraform/environments/dev apply
```

Terraform generates a demo JWT secret with the Random provider. The default container images are placeholders for validation. The deploy workflow replaces them with ACR image references.
