"""Celery tasks for threat intelligence operations."""

from celery import Task
from shared_security_core.logging import get_logger

from threat_intel.workers.celery_app import celery_app
from threat_intel.infra.db.session import get_db_session
from threat_intel.services.mitre_sync import sync_mitre_attack_framework
from threat_intel.services.enrichment import enrich_finding

log = get_logger(__name__)


class DatabaseTask(Task):
    """Base task with database session management."""
    _db = None

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()


@celery_app.task(bind=True, base=DatabaseTask, name="threat_intel.sync_mitre_attack")
def sync_mitre_attack_task(self):
    """
    Sync MITRE ATT&CK framework from GitHub.

    Scheduled to run weekly.
    """
    log.info("mitre_sync_started")

    with get_db_session() as db:
        try:
            import asyncio
            count = asyncio.run(sync_mitre_attack_framework(db))
            log.info("mitre_sync_completed", techniques_count=count)
            return {"status": "success", "techniques_synced": count}
        except Exception as e:
            log.error("mitre_sync_failed", error=str(e))
            raise


@celery_app.task(bind=True, base=DatabaseTask, name="threat_intel.enrich_finding")
def enrich_finding_async(self, source_service: str, source_finding_id: int):
    """
    Enrich a finding from another service asynchronously.

    Args:
        source_service: Source service name (vuln_scanner, network_analyzer)
        source_finding_id: Finding ID in source service
    """
    log.info("enrichment_started", service=source_service, finding_id=source_finding_id)

    with get_db_session() as db:
        try:
            import asyncio
            enrichment = asyncio.run(enrich_finding(db, source_service, source_finding_id))
            log.info("enrichment_completed", enrichment_id=enrichment.id)
            return {
                "status": "success",
                "enrichment_id": enrichment.id,
                "cve_count": len(enrichment.cve_ids) if enrichment.cve_ids else 0,
                "technique_count": len(enrichment.mitre_techniques) if enrichment.mitre_techniques else 0
            }
        except Exception as e:
            log.error("enrichment_failed", service=source_service, finding_id=source_finding_id, error=str(e))
            raise


@celery_app.task(bind=True, base=DatabaseTask, name="threat_intel.update_threat_feeds")
def update_threat_feeds_task(self):
    """
    Update threat intelligence feeds.

    This is a placeholder for future threat feed integration.
    In production, this would pull from sources like:
    - AlienVault OTX
    - abuse.ch
    - CIRCL
    - Custom feeds

    Scheduled to run hourly.
    """
    log.info("threat_feed_update_started")

    with get_db_session() as db:
        try:
            # Placeholder for feed update logic
            # In production, implement actual feed polling and IOC ingestion
            log.info("threat_feed_update_completed")
            return {"status": "success", "feeds_updated": 0}
        except Exception as e:
            log.error("threat_feed_update_failed", error=str(e))
            raise


# Celery Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    "sync-mitre-attack-weekly": {
        "task": "threat_intel.sync_mitre_attack",
        "schedule": 604800.0,  # 7 days in seconds
    },
    "update-threat-feeds-hourly": {
        "task": "threat_intel.update_threat_feeds",
        "schedule": 3600.0,  # 1 hour in seconds
    },
}
