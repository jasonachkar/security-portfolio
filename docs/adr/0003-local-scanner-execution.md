# ADR 0003: Scanner Execution Is Local-Only By Default

Status: Accepted

ZAP, Nmap, Trivy, and tshark execution can affect real systems or require elevated permissions. The lab therefore runs active tooling in local allowlisted mode and uses seeded demo data in cloud-demo mode unless a target is explicitly authorized.
