"""Health check endpoint."""

from fastapi import APIRouter

from shared_security_core.models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="auth-service",
        version="0.1.0",
    )
