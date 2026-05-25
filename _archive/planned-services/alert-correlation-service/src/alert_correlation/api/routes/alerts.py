"""Alert management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from datetime import datetime

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from alert_correlation.infra.db.session import get_db
from alert_correlation.infra.db.models import Alert

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
    dependencies=[Depends(require_jwt_token)]
)


class AlertResponse(BaseModel):
    """Alert response."""
    id: int
    source_service: str
    source_id: int
    source_type: str
    title: str
    description: str
    severity: str
    status: str
    affected_asset: str | None
    tags: list[str] | None
    metadata: dict | None
    detected_at: str
    created_at: str
    resolved_at: str | None
    incident_id: int | None
    assigned_to: int | None

    class Config:
        from_attributes = True


class AlertUpdateRequest(BaseModel):
    """Update alert status or assignment."""
    status: str | None = None
    assigned_to: int | None = None
    incident_id: int | None = None


class AlertIngestRequest(BaseModel):
    """Ingest new alert from external service."""
    source_service: str
    source_id: int
    source_type: str
    title: str
    description: str
    severity: str
    affected_asset: str | None = None
    tags: list[str] | None = None
    metadata: dict | None = None
    detected_at: datetime


@router.get("", response_model=list[AlertResponse], dependencies=[Depends(require_permission("alerts", "read"))])
async def list_alerts(
    severity: str | None = Query(None, description="Filter by severity"),
    status: str | None = Query(None, description="Filter by status"),
    source_service: str | None = Query(None, description="Filter by source service"),
    assigned_to: int | None = Query(None, description="Filter by assigned user"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[AlertResponse]:
    """
    List alerts with filtering and pagination.
    """
    query = db.query(Alert)

    if severity:
        query = query.filter(Alert.severity == severity)

    if status:
        query = query.filter(Alert.status == status)

    if source_service:
        query = query.filter(Alert.source_service == source_service)

    if assigned_to is not None:
        query = query.filter(Alert.assigned_to == assigned_to)

    alerts = query.order_by(Alert.detected_at.desc()).limit(limit).offset(offset).all()
    return [AlertResponse.model_validate(a) for a in alerts]


@router.get("/{alert_id}", response_model=AlertResponse, dependencies=[Depends(require_permission("alerts", "read"))])
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> AlertResponse:
    """
    Get alert by ID.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return AlertResponse.model_validate(alert)


@router.put("/{alert_id}", response_model=AlertResponse, dependencies=[Depends(require_permission("alerts", "update"))])
async def update_alert(
    alert_id: int,
    request: AlertUpdateRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> AlertResponse:
    """
    Update alert status or assignment.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if request.status:
        alert.status = request.status
        if request.status == "resolved":
            alert.resolved_at = datetime.utcnow()

    if request.assigned_to is not None:
        alert.assigned_to = request.assigned_to

    if request.incident_id is not None:
        alert.incident_id = request.incident_id

    db.commit()
    db.refresh(alert)

    return AlertResponse.model_validate(alert)


@router.post("/{alert_id}/resolve", response_model=AlertResponse, dependencies=[Depends(require_permission("alerts", "update"))])
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> AlertResponse:
    """
    Mark alert as resolved.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    return AlertResponse.model_validate(alert)


@router.post("/ingest", response_model=AlertResponse, dependencies=[Depends(require_permission("alerts", "create"))])
async def ingest_alert(
    request: AlertIngestRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> AlertResponse:
    """
    Ingest a new alert from an external service.

    This is typically called by other services (vuln scanner, network analyzer, etc.)
    to create alerts that can be correlated.
    """
    # Check if alert already exists
    existing = db.query(Alert).filter(
        Alert.source_service == request.source_service,
        Alert.source_id == request.source_id
    ).first()

    if existing:
        return AlertResponse.model_validate(existing)

    # Create new alert
    alert = Alert(
        source_service=request.source_service,
        source_id=request.source_id,
        source_type=request.source_type,
        title=request.title,
        description=request.description,
        severity=request.severity,
        affected_asset=request.affected_asset,
        tags=request.tags,
        metadata=request.metadata,
        detected_at=request.detected_at,
        status="open"
    )

    db.add(alert)
    db.commit()
    db.refresh(alert)

    # TODO: Trigger correlation check asynchronously
    # from alert_correlation.workers.tasks import check_correlation_rules
    # check_correlation_rules.delay(alert.id)

    return AlertResponse.model_validate(alert)


@router.get("/stats/summary", dependencies=[Depends(require_permission("alerts", "read"))])
async def get_alert_stats(
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
):
    """
    Get alert statistics for dashboard.
    """
    from sqlalchemy import func

    total_alerts = db.query(func.count(Alert.id)).scalar()
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == "open").scalar()
    critical_alerts = db.query(func.count(Alert.id)).filter(
        Alert.severity == "critical",
        Alert.status == "open"
    ).scalar()

    # Alerts by severity
    severity_counts = db.query(
        Alert.severity,
        func.count(Alert.id)
    ).filter(Alert.status == "open").group_by(Alert.severity).all()

    # Alerts by service
    service_counts = db.query(
        Alert.source_service,
        func.count(Alert.id)
    ).filter(Alert.status == "open").group_by(Alert.source_service).all()

    return {
        "total": total_alerts,
        "open": open_alerts,
        "critical": critical_alerts,
        "by_severity": {sev: count for sev, count in severity_counts},
        "by_service": {svc: count for svc, count in service_counts}
    }
