"""Role and permission management routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth_service.api.schemas import RoleInfo, RoleWithPermissions
from auth_service.infra.db.models import Role
from auth_service.infra.db.session import get_db
from shared_security_core.auth.rbac import require_permission

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("", response_model=list[RoleInfo], dependencies=[Depends(require_permission("roles", "read"))])
def list_roles(db: Session = Depends(get_db)):
    """List all roles"""
    roles = db.scalars(select(Role).order_by(Role.name)).all()
    return [RoleInfo.model_validate(r, from_attributes=True) for r in roles]


@router.get("/{role_id}", response_model=RoleWithPermissions, dependencies=[Depends(require_permission("roles", "read"))])
def get_role(
    role_id: int,
    db: Session = Depends(get_db),
):
    """Get role with permissions"""
    role = db.scalar(
        select(Role)
        .where(Role.id == role_id)
        .options(joinedload(Role.permissions))
    )

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    return RoleWithPermissions.model_validate(role, from_attributes=True)
