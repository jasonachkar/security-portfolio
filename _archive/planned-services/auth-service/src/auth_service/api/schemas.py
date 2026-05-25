"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# Authentication Schemas


class LoginRequest(BaseModel):
    """Login request"""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""

    refresh_token: str


class AccessTokenResponse(BaseModel):
    """Access token response"""

    access_token: str
    token_type: str = "bearer"


# User Schemas


class UserBase(BaseModel):
    """Base user schema"""

    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str | None = None


class UserCreate(UserBase):
    """User creation request"""

    password: str = Field(..., min_length=8)
    role_id: int = Field(..., gt=0)


class UserUpdate(BaseModel):
    """User update request"""

    email: EmailStr | None = None
    full_name: str | None = None
    role_id: int | None = Field(None, gt=0)
    is_active: bool | None = None


class UserPasswordUpdate(BaseModel):
    """Password update request"""

    current_password: str
    new_password: str = Field(..., min_length=8)


class RoleInfo(BaseModel):
    """Role information"""

    id: int
    name: str
    description: str | None = None

    class Config:
        from_attributes = True


class PermissionInfo(BaseModel):
    """Permission information"""

    id: int
    resource: str
    action: str

    class Config:
        from_attributes = True


class UserResponse(UserBase):
    """User response"""

    id: int
    is_active: bool
    created_at: datetime
    last_login: datetime | None
    role: RoleInfo

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """User list response"""

    users: list[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Role Schemas


class RoleWithPermissions(RoleInfo):
    """Role with permissions"""

    permissions: list[PermissionInfo]

    class Config:
        from_attributes = True


# Audit Log Schemas


class AuditLogResponse(BaseModel):
    """Audit log response"""

    id: int
    user_id: int | None
    action: str
    resource_type: str | None
    resource_id: int | None
    ip_address: str | None
    timestamp: datetime
    details: dict | None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Audit log list response"""

    logs: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
