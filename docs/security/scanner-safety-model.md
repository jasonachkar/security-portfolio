# Scanner Safety Model

Scanner execution is defensive and allowlisted.

## Local Lab

- ZAP scans run against local/demo targets only.
- Nmap discovery runs against allowlisted local/demo hosts only.
- Trivy image scanning is optional.
- Tool execution has timeouts.
- Findings and artifacts are persisted for review.

## Cloud-Demo

- Cloud-demo defaults to seeded sample findings and artifacts.
- Live internet scanning is disabled unless explicitly configured with an allowlist.
- The cloud-demo is intended to show architecture and reviewer workflows, not broad scanning.

## Prohibited Use

- No arbitrary public target scanning.
- No exploitation.
- No credential attacks.
- No scanning outside authorization.
