"""FastAPI middleware for request/response logging."""

import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger
from app.core.request_context import set_request_id, get_request_id

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log HTTP requests and responses."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process request and log details.
        
        OBSERVABILITY: Generates unique request ID and propagates it through context.
        All logs during this request will include the request ID for traceability.
        
        Logs:
        - Request ID (unique per request)
        - Request method and path
        - Response status code
        - Request duration in milliseconds
        - Client IP address
        
        Does NOT log:
        - Request bodies (PII risk)
        - Response bodies (PII risk)
        - Headers (may contain sensitive data)
        """
        start_time = time.time()
        
        # OBSERVABILITY: Generate unique request ID and set in context
        # This propagates automatically to all async operations during this request
        request_id = set_request_id()
        
        # Extract request details
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        
        # Store request ID in request state for access in exception handlers
        request.state.request_id = request_id
        
        # Log request with request ID
        logger.info(
            f"{method} {path}",
            extra={
                "request_id": request_id,
                "method": method,
                "path": path,
                "client_ip": client_ip,
                "event": "request_started",
            },
        )
        
        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            # OBSERVABILITY: Log exception with request ID for traceability
            # This is the primary error log - exception handlers should NOT duplicate this
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"{method} {path} - Exception: {str(e)}",
                extra={
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "client_ip": client_ip,
                    "duration_ms": round(duration_ms, 2),
                    "event": "request_error",
                    "error": str(e),
                    "exception_type": type(e).__name__,
                },
                exc_info=True,
            )
            raise
        
        # Calculate duration
        duration_ms = (time.time() - start_time) * 1000
        
        # Log response
        log_level = (
            logging.ERROR
            if status_code >= 500
            else logging.WARNING
            if status_code >= 400
            else logging.INFO
        )
        
        logger.log(
            log_level,
            f"{method} {path} - {status_code} - {duration_ms:.2f}ms",
            extra={
                "request_id": request_id,
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": client_ip,
                "event": "request_completed",
            },
        )
        
        return response

