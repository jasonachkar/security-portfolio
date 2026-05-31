from __future__ import annotations

import json
import subprocess
import threading
import time
from dataclasses import dataclass
from typing import Any

import structlog
from sqlalchemy import select

from network_analyzer.infra.db.models import Flow, Anomaly
from network_analyzer.infra.db.session import get_session_factory
from network_analyzer.infra.settings import Settings

log = structlog.get_logger()


@dataclass(frozen=True)
class PacketSummary:
    src_ip: str
    dst_ip: str
    protocol: str
    dst_port: int | None
    length: int


class TsharkCapture:
    """Runs tshark and streams JSON packets, aggregating into flows."""

    def __init__(self) -> None:
        self._settings = Settings()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="tshark-capture", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self) -> None:
        iface = self._settings.capture_interface
        bpf = self._settings.capture_bpf.strip()
        cmd = ["tshark", "-i", iface, "-T", "ek"]  # Elasticsearch/Kibana JSON
        if bpf:
            cmd += ["-f", bpf]

        log.info("capture_starting", iface=iface, bpf=bpf)

        # NOTE: capturing on host interfaces from Docker requires special permissions.
        # For local demos: run on host python (no docker) or use `--network host` on Linux.
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        session_factory = get_session_factory()
        last_emit = time.time()
        bytes_per_src: dict[str, int] = {}

        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                if self._stop.is_set():
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue

                pkt = self._parse_packet(obj)
                if pkt is None:
                    continue

                # aggregate flow
                with session_factory() as db:
                    flow = db.scalar(
                        select(Flow).where(
                            Flow.src_ip == pkt.src_ip,
                            Flow.dst_ip == pkt.dst_ip,
                            Flow.protocol == pkt.protocol,
                            Flow.dst_port == pkt.dst_port,
                        )
                    )
                    if flow is None:
                        flow = Flow(
                            src_ip=pkt.src_ip,
                            dst_ip=pkt.dst_ip,
                            protocol=pkt.protocol,
                            dst_port=pkt.dst_port,
                            packets=0,
                            bytes=0,
                        )
                        db.add(flow)
                        db.flush()

                    flow.packets += 1
                    flow.bytes += pkt.length
                    flow.last_seen = flow.last_seen  # SQLAlchemy will update on commit
                    db.add(flow)
                    db.commit()

                bytes_per_src[pkt.src_ip] = bytes_per_src.get(pkt.src_ip, 0) + pkt.length

                # simple anomaly: spike in bytes per source over rolling window
                now = time.time()
                if now - last_emit >= 10:
                    for ip, total in list(bytes_per_src.items()):
                        if total > 5_000_000:  # 5MB / 10s demo threshold
                            with session_factory() as db:
                                db.add(
                                    Anomaly(
                                        kind="traffic_spike",
                                        severity="high",
                                        summary=f"High outbound traffic from {ip}",
                                        details=f"Observed ~{total} bytes in 10s window",
                                        src_ip=ip,
                                        score=float(total),
                                    )
                                )
                                db.commit()
                            log.warning("anomaly_spike", src_ip=ip, bytes=total)
                    bytes_per_src.clear()
                    last_emit = now
        finally:
            proc.terminate()
            log.info("capture_stopped")

    def _parse_packet(self, obj: dict[str, Any]) -> PacketSummary | None:
        # tshark -T ek structure varies; best-effort extraction.
        layers = None
        try:
            layers = obj["layers"]
        except Exception:
            return None

        src_ip = layers.get("ip", {}).get("ip_ip_src") or layers.get("ipv6", {}).get("ipv6_ipv6_src")
        dst_ip = layers.get("ip", {}).get("ip_ip_dst") or layers.get("ipv6", {}).get("ipv6_ipv6_dst")
        if not src_ip or not dst_ip:
            return None

        # protocol and port
        protocol = "tcp" if "tcp" in layers else ("udp" if "udp" in layers else "other")
        dst_port = None
        if protocol == "tcp":
            dst_port = layers.get("tcp", {}).get("tcp_tcp_dstport")
        elif protocol == "udp":
            dst_port = layers.get("udp", {}).get("udp_udp_dstport")
        try:
            dst_port_int = int(dst_port) if dst_port is not None else None
        except Exception:
            dst_port_int = None

        length = 0
        try:
            length = int(layers.get("frame", {}).get("frame_frame_len", 0))
        except Exception:
            length = 0

        return PacketSummary(
            src_ip=str(src_ip),
            dst_ip=str(dst_ip),
            protocol=protocol,
            dst_port=dst_port_int,
            length=length,
        )
