from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from network_analyzer.infra.db.models import Flow, Anomaly
from network_analyzer.infra.db.session import get_session_factory
from network_analyzer.infra.security.auth import require_bearer_token
from network_analyzer.infra.settings import Settings
from network_analyzer.services.capture import TsharkCapture

router = APIRouter(dependencies=[Depends(require_bearer_token)])

_capture = TsharkCapture()


class MonitoringStatsResponse(BaseModel):
    """Aggregate statistics for monitoring dashboard"""
    total_flows: int
    total_anomalies: int
    recent_anomalies: int  # Last 24 hours
    total_bytes: int
    total_packets: int
    unique_source_ips: int
    unique_dest_ips: int


def _db() -> Session:
    return get_session_factory()()


@router.get("/stats", response_model=MonitoringStatsResponse)
def get_stats() -> MonitoringStatsResponse:
    """Get aggregate monitoring statistics for dashboard"""
    import datetime as dt

    db = _db()
    try:
        # Total flows
        total_flows = db.scalar(select(func.count()).select_from(Flow)) or 0

        # Total anomalies
        total_anomalies = db.scalar(select(func.count()).select_from(Anomaly)) or 0

        # Recent anomalies (last 24 hours)
        twenty_four_hours_ago = dt.datetime.utcnow() - dt.timedelta(hours=24)
        recent_anomalies = db.scalar(
            select(func.count())
            .select_from(Anomaly)
            .where(Anomaly.created_at >= twenty_four_hours_ago)
        ) or 0

        # Sum of bytes and packets
        totals = db.execute(
            select(
                func.coalesce(func.sum(Flow.bytes), 0).label('total_bytes'),
                func.coalesce(func.sum(Flow.packets), 0).label('total_packets')
            )
        ).first()
        total_bytes = int(totals.total_bytes) if totals else 0
        total_packets = int(totals.total_packets) if totals else 0

        # Unique IPs
        unique_source_ips = db.scalar(select(func.count(func.distinct(Flow.src_ip)))) or 0
        unique_dest_ips = db.scalar(select(func.count(func.distinct(Flow.dst_ip)))) or 0

        return MonitoringStatsResponse(
            total_flows=total_flows,
            total_anomalies=total_anomalies,
            recent_anomalies=recent_anomalies,
            total_bytes=total_bytes,
            total_packets=total_packets,
            unique_source_ips=unique_source_ips,
            unique_dest_ips=unique_dest_ips,
        )
    finally:
        db.close()


@router.post("/capture/start")
def start_capture() -> dict[str, str]:
    if Settings().cloud_demo_mode:
        return {"status": "demo-mode", "message": "packet capture disabled in cloud-demo mode"}
    _capture.start()
    return {"status": "started"}


@router.post("/capture/stop")
def stop_capture() -> dict[str, str]:
    _capture.stop()
    return {"status": "stopped"}


@router.post("/demo/import")
def import_demo_telemetry() -> dict[str, int]:
    """Import deterministic sample flows and anomalies for reviewer/cloud-demo mode."""
    import datetime as dt

    db = _db()
    try:
        flows = [
            Flow(
                src_ip="10.10.0.10",
                dst_ip="10.10.0.20",
                protocol="tcp",
                dst_port=443,
                packets=42,
                bytes=84_000,
                first_seen=dt.datetime.utcnow(),
                last_seen=dt.datetime.utcnow(),
            ),
            Flow(
                src_ip="10.10.0.15",
                dst_ip="10.10.0.50",
                protocol="tcp",
                dst_port=8080,
                packets=900,
                bytes=7_500_000,
                first_seen=dt.datetime.utcnow(),
                last_seen=dt.datetime.utcnow(),
            ),
        ]
        anomaly = Anomaly(
            kind="traffic_spike",
            severity="high",
            summary="High outbound traffic from 10.10.0.15",
            details="Seeded cloud-demo anomaly based on deterministic sample telemetry.",
            src_ip="10.10.0.15",
            dst_ip="10.10.0.50",
            dst_port=8080,
            score=7_500_000.0,
        )
        db.add_all(flows + [anomaly])
        db.commit()
        return {"flows": len(flows), "anomalies": 1}
    finally:
        db.close()


@router.get("/flows")
def list_flows(limit: int = 200) -> list[dict]:
    db = _db()
    try:
        rows = db.scalars(select(Flow).order_by(Flow.last_seen.desc()).limit(limit)).all()
        return [
            {
                "id": r.id,
                "src_ip": r.src_ip,
                "dst_ip": r.dst_ip,
                "protocol": r.protocol,
                "dst_port": r.dst_port,
                "packets": r.packets,
                "bytes": r.bytes,
                "first_seen": r.first_seen,
                "last_seen": r.last_seen,
            }
            for r in rows
        ]
    finally:
        db.close()


@router.get("/anomalies")
def list_anomalies(limit: int = 200) -> list[dict]:
    db = _db()
    try:
        rows = db.scalars(select(Anomaly).order_by(Anomaly.created_at.desc()).limit(limit)).all()
        return [
            {
                "id": r.id,
                "created_at": r.created_at,
                "kind": r.kind,
                "severity": r.severity,
                "summary": r.summary,
                "details": r.details,
                "src_ip": r.src_ip,
                "dst_ip": r.dst_ip,
                "dst_port": r.dst_port,
                "score": r.score,
            }
            for r in rows
        ]
    finally:
        db.close()
