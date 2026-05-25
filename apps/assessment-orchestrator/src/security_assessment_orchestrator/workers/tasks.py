from __future__ import annotations

import datetime as dt

import structlog
from celery import shared_task
from sqlalchemy import select, update

from security_assessment_orchestrator.infra.db.models import Assessment, Artifact
from security_assessment_orchestrator.infra.db.session import get_session_factory
from security_assessment_orchestrator.infra.settings import Settings
from security_assessment_orchestrator.services.runners import run_nmap, run_zap_quick_scan, run_trivy_image

log = structlog.get_logger()


@shared_task(name="run_assessment")
def run_assessment(assessment_id: int) -> None:
    settings = Settings()
    session_factory = get_session_factory()

    with session_factory() as db:
        assessment = db.scalar(select(Assessment).where(Assessment.id == assessment_id))
        if assessment is None:
            return
        assessment.status = "running"
        assessment.error_message = None
        db.add(assessment)
        db.commit()

    try:
        results = []

        if settings.enable_nmap:
            results.append(run_nmap(assessment.target))

        if settings.enable_zap:
            # only if target looks like URL
            if assessment.target.startswith("http://") or assessment.target.startswith("https://"):
                results.append(run_zap_quick_scan(assessment.target))

        if settings.enable_trivy:
            results.append(run_trivy_image(settings.trivy_image))

        with session_factory() as db:
            assessment = db.scalar(select(Assessment).where(Assessment.id == assessment_id))
            if assessment is None:
                return
            assessment.artifacts.clear()
            for r in results:
                assessment.artifacts.append(Artifact(kind=r.kind, content_type=r.content_type, content=r.content))
            assessment.status = "completed"
            assessment.finished_at = dt.datetime.utcnow()
            db.add(assessment)
            db.commit()

        log.info("assessment_completed", assessment_id=assessment_id, artifacts=len(results))
    except Exception as ex:
        log.exception("assessment_failed", assessment_id=assessment_id)
        with session_factory() as db:
            db.execute(
                update(Assessment)
                .where(Assessment.id == assessment_id)
                .values(status="failed", finished_at=dt.datetime.utcnow(), error_message=str(ex))
            )
            db.commit()
