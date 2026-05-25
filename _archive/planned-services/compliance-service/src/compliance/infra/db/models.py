"""
Database models for compliance service.

Models:
    - ComplianceFramework: Framework definitions (NIST, PCI-DSS, CIS)
    - ComplianceControl: Individual controls within frameworks
    - ComplianceReport: Generated compliance reports
    - FindingControlMapping: Maps findings to controls
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class ComplianceFramework(Base):
    """Compliance framework (NIST, PCI-DSS, CIS)."""
    __tablename__ = "compliance_frameworks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)

    # Relationships
    controls: Mapped[list["ComplianceControl"]] = relationship(back_populates="framework", cascade="all, delete-orphan")
    reports: Mapped[list["ComplianceReport"]] = relationship(back_populates="framework")


class ComplianceControl(Base):
    """Individual control within a compliance framework."""
    __tablename__ = "compliance_controls"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    framework_id: Mapped[int] = mapped_column(ForeignKey("compliance_frameworks.id", ondelete="CASCADE"), nullable=False, index=True)
    control_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)  # HIGH, MEDIUM, LOW
    implementation_guidance: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    framework: Mapped["ComplianceFramework"] = relationship(back_populates="controls")


class ComplianceReport(Base):
    """Generated compliance report."""
    __tablename__ = "compliance_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    framework_id: Mapped[int] = mapped_column(ForeignKey("compliance_frameworks.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)

    # Report period
    report_period_start: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    report_period_end: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Metadata
    generated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    generated_by: Mapped[int] = mapped_column(Integer, nullable=False)  # User ID
    status: Mapped[str] = mapped_column(String(20), default="generating", nullable=False)  # generating, completed, failed

    # Report output
    file_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    framework: Mapped["ComplianceFramework"] = relationship(back_populates="reports")


class FindingControlMapping(Base):
    """Maps findings from security services to compliance controls."""
    __tablename__ = "finding_control_mappings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Finding reference
    source_service: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_finding_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Control reference
    control_id: Mapped[int] = mapped_column(ForeignKey("compliance_controls.id"), nullable=False, index=True)

    # Mapping metadata
    compliance_status: Mapped[str] = mapped_column(String(20), nullable=False)  # compliant, non_compliant, partial
    mapped_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    mapped_by: Mapped[str | None] = mapped_column(String(50), nullable=True)  # auto or user_id
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    control: Mapped["ComplianceControl"] = relationship()
