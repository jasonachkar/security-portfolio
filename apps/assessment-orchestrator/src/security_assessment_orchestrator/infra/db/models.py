from __future__ import annotations

import datetime as dt
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    target: Mapped[str] = mapped_column(String(2048), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=dt.datetime.utcnow)
    finished_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="assessment", cascade="all, delete-orphan")


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[int] = mapped_column(ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)

    kind: Mapped[str] = mapped_column(String(64), nullable=False)  # nmap|zap|trivy
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)  # text/plain|application/json
    content: Mapped[str] = mapped_column(Text, nullable=False)

    assessment: Mapped["Assessment"] = relationship(back_populates="artifacts")
