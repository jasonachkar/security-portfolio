"""
Database models for alert correlation.

Models:
    - Alert: Unified alert from any security service
    - Incident: Security incident grouping related alerts
    - IncidentTimelineEvent: Timeline of incident response actions
    - CorrelationRule: Custom rules for auto-correlating alerts
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Alert(Base):
    """Unified alert from any security service."""
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Source tracking
    source_service: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_id: Mapped[int] = mapped_column(Integer, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Alert details
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # critical, high, medium, low, info
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False, index=True)  # open, investigating, resolved, false_positive

    # Asset and context
    affected_asset: Mapped[str | None] = mapped_column(String(512), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    alert_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Timestamps
    detected_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Assignment and incident linking
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    assigned_to: Mapped[int | None] = mapped_column(Integer, nullable=True)  # User ID from auth service

    # Relationships
    incident: Mapped["Incident"] = relationship(back_populates="alerts")

    __table_args__ = (UniqueConstraint('source_service', 'source_id', name='_source_alert_uc'),)


class Incident(Base):
    """Security incident grouping related alerts."""
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Incident details
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False, index=True)  # open, investigating, contained, resolved

    # Classification
    incident_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mitre_tactics: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Timestamps
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    detected_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Ownership
    assigned_to: Mapped[int | None] = mapped_column(Integer, nullable=True)  # User ID
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)  # User ID

    # Relationships
    alerts: Mapped[list["Alert"]] = relationship(back_populates="incident")
    timeline_events: Mapped[list["IncidentTimelineEvent"]] = relationship(back_populates="incident", cascade="all, delete-orphan")


class IncidentTimelineEvent(Base):
    """Timeline of incident response actions."""
    __tablename__ = "incident_timeline_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)

    timestamp: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)  # detection, containment, analysis, note, resolution
    description: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # User who performed action
    event_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    incident: Mapped["Incident"] = relationship(back_populates="timeline_events")


class CorrelationRule(Base):
    """Custom rules for auto-correlating alerts into incidents."""
    __tablename__ = "correlation_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Rule definition
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Rule conditions (stored as JSON)
    conditions: Mapped[dict] = mapped_column(JSONB, nullable=False)
    time_window_seconds: Mapped[int] = mapped_column(Integer, default=3600, nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Actions
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    auto_create_incident: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    incident_title_template: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Metadata
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
