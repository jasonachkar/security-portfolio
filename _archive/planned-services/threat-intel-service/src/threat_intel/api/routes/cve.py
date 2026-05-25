"""CVE lookup and management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from threat_intel.infra.db.session import get_db
from threat_intel.infra.db.models import CVEEntry
from threat_intel.services.cve_lookup import fetch_cve_from_nvd, search_cves

router = APIRouter(
    prefix="/cve",
    tags=["CVE"],
    dependencies=[Depends(require_jwt_token)]
)


class CVEResponse(BaseModel):
    """CVE entry response."""
    id: int
    cve_id: str
    published_date: str | None
    last_modified: str | None
    description: str | None
    cvss_v3_score: float | None
    cvss_v3_vector: str | None
    severity: str | None
    cwe_ids: list[str] | None
    references: dict | None

    class Config:
        from_attributes = True


class CVEBatchRequest(BaseModel):
    """Batch CVE lookup request."""
    cve_ids: list[str]


@router.get("/{cve_id}", response_model=CVEResponse, dependencies=[Depends(require_permission("intel", "read"))])
async def get_cve(
    cve_id: str,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> CVEResponse:
    """
    Get CVE details by ID.

    Fetches from database cache or NVD API if not cached.
    """
    # Check database first
    cve = db.query(CVEEntry).filter(CVEEntry.cve_id == cve_id).first()

    if not cve:
        # Fetch from NVD API
        cve = await fetch_cve_from_nvd(cve_id, db)
        if not cve:
            raise HTTPException(status_code=404, detail=f"CVE {cve_id} not found")

    return CVEResponse.model_validate(cve)


@router.post("/batch", response_model=list[CVEResponse], dependencies=[Depends(require_permission("intel", "read"))])
async def batch_lookup_cves(
    request: CVEBatchRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[CVEResponse]:
    """
    Batch lookup multiple CVEs.

    Returns all found CVEs, fetching from NVD if necessary.
    """
    results = []

    for cve_id in request.cve_ids:
        cve = db.query(CVEEntry).filter(CVEEntry.cve_id == cve_id).first()

        if not cve:
            cve = await fetch_cve_from_nvd(cve_id, db)

        if cve:
            results.append(CVEResponse.model_validate(cve))

    return results


@router.get("", response_model=list[CVEResponse], dependencies=[Depends(require_permission("intel", "read"))])
async def search_cve_entries(
    query: str = Query(..., min_length=3, description="Search query for CVE description"),
    severity: str | None = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[CVEResponse]:
    """
    Search CVE entries by description or ID.

    Searches local database only.
    """
    results = await search_cves(db, query, severity, limit, offset)
    return [CVEResponse.model_validate(cve) for cve in results]
