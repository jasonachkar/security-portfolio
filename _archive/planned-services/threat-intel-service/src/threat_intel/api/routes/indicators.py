"""Threat indicator (IOC) endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from datetime import datetime

from shared_security_core.auth.rbac import require_jwt_token, require_permission, TokenPayload
from threat_intel.infra.db.session import get_db
from threat_intel.infra.db.models import ThreatIndicator, ThreatFeed

router = APIRouter(
    prefix="/indicators",
    tags=["Indicators"],
    dependencies=[Depends(require_jwt_token)]
)


class ThreatIndicatorResponse(BaseModel):
    """Threat indicator response."""
    id: int
    feed_id: int
    indicator_type: str
    value: str
    confidence: int
    severity: str
    tags: list[str] | None
    metadata: dict | None
    first_seen: str
    last_seen: str
    expires_at: str | None

    class Config:
        from_attributes = True


class IndicatorCheckRequest(BaseModel):
    """Check if indicators are malicious."""
    indicators: list[str]


class IndicatorCheckResult(BaseModel):
    """Result of indicator check."""
    value: str
    is_malicious: bool
    matches: list[ThreatIndicatorResponse]


@router.get("", response_model=list[ThreatIndicatorResponse], dependencies=[Depends(require_permission("intel", "read"))])
async def list_indicators(
    indicator_type: str | None = Query(None, description="Filter by type (ip, domain, hash, url)"),
    severity: str | None = Query(None, description="Filter by severity"),
    min_confidence: int = Query(0, ge=0, le=100),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[ThreatIndicatorResponse]:
    """
    List threat indicators with filtering.
    """
    query = db.query(ThreatIndicator).filter(
        ThreatIndicator.confidence >= min_confidence
    )

    # Filter out expired indicators
    query = query.filter(
        or_(
            ThreatIndicator.expires_at.is_(None),
            ThreatIndicator.expires_at > datetime.utcnow()
        )
    )

    if indicator_type:
        query = query.filter(ThreatIndicator.indicator_type == indicator_type)

    if severity:
        query = query.filter(ThreatIndicator.severity == severity)

    indicators = query.order_by(ThreatIndicator.last_seen.desc()).limit(limit).offset(offset).all()
    return [ThreatIndicatorResponse.model_validate(ind) for ind in indicators]


@router.post("/check", response_model=list[IndicatorCheckResult], dependencies=[Depends(require_permission("intel", "read"))])
async def check_indicators(
    request: IndicatorCheckRequest,
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
) -> list[IndicatorCheckResult]:
    """
    Check if given indicators (IPs, domains, hashes, URLs) are malicious.

    Returns matches from threat intelligence feeds.
    """
    results = []

    for indicator in request.indicators:
        # Search for matches in threat indicators
        matches = db.query(ThreatIndicator).filter(
            ThreatIndicator.value == indicator
        ).filter(
            or_(
                ThreatIndicator.expires_at.is_(None),
                ThreatIndicator.expires_at > datetime.utcnow()
            )
        ).all()

        results.append(IndicatorCheckResult(
            value=indicator,
            is_malicious=len(matches) > 0,
            matches=[ThreatIndicatorResponse.model_validate(m) for m in matches]
        ))

    return results


@router.get("/feeds", dependencies=[Depends(require_permission("intel", "read"))])
async def list_feeds(
    enabled_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: TokenPayload = Depends(require_jwt_token)
):
    """
    List threat intelligence feed sources.
    """
    query = db.query(ThreatFeed)

    if enabled_only:
        query = query.filter(ThreatFeed.enabled == True)

    feeds = query.all()
    return feeds
