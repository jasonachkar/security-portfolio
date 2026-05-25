"""Finding enrichment endpoints."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from threat_intel.infra.db.session import get_db
from threat_intel.infra.db.models import FindingEnrichment
from threat_intel.services.enrichment import enrich_finding
from threat_intel.workers.tasks import enrich_finding_async

router = APIRouter(
    prefix="/enrichment",
    tags=["Enrichment"],
    dependencies=[Depends(require_jwt_token)]
)


class EnrichmentRequest(BaseModel):
    """Request to enrich a finding."""
    source_service: str
    source_finding_id: int
    sync: bool = False  # If True, enrichment happens synchronously


class EnrichmentResponse(BaseModel):
    """Enrichment result."""
    id: int
    source_service: str
    source_finding_id: int
    cve_ids: list[str] | None
    mitre_techniques: list[str] | None
    matched_indicators: list[int] | None
    enriched_at: str
    enrichment_metadata: dict | None

    class Config:
        from_attributes = True


@router.post("", response_model=EnrichmentResponse, dependencies=[Depends(require_permission("intel", "create"))])
async def create_enrichment(
    request: EnrichmentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> EnrichmentResponse:
    """
    Enrich a finding from another service.

    - If sync=True, enrichment happens immediately (slower)
    - If sync=False, enrichment is queued as background task
    """
    # Check if already enriched
    existing = db.query(FindingEnrichment).filter(
        FindingEnrichment.source_service == request.source_service,
        FindingEnrichment.source_finding_id == request.source_finding_id
    ).first()

    if existing:
        return EnrichmentResponse.model_validate(existing)

    if request.sync:
        # Synchronous enrichment
        enrichment = await enrich_finding(
            db,
            request.source_service,
            request.source_finding_id
        )
    else:
        # Asynchronous enrichment via Celery
        enrich_finding_async.delay(request.source_service, request.source_finding_id)

        # Create placeholder enrichment record
        enrichment = FindingEnrichment(
            source_service=request.source_service,
            source_finding_id=request.source_finding_id,
            enrichment_metadata={"status": "pending"}
        )
        db.add(enrichment)
        db.commit()
        db.refresh(enrichment)

    return EnrichmentResponse.model_validate(enrichment)


@router.get("/{source_service}/{source_finding_id}", response_model=EnrichmentResponse, dependencies=[Depends(require_permission("intel", "read"))])
async def get_enrichment(
    source_service: str,
    source_finding_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> EnrichmentResponse:
    """
    Get enrichment data for a finding.
    """
    enrichment = db.query(FindingEnrichment).filter(
        FindingEnrichment.source_service == source_service,
        FindingEnrichment.source_finding_id == source_finding_id
    ).first()

    if not enrichment:
        raise HTTPException(status_code=404, detail="Enrichment not found")

    return EnrichmentResponse.model_validate(enrichment)
