"""Logging configuration and setup."""

import logging
import sys
from typing import Any, Dict

from app.core.config import get_log_level, settings
from app.core.request_context import get_request_id


def setup_logging() -> None:
    """
    Configure application-wide logging.
    
    Sets up structured logging with timestamps and configurable log level.
    
    PRODUCTION SAFETY (Phase 11.4): DEBUG logs are disabled in production
    to prevent exposure of sensitive information. Log level is enforced
    based on environment.
    """
    from app.core.config import Environment
    
    log_level = get_log_level()
    
    # PRODUCTION GUARD: Disable DEBUG logs in production
    # DEBUG logs may contain sensitive information and should not be enabled in production
    if settings.env == Environment.PRODUCTION and log_level == logging.DEBUG:
        import warnings
        warnings.warn(
            "DEBUG log level is not allowed in production. "
            "Setting log level to INFO for production safety.",
            RuntimeWarning,
        )
        log_level = logging.INFO
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ],
    )
    
    # Set log levels for third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    
    # Get application logger
    logger = logging.getLogger("portfoliolab")
    logger.setLevel(log_level)
    
    logger.info(
        "Logging configured",
        extra={
            "log_level": settings.log_level,
            "effective_log_level": logging.getLevelName(log_level),
            "environment": settings.environment,
        },
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.
    
    OBSERVABILITY: Returns a logger that automatically includes request ID
    in all log records via a custom adapter.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Configured logger instance with request ID support
    """
    base_logger = logging.getLogger(f"portfoliolab.{name}")
    return RequestIdLoggerAdapter(base_logger)


class RequestIdLoggerAdapter(logging.LoggerAdapter):
    """
    Logger adapter that automatically adds request ID to all log records.
    
    OBSERVABILITY: Ensures every log entry includes request_id for traceability,
    without requiring explicit request_id in every log call.
    """
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        """
        Process log message and add request ID to extra context.
        
        Args:
            msg: Log message
            kwargs: Log keyword arguments (including 'extra' dict)
            
        Returns:
            Tuple of (message, kwargs) with request_id added to extra
        """
        # Get request ID from context
        request_id = get_request_id()
        
        # Ensure 'extra' dict exists
        if "extra" not in kwargs:
            kwargs["extra"] = {}
        
        # Add request_id if available (don't override if already set)
        if request_id is not None and "request_id" not in kwargs["extra"]:
            kwargs["extra"]["request_id"] = request_id
        
        return msg, kwargs

