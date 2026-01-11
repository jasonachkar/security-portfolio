"""Audit log routes."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from auth_service.api.schemas import AuditLogResponse, AuditLogListResponse
from auth_service.infra.db.models import AuditLog
from auth_service.infra.db.session import get_db
from shared_security_core.auth.rbac import require_permission

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=AuditLogListResponse, dependencies=[Depends(require_permission("audit", "read"))])
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action_filter: str | None = Query(None),
    user_id_filter: int | None = Query(None),
    db: Session = Depends(get_db),
):
    """List audit logs (Admin/Auditor only)"""
    # Build query
    query = select(AuditLog)

    if action_filter:
        query = query.where(AuditLog.action.ilike(f"%{action_filter}%"))
    if user_id_filter:
        query = query.where(AuditLog.user_id == user_id_filter)

    # Get total count
    total = db.scalar(select(func.count()).select_from(query.subquery()))

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    # Get logs
    logs = db.scalars(
        query.order_by(AuditLog.timestamp.desc())
        .limit(page_size)
        .offset(offset)
    ).all()

    return AuditLogListResponse(
        logs=[AuditLogResponse.model_validate(log, from_attributes=True) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
