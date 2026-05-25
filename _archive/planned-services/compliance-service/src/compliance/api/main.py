"""Main FastAPI application for Compliance Service."""

from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from shared_security_core.logging import configure_logging, get_logger
from shared_security_core.models import HealthResponse
from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload

from compliance.infra.settings import Settings
from compliance.infra.db.session import get_db
from compliance.infra.db.models import ComplianceFramework, ComplianceControl, ComplianceReport

settings = Settings()
configure_logging("compliance-service", settings.log_level)
log = get_logger(__name__)

app = FastAPI(
    title="Compliance Service",
    description="Compliance framework mapping and reporting",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FrameworkResponse(BaseModel):
    """Framework response."""
    id: int
    name: str
    version: str
    description: str | None

    class Config:
        from_attributes = True


class ControlResponse(BaseModel):
    """Control response."""
    id: int
    framework_id: int
    control_id: str
    title: str
    description: str
    category: str | None
    severity: str | None

    class Config:
        from_attributes = True


class ReportResponse(BaseModel):
    """Report response."""
    id: int
    framework_id: int
    title: str
    report_period_start: str
    report_period_end: str
    generated_at: str
    status: str
    summary: dict | None

    class Config:
        from_attributes = True


@app.get("/api/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="healthy", service="compliance-service", version="0.1.0")


@app.get("/api/compliance/frameworks", response_model=list[FrameworkResponse], dependencies=[Depends(require_jwt_token)])
async def list_frameworks(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[FrameworkResponse]:
    """List all compliance frameworks."""
    frameworks = db.query(ComplianceFramework).all()
    return [FrameworkResponse.model_validate(f) for f in frameworks]


@app.get("/api/compliance/frameworks/{framework_id}/controls", response_model=list[ControlResponse], dependencies=[Depends(require_jwt_token)])
async def list_controls(
    framework_id: int,
    category: str | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[ControlResponse]:
    """List controls for a framework."""
    query = db.query(ComplianceControl).filter(ComplianceControl.framework_id == framework_id)

    if category:
        query = query.filter(ComplianceControl.category == category)

    controls = query.limit(limit).offset(offset).all()
    return [ControlResponse.model_validate(c) for c in controls]


@app.get("/api/compliance/reports", response_model=list[ReportResponse], dependencies=[Depends(require_permission("compliance", "read"))])
async def list_reports(
    framework_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[ReportResponse]:
    """List compliance reports."""
    query = db.query(ComplianceReport)

    if framework_id:
        query = query.filter(ComplianceReport.framework_id == framework_id)

    reports = query.order_by(ComplianceReport.generated_at.desc()).limit(limit).offset(offset).all()
    return [ReportResponse.model_validate(r) for r in reports]


@app.get("/api/compliance/coverage", dependencies=[Depends(require_jwt_token)])
async def get_compliance_coverage(
    framework_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
):
    """
    Get current compliance coverage statistics.

    Returns overview of how many controls are compliant, non-compliant, or unmapped.
    """
    from sqlalchemy import func
    from compliance.infra.db.models import FindingControlMapping

    # Total controls
    controls_query = db.query(func.count(ComplianceControl.id))
    if framework_id:
        controls_query = controls_query.filter(ComplianceControl.framework_id == framework_id)
    total_controls = controls_query.scalar() or 0

    # Mapped controls
    mapped_query = db.query(func.count(func.distinct(FindingControlMapping.control_id)))
    if framework_id:
        mapped_query = mapped_query.join(ComplianceControl).filter(
            ComplianceControl.framework_id == framework_id
        )
    mapped_controls = mapped_query.scalar() or 0

    return {
        "total_controls": total_controls,
        "mapped_controls": mapped_controls,
        "unmapped_controls": total_controls - mapped_controls,
        "coverage_percentage": round((mapped_controls / total_controls * 100), 2) if total_controls > 0 else 0
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8086)
