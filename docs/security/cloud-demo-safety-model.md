# Cloud-Demo Safety Model

Azure cloud-demo mode prioritizes safe architecture review.

- Only the gateway Container App has external ingress.
- Scanner, network analyzer, and assessment orchestrator use internal ingress.
- Cloud-demo services run with `APP_ENV=cloud-demo`.
- Network capture is disabled in cloud-demo mode.
- Active Nmap/ZAP/Trivy execution is disabled by default in cloud-demo.
- Demo/sample data is labelled.
- Logs go to Log Analytics.
- GitHub Actions uses OIDC for Azure authentication.

This mode is not presented as a live scanning platform.
