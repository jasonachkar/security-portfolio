"""MITRE ATT&CK technique endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from threat_intel.infra.db.session import get_db
from threat_intel.infra.db.models import MitreAttackTechnique

router = APIRouter(
    prefix="/mitre",
    tags=["MITRE ATT&CK"],
    dependencies=[Depends(require_jwt_token)]
)


class MitreTechniqueResponse(BaseModel):
    """MITRE ATT&CK technique response."""
    id: int
    technique_id: str
    name: str
    description: str | None
    tactics: list[str] | None
    platforms: list[str] | None
    data_sources: list[str] | None
    detection: str | None
    mitigations: dict | None

    class Config:
        from_attributes = True


@router.get("/techniques", response_model=list[MitreTechniqueResponse], dependencies=[Depends(require_permission("intel", "read"))])
async def list_techniques(
    tactic: str | None = Query(None, description="Filter by tactic"),
    platform: str | None = Query(None, description="Filter by platform"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[MitreTechniqueResponse]:
    """
    List MITRE ATT&CK techniques with optional filtering.
    """
    query = db.query(MitreAttackTechnique)

    if tactic:
        query = query.filter(MitreAttackTechnique.tactics.contains([tactic]))

    if platform:
        query = query.filter(MitreAttackTechnique.platforms.contains([platform]))

    techniques = query.limit(limit).offset(offset).all()
    return [MitreTechniqueResponse.model_validate(t) for t in techniques]


@router.get("/techniques/{technique_id}", response_model=MitreTechniqueResponse, dependencies=[Depends(require_permission("intel", "read"))])
async def get_technique(
    technique_id: str,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> MitreTechniqueResponse:
    """
    Get MITRE ATT&CK technique by ID (e.g., T1059.001).
    """
    technique = db.query(MitreAttackTechnique).filter(
        MitreAttackTechnique.technique_id == technique_id
    ).first()

    if not technique:
        raise HTTPException(status_code=404, detail=f"Technique {technique_id} not found")

    return MitreTechniqueResponse.model_validate(technique)


@router.get("/tactics", response_model=list[str], dependencies=[Depends(require_permission("intel", "read"))])
async def list_tactics(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[str]:
    """
    Get unique list of MITRE ATT&CK tactics.
    """
    from sqlalchemy import func

    # Query distinct tactics from techniques
    tactics_result = db.query(
        func.unnest(MitreAttackTechnique.tactics).label('tactic')
    ).distinct().all()

    tactics = [row[0] for row in tactics_result if row[0]]
    return sorted(tactics)
