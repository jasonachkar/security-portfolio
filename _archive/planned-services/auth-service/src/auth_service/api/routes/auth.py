"""Authentication routes - login, register, refresh, logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth_service.api.schemas import (
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AccessTokenResponse,
    UserCreate,
    UserResponse,
    UserPasswordUpdate,
)
from auth_service.infra.db.session import get_db
from auth_service.services.auth import (
    authenticate_user,
    create_user_tokens,
    refresh_user_token,
    revoke_session,
    log_audit_event,
    create_user,
)
from auth_service.services.password import hash_password, verify_password
from shared_security_core.auth.rbac import require_jwt_token, require_permission, get_current_user
from shared_security_core.auth.jwt_handler import TokenPayload

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> str:
    """Extract user agent from request"""
    return request.headers.get("user-agent", None)


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with username and password.

    Returns JWT access token (15 min) and refresh token (7 days).
    """
    # Authenticate user
    user = authenticate_user(db, credentials.username, credentials.password)

    if not user:
        # Log failed login attempt
        log_audit_event(
            db,
            user_id=None,
            action="login_failed",
            ip_address=get_client_ip(request),
            details={"username": credentials.username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Create tokens
    access_token, refresh_token = create_user_tokens(
        db,
        user,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )

    # Log successful login
    log_audit_event(
        db,
        user_id=user.id,
        action="login_success",
        ip_address=get_client_ip(request),
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(
    request: Request,
    token_request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh access token using refresh token.

    Returns new JWT access token (15 min).
    """
    try:
        access_token = refresh_user_token(
            db,
            token_request.refresh_token,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )

        return AccessTokenResponse(access_token=access_token)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid refresh token: {str(e)}",
        )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    current_user: TokenPayload = Depends(require_jwt_token),
    db: Session = Depends(get_db),
):
    """
    Logout and revoke current session.

    Revokes the current JWT token by marking the session as revoked.
    """
    # Revoke session
    revoke_session(db, current_user.jti)

    # Log logout
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="logout",
        ip_address=get_client_ip(request),
    )

    return None


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: TokenPayload = Depends(require_jwt_token),
    db: Session = Depends(get_db),
):
    """Get current user information"""
    from auth_service.infra.db.models import User
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload

    user = db.scalar(
        select(User)
        .where(User.id == current_user.user_id)
        .options(joinedload(User.role))
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user, from_attributes=True)


@router.put("/me", response_model=UserResponse)
def update_current_user(
    request: Request,
    update_data: dict,
    current_user: TokenPayload = Depends(require_jwt_token),
    db: Session = Depends(get_db),
):
    """Update current user profile"""
    from auth_service.infra.db.models import User
    from sqlalchemy import select

    user = db.scalar(select(User).where(User.id == current_user.user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update allowed fields
    if "email" in update_data:
        user.email = update_data["email"]
    if "full_name" in update_data:
        user.full_name = update_data["full_name"]

    db.commit()
    db.refresh(user)

    # Log update
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="update_profile",
        resource_type="user",
        resource_id=user.id,
        ip_address=get_client_ip(request),
    )

    return UserResponse.model_validate(user, from_attributes=True)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    request: Request,
    password_data: UserPasswordUpdate,
    current_user: TokenPayload = Depends(require_jwt_token),
    db: Session = Depends(get_db),
):
    """Change current user password"""
    from auth_service.infra.db.models import User
    from sqlalchemy import select

    user = db.scalar(select(User).where(User.id == current_user.user_id))

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Update password
    user.hashed_password = hash_password(password_data.new_password)
    db.commit()

    # Log password change
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="change_password",
        resource_type="user",
        resource_id=user.id,
        ip_address=get_client_ip(request),
    )

    return None


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    request: Request,
    user_data: UserCreate,
    current_user: TokenPayload = Depends(require_permission("users", "create")),
    db: Session = Depends(get_db),
):
    """
    Register a new user (Admin only).

    Requires users:create permission.
    """
    from auth_service.infra.db.models import User
    from sqlalchemy import select

    # Check if username already exists
    existing_user = db.scalar(select(User).where(User.username == user_data.username))
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email already exists
    existing_email = db.scalar(select(User).where(User.email == user_data.email))
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = create_user(
        db,
        username=user_data.username,
        email=user_data.email,
        password=user_data.password,
        role_id=user_data.role_id,
        full_name=user_data.full_name,
    )

    # Log user creation
    log_audit_event(
        db,
        user_id=current_user.user_id,
        action="create_user",
        resource_type="user",
        resource_id=user.id,
        ip_address=get_client_ip(request),
        details={"created_username": user.username},
    )

    db.refresh(user, ["role"])
    return UserResponse.model_validate(user, from_attributes=True)
