"""
Shared Pydantic models for API requests and responses.

These models ensure consistent data structures across all services.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    """Standard severity levels across the platform"""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, Enum):
    """Alert status lifecycle"""

    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class ScanStatus(str, Enum):
    """Scan status lifecycle"""

    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# Base models for common response structures


class AlertBase(BaseModel):
    """Base alert model for cross-service alert ingestion"""

    source_service: str = Field(..., description="Service that generated the alert")
    source_id: int = Field(..., description="ID in source service")
    source_type: str = Field(..., description="Type of source (finding, anomaly, etc.)")
    title: str = Field(..., description="Alert title")
    description: str = Field(..., description="Alert description")
    severity: SeverityLevel
    affected_asset: str | None = Field(None, description="Affected asset (IP, URL, etc.)")
    tags: list[str] = Field(default_factory=list)
    detected_at: datetime


class AlertResponse(AlertBase):
    """Alert API response model"""

    id: int
    status: AlertStatus
    created_at: datetime
    updated_at: datetime
    incident_id: int | None = None
    assigned_to: int | None = None

    class Config:
        from_attributes = True


class FindingEnrichmentData(BaseModel):
    """Threat intelligence enrichment data"""

    cve_ids: list[str] = Field(default_factory=list)
    mitre_techniques: list[str] = Field(default_factory=list)
    matched_indicators: list[int] = Field(default_factory=list)
    enriched_at: datetime


class ErrorResponse(BaseModel):
    """Standard error response"""

    detail: str
    error_code: str | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Standard health check response"""

    status: str = "healthy"
    service: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


__all__ = [
    "SeverityLevel",
    "AlertStatus",
    "ScanStatus",
    "AlertBase",
    "AlertResponse",
    "FindingEnrichmentData",
    "ErrorResponse",
    "HealthResponse",
]
