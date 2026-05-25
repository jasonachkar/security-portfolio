# ADR 0005: Use GitHub Actions OIDC Instead Of Client Secrets

Status: Accepted

OIDC avoids long-lived Azure client secrets in GitHub. The deployment workflow requests an Azure token at runtime with minimal permissions and `id-token: write` only where needed.
