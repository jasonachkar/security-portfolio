"""
RBAC (Role-Based Access Control) middleware for FastAPI endpoints.

Usage:
    @router.get("/", dependencies=[Depends(require_permission("scans", "read"))])
    def list_scans(current_user: TokenPayload = Depends(require_jwt_token)):
        # current_user contains user_id, username, role, permissions
        pass
"""

from __future__ import annotations

from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .jwt_handler import TokenPayload, verify_token

# HTTP Bearer security scheme for OpenAPI docs
bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenPayload:
    """
    Validate JWT from Authorization header and return TokenPayload.

    This is the base dependency that all other auth dependencies build upon.

    Args:
        credentials: HTTP Authorization header credentials

    Returns:
        TokenPayload with user information and permissions

    Raises:
        HTTPException(401): If token is invalid or expired
    """
    token = credentials.credentials

    try:
        payload = verify_token(token)
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_jwt_token(
    current_user: TokenPayload = Depends(get_current_user),
) -> TokenPayload:
    """
    Require valid JWT token (alias for get_current_user for clarity).

    Use this as a dependency when you only need to verify authentication,
    not specific permissions.

    Example:
        @router.get("/profile")
        def get_profile(current_user: TokenPayload = Depends(require_jwt_token)):
            return {"user_id": current_user.user_id}
    """
    return current_user


def has_permission(user: TokenPayload, resource: str, action: str) -> bool:
    """
    Check if user has permission for a specific resource and action.

    Args:
        user: TokenPayload with user information
        resource: Resource name (e.g., "scans", "users", "alerts")
        action: Action name (e.g., "create", "read", "update", "delete")

    Returns:
        True if user has permission, False otherwise

    Permission Logic:
        - Wildcard "*:*" grants all permissions (typically Admin role)
        - Wildcard "*:read" grants read access to all resources (typically Auditor role)
        - Specific "resource:action" grants exact permission
    """
    # Check for wildcard permission (Admin: *:*)
    if any(p.get("resource") == "*" and p.get("action") == "*" for p in user.permissions):
        return True

    # Check for wildcard action on any resource (*:action)
    if any(p.get("resource") == "*" and p.get("action") == action for p in user.permissions):
        return True

    # Check for wildcard action on specific resource (resource:*)
    if any(p.get("resource") == resource and p.get("action") == "*" for p in user.permissions):
        return True

    # Check for exact permission match
    if any(
        p.get("resource") == resource and p.get("action") == action
        for p in user.permissions
    ):
        return True

    return False


def require_permission(resource: str, action: str) -> Callable:
    """
    Decorator factory for permission checks.

    Creates a FastAPI dependency that verifies the user has the required permission.

    Args:
        resource: Resource name (e.g., "scans", "users")
        action: Action name (e.g., "create", "read", "update", "delete")

    Returns:
        FastAPI dependency function

    Example:
        @router.post("/scans", dependencies=[Depends(require_permission("scans", "create"))])
        def create_scan(current_user: TokenPayload = Depends(require_jwt_token)):
            # This endpoint requires "scans:create" permission
            pass

    Raises:
        HTTPException(403): If user lacks required permission
    """

    async def check_permission(
        current_user: TokenPayload = Depends(require_jwt_token),
    ) -> TokenPayload:
        """Check if current user has required permission."""
        if not has_permission(current_user, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {resource}:{action}",
            )
        return current_user

    # Set function name for better debugging and OpenAPI docs
    check_permission.__name__ = f"require_{resource}_{action}"

    return check_permission


def require_role(required_role: str) -> Callable:
    """
    Decorator factory for role checks.

    Creates a FastAPI dependency that verifies the user has the required role.

    Args:
        required_role: Required role name (e.g., "Admin", "Analyst")

    Returns:
        FastAPI dependency function

    Example:
        @router.get("/admin/stats", dependencies=[Depends(require_role("Admin"))])
        def get_admin_stats(current_user: TokenPayload = Depends(require_jwt_token)):
            # Only Admin can access this endpoint
            pass

    Raises:
        HTTPException(403): If user doesn't have required role
    """

    async def check_role(
        current_user: TokenPayload = Depends(require_jwt_token),
    ) -> TokenPayload:
        """Check if current user has required role."""
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}",
            )
        return current_user

    # Set function name for better debugging
    check_role.__name__ = f"require_role_{required_role.lower()}"

    return check_role
