from __future__ import annotations

from celery import Celery  # type: ignore[import-untyped]

from security_assessment_orchestrator.infra.settings import Settings

settings = Settings()

celery_app = Celery(
    "security_assessment_orchestrator",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["security_assessment_orchestrator.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_always_eager=settings.celery_task_always_eager,
)
