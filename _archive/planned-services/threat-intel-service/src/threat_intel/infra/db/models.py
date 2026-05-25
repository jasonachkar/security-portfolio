"""
Database models for threat intelligence.

Models:
    - CVEEntry: CVE vulnerability data from NVD
    - MitreAttackTechnique: MITRE ATT&CK techniques
    - ThreatFeed: Threat intelligence feed sources
    - ThreatIndicator: IOCs (IP, domain, hash, URL)
    - FindingEnrichment: Links to findings in other services
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class CVEEntry(Base):
    """CVE vulnerability data from NVD API"""
    __tablename__ = "cve_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cve_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)

    published_date: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_modified: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cvss_v3_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_v3_vector: Mapped[str | None] = mapped_column(String(100), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(20), nullable=True)

    cwe_ids: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    references: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow, nullable=False)


class MitreAttackTechnique(Base):
    """MITRE ATT&CK techniques for threat mapping"""
    __tablename__ = "mitre_attack_techniques"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    technique_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    tactics: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    platforms: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    data_sources: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    detection: Mapped[str | None] = mapped_column(Text, nullable=True)
    mitigations: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow, nullable=False)


class ThreatFeed(Base):
    """Threat intelligence feed sources"""
    __tablename__ = "threat_feeds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    feed_type: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_updated: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    update_frequency: Mapped[int] = mapped_column(Integer, default=3600, nullable=False)

    indicators: Mapped[list["ThreatIndicator"]] = relationship(back_populates="feed", cascade="all, delete-orphan")


class ThreatIndicator(Base):
    """Indicators of Compromise (IOCs) from threat feeds"""
    __tablename__ = "threat_indicators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    feed_id: Mapped[int] = mapped_column(ForeignKey("threat_feeds.id", ondelete="CASCADE"), nullable=False, index=True)

    indicator_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    value: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    confidence: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    indicator_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    first_seen: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    last_seen: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    expires_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    feed: Mapped["ThreatFeed"] = relationship(back_populates="indicators")


class FindingEnrichment(Base):
    """Links findings from other services to threat intel"""
    __tablename__ = "finding_enrichments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    source_service: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_finding_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)

    cve_ids: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    mitre_techniques: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    matched_indicators: Mapped[list[int] | None] = mapped_column(ARRAY(Integer), nullable=True)

    enriched_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow, nullable=False)
    enrichment_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (UniqueConstraint('source_service', 'source_finding_id', name='_source_finding_uc'),)
