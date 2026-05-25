from __future__ import annotations

import json
import re
from typing import Any


def parse_nmap_open_ports(output: str) -> list[dict[str, str]]:
    ports: list[dict[str, str]] = []
    pattern = re.compile(r"^(?P<port>\d+/(?:tcp|udp))\s+open\s+(?P<service>\S+)(?:\s+(?P<version>.*))?$")
    for line in output.splitlines():
        match = pattern.match(line.strip())
        if match:
            ports.append(
                {
                    "port": match.group("port"),
                    "service": match.group("service"),
                    "version": (match.group("version") or "").strip(),
                }
            )
    return ports


def parse_zap_alerts(content: str) -> list[dict[str, Any]]:
    data = json.loads(content)
    return [
        {
            "name": alert.get("alert", ""),
            "risk": alert.get("risk", ""),
            "confidence": alert.get("confidence", ""),
        }
        for alert in data.get("alerts", [])
    ]


def parse_trivy_vulnerabilities(content: str) -> list[dict[str, Any]]:
    data = json.loads(content)
    vulnerabilities: list[dict[str, Any]] = []
    for result in data.get("Results", []):
        vulnerabilities.extend(result.get("Vulnerabilities") or [])
    return vulnerabilities
