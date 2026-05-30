from __future__ import annotations

import datetime as dt
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from security_assessment_orchestrator.infra.db.models import Artifact, Assessment
from security_assessment_orchestrator.infra.db.session import get_session_factory
from security_assessment_orchestrator.infra.security.auth import require_bearer_token
from security_assessment_orchestrator.infra.security.target_validation import validate_target
from security_assessment_orchestrator.workers.tasks import run_assessment

router = APIRouter(dependencies=[Depends(require_bearer_token)])


class AssessmentCreate(BaseModel):
    target: str = Field(..., description="Hostname/IP or URL (must be allowlisted)")


class AssessmentResponse(BaseModel):
    """Response model for a single assessment"""
    id: int
    target: str
    status: str
    created_at: dt.datetime
    finished_at: dt.datetime | None
    error_message: str | None
    artifacts_count: int = Field(0, description="Number of artifacts (nmap/zap/trivy results)")


class AssessmentListResponse(BaseModel):
    """Response model for paginated assessment list"""
    assessments: list[AssessmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


def _db() -> Session:
    return get_session_factory()()


@router.get("", response_model=AssessmentListResponse)
def list_assessments(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: str | None = Query(None, description="Filter by status (queued/running/completed/failed)"),
    target_filter: str | None = Query(None, description="Filter by target (partial match)"),
) -> AssessmentListResponse:
    """List all assessments with pagination and optional filters"""
    db = _db()
    try:
        # Build base query
        query = select(Assessment)

        # Apply filters
        if status_filter:
            query = query.where(Assessment.status == status_filter)
        if target_filter:
            query = query.where(Assessment.target.ilike(f"%{target_filter}%"))

        # Get total count
        total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

        # Calculate pagination
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        offset = (page - 1) * page_size

        # Get paginated results
        assessments = db.scalars(
            query.order_by(Assessment.created_at.desc())
            .limit(page_size)
            .offset(offset)
        ).all()

        # Build response with artifacts count
        result = [
            AssessmentResponse(
                id=a.id,
                target=a.target,
                status=a.status,
                created_at=a.created_at,
                finished_at=a.finished_at,
                error_message=a.error_message,
                artifacts_count=len(a.artifacts) if hasattr(a, 'artifacts') else 0,
            )
            for a in assessments
        ]

        return AssessmentListResponse(
            assessments=result,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    finally:
        db.close()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_assessment(req: AssessmentCreate) -> dict:
    validate_target(req.target)
    db = _db()
    try:
        a = Assessment(target=req.target, status="queued", created_at=dt.datetime.utcnow())
        db.add(a)
        db.commit()
        db.refresh(a)
        run_assessment.delay(a.id)
        return {"id": a.id, "status": a.status, "target": a.target}
    finally:
        db.close()


@router.post("/demo/import", status_code=status.HTTP_201_CREATED)
def import_demo_assessment() -> dict:
    """Import deterministic sample artifacts for cloud-demo/reviewer mode."""
    db = _db()
    try:
        assessment = Assessment(
            target="demo-app.local",
            status="completed",
            created_at=dt.datetime.utcnow(),
            finished_at=dt.datetime.utcnow(),
        )
        assessment.artifacts.extend(
            [
                Artifact(
                    kind="nmap",
                    content_type="text/plain",
                    content=(
                        "PORT    STATE SERVICE VERSION\n"
                        "80/tcp  open  http    demo nginx\n"
                        "443/tcp open  https   demo nginx"
                    ),
                ),
                Artifact(
                    kind="zap",
                    content_type="application/json",
                    content='{"alerts":[{"alert":"Missing CSP","risk":"Medium","confidence":"High"}]}',
                ),
                Artifact(
                    kind="trivy",
                    content_type="application/json",
                    content='{"Results":[{"Vulnerabilities":[{"VulnerabilityID":"CVE-DEMO-0001","Severity":"LOW"}]}]}',
                ),
            ]
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return {"id": assessment.id, "status": assessment.status, "target": assessment.target}
    finally:
        db.close()


@router.get("/{assessment_id}")
def get_assessment(assessment_id: int) -> dict:
    db = _db()
    try:
        a = db.scalar(select(Assessment).where(Assessment.id == assessment_id))
        if a is None:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return {
            "id": a.id,
            "target": a.target,
            "status": a.status,
            "created_at": a.created_at,
            "finished_at": a.finished_at,
            "error_message": a.error_message,
        }
    finally:
        db.close()


@router.get("/{assessment_id}/artifacts")
def get_artifacts(assessment_id: int) -> list[dict]:
    db = _db()
    try:
        a = db.scalar(select(Assessment).where(Assessment.id == assessment_id))
        if a is None:
            raise HTTPException(status_code=404, detail="Assessment not found")
        return [
            {
                "id": art.id,
                "kind": art.kind,
                "content_type": art.content_type,
                "content": art.content,
            }
            for art in a.artifacts
        ]
    finally:
        db.close()
