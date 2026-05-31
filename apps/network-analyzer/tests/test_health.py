from __future__ import annotations

from fastapi.testclient import TestClient

from network_analyzer.api.main import app


def test_health_returns_ok() -> None:
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
