"""Incident management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from alert_correlation.infra.db.session import get_db
from alert_correlation.infra.db.models import Incident, IncidentTimelineEvent, Alert

router = APIRouter(
    prefix="/incidents",
    tags=["Incidents"],
    dependencies=[Depends(require_jwt_token)]
)


class IncidentResponse(BaseModel):
    """Incident response."""
    id: int
    title: str
    description: str
    severity: str
    status: str
    incident_type: str | None
    mitre_tactics: list[str] | None
    created_at: str
    detected_at: str
    resolved_at: str | None
    assigned_to: int | None
    created_by: int
    alert_count: int = 0

    class Config:
        from_attributes = True


class IncidentCreateRequest(BaseModel):
    """Create incident request."""
    title: str
    description: str
    severity: str
    incident_type: str | None = None
    mitre_tactics: list[str] | None = None
    detected_at: datetime
    alert_ids: list[int] | None = None


class IncidentUpdateRequest(BaseModel):
    """Update incident request."""
    title: str | None = None
    description: str | None = None
    status: str | None = None
    assigned_to: int | None = None


class TimelineEventRequest(BaseModel):
    """Add timeline event."""
    event_type: str
    description: str
    metadata: dict | None = None


class TimelineEventResponse(BaseModel):
    """Timeline event response."""
    id: int
    incident_id: int
    timestamp: str
    event_type: str
    description: str
    user_id: int | None
    metadata: dict | None

    class Config:
        from_attributes = True


@router.get("", response_model=list[IncidentResponse], dependencies=[Depends(require_permission("incidents", "read"))])
async def list_incidents(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    assigned_to: int | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[IncidentResponse]:
    """
    List incidents with filtering.
    """
    query = db.query(Incident)

    if status:
        query = query.filter(Incident.status == status)

    if severity:
        query = query.filter(Incident.severity == severity)

    if assigned_to is not None:
        query = query.filter(Incident.assigned_to == assigned_to)

    incidents = query.order_by(Incident.detected_at.desc()).limit(limit).offset(offset).all()

    # Add alert counts
    results = []
    for incident in incidents:
        inc_dict = IncidentResponse.model_validate(incident).model_dump()
        inc_dict["alert_count"] = len(incident.alerts)
        results.append(IncidentResponse(**inc_dict))

    return results


@router.get("/{incident_id}", response_model=IncidentResponse, dependencies=[Depends(require_permission("incidents", "read"))])
async def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> IncidentResponse:
    """
    Get incident by ID with full details.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc_dict = IncidentResponse.model_validate(incident).model_dump()
    inc_dict["alert_count"] = len(incident.alerts)

    return IncidentResponse(**inc_dict)


@router.post("", response_model=IncidentResponse, dependencies=[Depends(require_permission("incidents", "create"))])
async def create_incident(
    request: IncidentCreateRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> IncidentResponse:
    """
    Create a new incident.
    """
    incident = Incident(
        title=request.title,
        description=request.description,
        severity=request.severity,
        incident_type=request.incident_type,
        mitre_tactics=request.mitre_tactics,
        detected_at=request.detected_at,
        created_by=current_user.user_id,
        status="open"
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    # Link alerts if provided
    if request.alert_ids:
        alerts = db.query(Alert).filter(Alert.id.in_(request.alert_ids)).all()
        for alert in alerts:
            alert.incident_id = incident.id
        db.commit()

    # Create initial timeline event
    timeline_event = IncidentTimelineEvent(
        incident_id=incident.id,
        timestamp=datetime.utcnow(),
        event_type="detection",
        description=f"Incident created by {current_user.username}",
        user_id=current_user.user_id
    )
    db.add(timeline_event)
    db.commit()

    inc_dict = IncidentResponse.model_validate(incident).model_dump()
    inc_dict["alert_count"] = len(request.alert_ids) if request.alert_ids else 0

    return IncidentResponse(**inc_dict)


@router.put("/{incident_id}", response_model=IncidentResponse, dependencies=[Depends(require_permission("incidents", "update"))])
async def update_incident(
    incident_id: int,
    request: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> IncidentResponse:
    """
    Update incident details.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if request.title:
        incident.title = request.title

    if request.description:
        incident.description = request.description

    if request.status:
        old_status = incident.status
        incident.status = request.status

        if request.status == "resolved":
            incident.resolved_at = datetime.utcnow()

        # Add timeline event for status change
        if old_status != request.status:
            timeline_event = IncidentTimelineEvent(
                incident_id=incident.id,
                timestamp=datetime.utcnow(),
                event_type="status_change",
                description=f"Status changed from {old_status} to {request.status}",
                user_id=current_user.user_id
            )
            db.add(timeline_event)

    if request.assigned_to is not None:
        incident.assigned_to = request.assigned_to

    db.commit()
    db.refresh(incident)

    inc_dict = IncidentResponse.model_validate(incident).model_dump()
    inc_dict["alert_count"] = len(incident.alerts)

    return IncidentResponse(**inc_dict)


@router.get("/{incident_id}/timeline", response_model=list[TimelineEventResponse], dependencies=[Depends(require_permission("incidents", "read"))])
async def get_incident_timeline(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[TimelineEventResponse]:
    """
    Get incident timeline events.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = db.query(IncidentTimelineEvent).filter(
        IncidentTimelineEvent.incident_id == incident_id
    ).order_by(IncidentTimelineEvent.timestamp.asc()).all()

    return [TimelineEventResponse.model_validate(e) for e in events]


@router.post("/{incident_id}/timeline", response_model=TimelineEventResponse, dependencies=[Depends(require_permission("incidents", "update"))])
async def add_timeline_event(
    incident_id: int,
    request: TimelineEventRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> TimelineEventResponse:
    """
    Add timeline event to incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    event = IncidentTimelineEvent(
        incident_id=incident_id,
        timestamp=datetime.utcnow(),
        event_type=request.event_type,
        description=request.description,
        user_id=current_user.user_id,
        metadata=request.metadata
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return TimelineEventResponse.model_validate(event)


@router.get("/{incident_id}/alerts", dependencies=[Depends(require_permission("incidents", "read"))])
async def get_incident_alerts(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
):
    """
    Get all alerts linked to this incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    alerts = db.query(Alert).filter(Alert.incident_id == incident_id).all()
    return alerts
