"""
JWT token generation and validation using PyJWT.

Tokens contain: user_id, username, role, permissions.
Access tokens expire in 15 minutes, refresh tokens in 7 days.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pydantic import BaseModel, Field


class TokenPayload(BaseModel):
    """JWT token payload"""

    user_id: int
    username: str
    role: str
    permissions: list[dict[str, str]]  # [{resource: str, action: str}]
    exp: int
    iat: int
    jti: str  # JWT ID for revocation tracking


# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-please-use-strong-secret")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(
    user_id: int,
    username: str,
    role: str,
    permissions: list[dict[str, str]],
) -> str:
    """
    Generate JWT access token.

    Args:
        user_id: User ID from database
        username: Username
        role: User role (Admin, Analyst, Auditor)
        permissions: List of permission dicts [{resource: str, action: str}]

    Returns:
        Encoded JWT token string

    Example:
        >>> token = create_access_token(1, "admin", "Admin", [{"resource": "*", "action": "*"}])
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "permissions": permissions,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),  # Unique token ID
        "type": "access",
    }

    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: int, username: str) -> str:
    """
    Generate JWT refresh token.

    Refresh tokens are long-lived and used to obtain new access tokens.

    Args:
        user_id: User ID from database
        username: Username

    Returns:
        Encoded JWT refresh token string
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "user_id": user_id,
        "username": username,
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": str(uuid.uuid4()),
        "type": "refresh",
    }

    encoded_jwt = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> TokenPayload:
    """
    Verify and decode JWT token.

    Args:
        token: JWT token string

    Returns:
        TokenPayload with decoded claims

    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is invalid
        ValueError: If token type is not 'access'
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        # Verify token type
        if payload.get("type") != "access":
            raise ValueError("Invalid token type - expected access token")

        return TokenPayload(
            user_id=payload["user_id"],
            username=payload["username"],
            role=payload["role"],
            permissions=payload["permissions"],
            exp=payload["exp"],
            iat=payload["iat"],
            jti=payload["jti"],
        )
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Token has expired")
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid token: {str(e)}")


def verify_refresh_token(token: str) -> dict[str, Any]:
    """
    Verify and decode JWT refresh token.

    Args:
        token: JWT refresh token string

    Returns:
        Dict with user_id, username, jti

    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is invalid
        ValueError: If token type is not 'refresh'
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        # Verify token type
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type - expected refresh token")

        return {
            "user_id": payload["user_id"],
            "username": payload["username"],
            "jti": payload["jti"],
        }
    except jwt.ExpiredSignatureError:
        raise jwt.ExpiredSignatureError("Refresh token has expired")
    except jwt.InvalidTokenError as e:
        raise jwt.InvalidTokenError(f"Invalid refresh token: {str(e)}")
