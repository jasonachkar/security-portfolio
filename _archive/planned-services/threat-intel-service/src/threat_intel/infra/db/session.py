"""Database session management."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from threat_intel.infra.settings import Settings

settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True, echo=settings.app_env == "local")

SessionFactory = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_session_factory() -> sessionmaker:
    """Get database session factory."""
    return SessionFactory


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for database sessions."""
    session = SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    db = SessionFactory()
    try:
        yield db
    finally:
        db.close()
