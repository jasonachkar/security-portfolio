"""Authentication service logic."""

from __future__ import annotations

import datetime as dt
from typing import Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from auth_service.infra.db.models import User, Session as SessionModel, AuditLog
from auth_service.services.password import verify_password, hash_password
from shared_security_core.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    """
    Authenticate user with username and password.

    Args:
        db: Database session
        username: Username
        password: Plain text password

    Returns:
        User object if authentication successful, None otherwise
    """
    user = db.scalar(select(User).where(User.username == username))

    if not user:
        return None

    if not user.is_active:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_user_tokens(
    db: Session,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Tuple[str, str]:
    """
    Create access and refresh tokens for a user.

    Args:
        db: Database session
        user: User object
        ip_address: Client IP address
        user_agent: Client user agent

    Returns:
        Tuple of (access_token, refresh_token)
    """
    # Load user's role and permissions
    db.refresh(user, ["role"])
    db.refresh(user.role, ["permissions"])

    # Build permissions list
    permissions = [
        {"resource": p.resource, "action": p.action}
        for p in user.role.permissions
    ]

    # Create tokens
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role.name,
        permissions=permissions,
    )

    refresh_token = create_refresh_token(
        user_id=user.id,
        username=user.username,
    )

    # Create session record (for access token only)
    from shared_security_core.auth.jwt_handler import verify_token
    access_payload = verify_token(access_token)

    session = SessionModel(
        user_id=user.id,
        token_jti=access_payload.jti,
        expires_at=dt.datetime.fromtimestamp(access_payload.exp, tz=dt.timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(session)

    # Update last login
    user.last_login = dt.datetime.utcnow()

    db.commit()

    return access_token, refresh_token


def refresh_user_token(
    db: Session,
    refresh_token: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> str:
    """
    Create new access token from refresh token.

    Args:
        db: Database session
        refresh_token: Refresh token
        ip_address: Client IP address
        user_agent: Client user agent

    Returns:
        New access token

    Raises:
        ValueError: If refresh token is invalid or user not found
    """
    # Verify refresh token
    payload = verify_refresh_token(refresh_token)

    # Get user
    user = db.scalar(
        select(User)
        .where(User.id == payload["user_id"])
        .options(joinedload(User.role).joinedload("permissions"))
    )

    if not user or not user.is_active:
        raise ValueError("User not found or inactive")

    # Build permissions
    permissions = [
        {"resource": p.resource, "action": p.action}
        for p in user.role.permissions
    ]

    # Create new access token
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role.name,
        permissions=permissions,
    )

    # Create session record
    from shared_security_core.auth.jwt_handler import verify_token
    access_payload = verify_token(access_token)

    session = SessionModel(
        user_id=user.id,
        token_jti=access_payload.jti,
        expires_at=dt.datetime.fromtimestamp(access_payload.exp, tz=dt.timezone.utc),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(session)
    db.commit()

    return access_token


def revoke_session(db: Session, jti: str) -> bool:
    """
    Revoke a session by JWT ID.

    Args:
        db: Database session
        jti: JWT ID to revoke

    Returns:
        True if session was revoked, False if not found
    """
    session = db.scalar(select(SessionModel).where(SessionModel.token_jti == jti))

    if not session:
        return False

    session.revoked = True
    db.commit()

    return True


def log_audit_event(
    db: Session,
    user_id: int | None,
    action: str,
    resource_type: str | None = None,
    resource_id: int | None = None,
    ip_address: str | None = None,
    details: dict | None = None,
) -> None:
    """
    Log an audit event.

    Args:
        db: Database session
        user_id: User ID performing the action
        action: Action performed (e.g., "login", "create_scan")
        resource_type: Type of resource affected (e.g., "scan", "user")
        resource_id: ID of resource affected
        ip_address: Client IP address
        details: Additional details as JSON
    """
    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        details=details,
    )
    db.add(audit_log)
    db.commit()


def create_user(
    db: Session,
    username: str,
    email: str,
    password: str,
    role_id: int,
    full_name: str | None = None,
) -> User:
    """
    Create a new user.

    Args:
        db: Database session
        username: Username
        email: Email address
        password: Plain text password
        role_id: Role ID
        full_name: Full name (optional)

    Returns:
        Created User object
    """
    hashed_password = hash_password(password)

    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        role_id=role_id,
        full_name=full_name,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
