from __future__ import annotations

from fastapi.testclient import TestClient

from network_analyzer.api.main import app
from network_analyzer.infra.db.base import Base
from network_analyzer.infra.db.session import get_session_factory
from network_analyzer.services.capture import TsharkCapture


AUTH = {"Authorization": "Bearer change-me"}


def reset_db() -> None:
    engine = get_session_factory().kw["bind"]
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_parse_sample_tshark_json() -> None:
    packet = {
        "layers": {
            "ip": {"ip_ip_src": "10.0.0.10", "ip_ip_dst": "10.0.0.20"},
            "tcp": {"tcp_tcp_dstport": "443"},
            "frame": {"frame_frame_len": "128"},
        }
    }

    parsed = TsharkCapture()._parse_packet(packet)

    assert parsed is not None
    assert parsed.src_ip == "10.0.0.10"
    assert parsed.dst_port == 443
    assert parsed.length == 128


def test_demo_import_stats_and_anomalies() -> None:
    reset_db()
    client = TestClient(app)
    imported = client.post("/monitoring/demo/import", headers=AUTH)
    assert imported.status_code == 200

    stats = client.get("/monitoring/stats", headers=AUTH)
    assert stats.status_code == 200
    assert stats.json()["total_flows"] == 2
    assert stats.json()["total_anomalies"] == 1

    anomalies = client.get("/monitoring/anomalies", headers=AUTH)
    assert anomalies.status_code == 200
    assert anomalies.json()[0]["kind"] == "traffic_spike"


def test_capture_start_stop_mocked(monkeypatch) -> None:
    started: list[bool] = []
    stopped: list[bool] = []

    monkeypatch.setattr("network_analyzer.api.routes.monitoring._capture.start", lambda: started.append(True))
    monkeypatch.setattr("network_analyzer.api.routes.monitoring._capture.stop", lambda: stopped.append(True))

    client = TestClient(app)
    assert client.post("/monitoring/capture/start", headers=AUTH).json()["status"] == "started"
    assert client.post("/monitoring/capture/stop", headers=AUTH).json()["status"] == "stopped"
    assert started == [True]
    assert stopped == [True]
