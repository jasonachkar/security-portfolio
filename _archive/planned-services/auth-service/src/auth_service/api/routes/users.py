"""User management routes."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from auth_service.api.schemas import UserResponse, UserListResponse, UserUpdate
from auth_service.infra.db.models import User
from auth_service.infra.db.session import get_db
from auth_service.services.auth import log_audit_event
from shared_security_core.auth.rbac import require_permission, TokenPayload

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=UserListResponse, dependencies=[Depends(require_permission("users", "read"))])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all users with pagination"""
    # Get total count
    total = db.scalar(select(func.count()).select_from(User))

    # Calculate pagination
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    # Get users
    users = db.scalars(
        select(User)
        .options(joinedload(User.role))
        .order_by(User.created_at.desc())
        .limit(page_size)
        .offset(offset)
    ).all()

    return UserListResponse(
        users=[UserResponse.model_validate(u, from_attributes=True) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_permission("users", "read"))])
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    """Get user by ID"""
    user = db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(joinedload(User.role))
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user, from_attributes=True)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    request: Request,
    user_id: int,
    update_data: UserUpdate,
    current_user: TokenPayload = Depends(require_permission("users", "update")),
    db: Session = Depends(get_db),
):
    """Update user (Admin only)"""
    user = db.scalar(select(User).where(User.id == user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update fields
    if update_data.email is not None:
        user.email = update_data.email
    if update_data.full_name is not None:
        user.full_name = update_data.full_name
    if update_data.role_id is not None:
        user.role_id = update_data.role_id
    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    db.commit()
    db.refresh(user, ["role"])

    # Log update
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="update_user",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        details={"updated_fields": update_data.model_dump(exclude_unset=True)},
    )

    return UserResponse.model_validate(user, from_attributes=True)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    request: Request,
    user_id: int,
    current_user: TokenPayload = Depends(require_permission("users", "delete")),
    db: Session = Depends(get_db),
):
    """Deactivate user (Admin only)"""
    user = db.scalar(select(User).where(User.id == user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Don't allow self-deactivation
    if user.id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user.is_active = False
    db.commit()

    # Log deactivation
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="deactivate_user",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )

    return None
