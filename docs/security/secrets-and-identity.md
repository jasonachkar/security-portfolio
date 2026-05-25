# Secrets And Identity

## Local

- Local Compose values are demo-only and must not be reused elsewhere.
- `.env` files are ignored.
- Tokens are not written to logs or committed evidence.

## CI/CD

- GitHub Actions uses minimal permissions.
- Azure deployment uses OIDC with `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID`.
- No long-lived Azure client secret is required.

## Azure

- Terraform generates a demo JWT value for Container Apps.
- Future hardening can move runtime secrets to Key Vault with managed identity references.
- Terraform state must not be committed or published.
