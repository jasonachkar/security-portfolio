from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from security_assessment_orchestrator.api.main import app
from security_assessment_orchestrator.infra.db.base import Base
from security_assessment_orchestrator.infra.db.session import get_session_factory
from security_assessment_orchestrator.infra.security.target_validation import validate_target
from security_assessment_orchestrator.services.parsers import (
    parse_nmap_open_ports,
    parse_trivy_vulnerabilities,
    parse_zap_alerts,
)
from security_assessment_orchestrator.services.runners import build_nmap_command


AUTH = {"Authorization": "Bearer change-me"}


def reset_db() -> None:
    engine = get_session_factory().kw["bind"]
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_allowed_target_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_TARGETS", "localhost,127.0.0.1,demo-app.local")
    validate_target("demo-app.local")


def test_disallowed_target_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ALLOWED_TARGETS", "localhost")
    with pytest.raises(HTTPException):
        validate_target("example.com")


def test_nmap_command_built_safely() -> None:
    command = build_nmap_command("localhost")
    assert command == ["nmap", "-sV", "-T3", "--reason", "localhost"]
    assert isinstance(command, list)


def test_sample_outputs_parsed() -> None:
    nmap = "PORT    STATE SERVICE VERSION\n80/tcp  open  http    nginx\n"
    zap = '{"alerts":[{"alert":"Missing CSP","risk":"Medium","confidence":"High"}]}'
    trivy = '{"Results":[{"Vulnerabilities":[{"VulnerabilityID":"CVE-DEMO","Severity":"LOW"}]}]}'

    assert parse_nmap_open_ports(nmap)[0]["service"] == "http"
    assert parse_zap_alerts(zap)[0]["risk"] == "Medium"
    assert parse_trivy_vulnerabilities(trivy)[0]["VulnerabilityID"] == "CVE-DEMO"


def test_demo_import_persists_artifacts() -> None:
    reset_db()
    client = TestClient(app)
    imported = client.post("/assessments/demo/import", headers=AUTH)
    assert imported.status_code == 201

    artifacts = client.get(f"/assessments/{imported.json()['id']}/artifacts", headers=AUTH)
    assert artifacts.status_code == 200
    assert {item["kind"] for item in artifacts.json()} == {"nmap", "zap", "trivy"}
