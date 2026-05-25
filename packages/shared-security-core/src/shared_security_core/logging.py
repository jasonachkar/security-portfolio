"""
Standardized logging configuration for all security platform services.

Uses structlog for structured logging with JSON output in production.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog


def configure_logging(service_name: str, log_level: str = "INFO") -> None:
    """
    Configure structured logging for a service.

    Args:
        service_name: Name of the service (e.g., "auth-service", "vuln-scanner")
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Example:
        >>> from shared_security_core.logging import configure_logging
        >>> configure_logging("vulnerability-scanner", "INFO")
    """
    # Set log level
    level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),  # JSON output for production
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Add service name to context
    structlog.contextvars.bind_contextvars(service=service_name)


def get_logger(name: str) -> Any:
    """
    Get a structured logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Structlog logger instance

    Example:
        >>> from shared_security_core.logging import get_logger
        >>> log = get_logger(__name__)
        >>> log.info("scan_started", scan_id=123, target="https://example.com")
    """
    return structlog.get_logger(name)
