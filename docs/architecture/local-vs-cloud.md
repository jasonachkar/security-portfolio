# Local Vs Cloud

## Local Full-Tool Lab

Local mode is where active security tools run:

- ZAP active scans.
- Nmap service discovery.
- Optional Trivy image scans.
- Optional tshark packet capture.

Local mode is allowlisted and intended for demo targets.

## Azure Cloud-Demo

Cloud-demo mode shows a safe Azure architecture:

- Static Web Apps reviewer UI.
- External gateway Container App.
- Internal service Container Apps.
- ACR image storage.
- Log Analytics logging.
- OIDC deployment.

Cloud-demo mode uses seeded scanner and network data unless explicit allowlisting is configured.
