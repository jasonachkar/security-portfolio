from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass

import httpx

from security_assessment_orchestrator.infra.settings import Settings


@dataclass(frozen=True)
class ToolResult:
    kind: str
    content_type: str
    content: str


def build_nmap_command(target: str) -> list[str]:
    """Build a defensive service-discovery command without shell interpolation."""
    return ["nmap", "-sV", "-T3", "--reason", target]


def run_nmap(target: str) -> ToolResult:
    settings = Settings()
    proc = subprocess.run(
        build_nmap_command(target),
        capture_output=True,
        text=True,
        check=False,
        timeout=settings.subprocess_timeout_seconds,
    )
    output = f"{proc.stdout}\n{proc.stderr}".strip()
    return ToolResult(kind="nmap", content_type="text/plain", content=output)


def run_zap_quick_scan(target_url: str) -> ToolResult:
    settings = Settings()
    base = settings.zap_base_url.rstrip("/")
    deadline = time.monotonic() + settings.subprocess_timeout_seconds

    def ensure_time() -> None:
        if time.monotonic() > deadline:
            raise TimeoutError("ZAP assessment timed out")

    with httpx.Client(timeout=30.0) as client:
        spider = client.get(f"{base}/JSON/spider/action/scan/", params={"url": target_url})
        spider.raise_for_status()
        spider_id = spider.json()["scan"]

        while True:
            ensure_time()
            status = client.get(f"{base}/JSON/spider/view/status/", params={"scanId": spider_id})
            status.raise_for_status()
            if int(status.json()["status"]) >= 100:
                break
            time.sleep(2)

        active_scan = client.get(f"{base}/JSON/ascan/action/scan/", params={"url": target_url})
        active_scan.raise_for_status()
        active_scan_id = active_scan.json()["scan"]

        while True:
            ensure_time()
            status = client.get(f"{base}/JSON/ascan/view/status/", params={"scanId": active_scan_id})
            status.raise_for_status()
            if int(status.json()["status"]) >= 100:
                break
            time.sleep(5)

        alerts = client.get(f"{base}/JSON/core/view/alerts/", params={"baseurl": target_url})
        alerts.raise_for_status()
        return ToolResult(kind="zap", content_type="application/json", content=alerts.text)


def run_trivy_image(image_ref: str) -> ToolResult:
    settings = Settings()
    proc = subprocess.run(
        ["trivy", "image", "--format", "json", image_ref],
        capture_output=True,
        text=True,
        check=False,
        timeout=settings.subprocess_timeout_seconds,
    )
    output = proc.stdout if proc.stdout else proc.stderr
    return ToolResult(kind="trivy", content_type="application/json", content=output.strip())
