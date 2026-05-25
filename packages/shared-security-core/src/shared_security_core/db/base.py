"""
SQLAlchemy base classes for all models.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy models.

    All database models should inherit from this class.

    Example:
        from shared_security_core.db import Base

        class User(Base):
            __tablename__ = "users"
            # ... fields
    """

    pass
