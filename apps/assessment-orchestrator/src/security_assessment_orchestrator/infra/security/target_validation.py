from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

from fastapi import HTTPException, status

from security_assessment_orchestrator.infra.settings import Settings


def _is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


def validate_target(target: str) -> None:
    """Allowlist guardrail for assessments (URL or hostname/IP)."""
    settings = Settings()
    allowed = settings.allowed_targets_list()

    # Accept hostname/IP or URL
    host = target
    parsed = urlparse(target)
    if parsed.scheme in ("http", "https") and parsed.hostname:
        host = parsed.hostname

    host = host.lower()

    if _is_ip(host):
        ip = ipaddress.ip_address(host)
        for entry in allowed:
            entry = entry.strip().lower()
            try:
                net = ipaddress.ip_network(entry, strict=False)
                if ip in net:
                    return
            except ValueError:
                if entry == host:
                    return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Target is not allowlisted")

    for entry in allowed:
        entry = entry.strip().lower()
        if not entry:
            continue
        if entry == host:
            return
        if host.endswith("." + entry):
            return

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Target is not allowlisted")
