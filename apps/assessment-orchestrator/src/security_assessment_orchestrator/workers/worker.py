from __future__ import annotations

from security_assessment_orchestrator.workers.celery_app import celery_app

if __name__ == "__main__":
    celery_app.worker_main(argv=["worker", "--loglevel=INFO", "--concurrency=2"])
