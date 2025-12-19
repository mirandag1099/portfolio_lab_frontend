"""FastAPI application entry point."""

import uvicorn
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.api.schemas import ErrorResponse
from app.core.config import Environment, settings
from app.core.exceptions import APIException
from app.core.logging import get_logger, setup_logging
from app.core.middleware import LoggingMiddleware

# Configure logging before creating app
setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="PortfolioLab Backend",
    description="Backend API for PortfolioLab portfolio analytics platform",
    version=settings.version,
    debug=settings.debug,
)

# CORS Configuration (Phase 11.4: Production Hardening)
# PRODUCTION SAFETY: No wildcards allowed in production mode
# Explicit origins must be configured via CORS_ORIGINS env var
cors_origins_list = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

    # PRODUCTION GUARD: Fail fast if wildcard detected in production
    # WHY FAIL FAST: Running with insecure CORS in production is worse than not running at all
    # This prevents silent misconfiguration that could expose the API to unauthorized origins
    if settings.env == Environment.PRODUCTION:
        if "*" in cors_origins_list:
            raise ValueError(
                "CORS wildcard (*) is not allowed in production mode. "
                "Set CORS_ORIGINS to explicit comma-separated list of allowed origins. "
                "Example: CORS_ORIGINS=https://app.example.com,https://www.example.com"
            )
        if not cors_origins_list:
            raise ValueError(
                "CORS_ORIGINS must be set in production mode. "
                "Provide explicit comma-separated list of allowed origins. "
                "Example: CORS_ORIGINS=https://app.example.com,https://www.example.com"
            )

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods,
    allow_headers=settings.cors_allow_headers,
)

# Add request/response logging middleware
app.add_middleware(LoggingMiddleware)

# TEMPORARY: Diagnostic check of api_router before inclusion
logger.info("DIAGNOSTIC: Checking api_router before inclusion...")
api_routes_before = [r for r in api_router.routes if hasattr(r, "path")]
logger.info(f"DIAGNOSTIC: api_router has {len(api_routes_before)} route(s) before inclusion")
for r in api_routes_before:
    methods = getattr(r, "methods", set())
    path = getattr(r, "path", "N/A")
    logger.info(f"DIAGNOSTIC:   api_router route before inclusion: {sorted(methods)} {path}")

# Include API router
logger.info(f"DIAGNOSTIC: Including api_router with prefix: {settings.api_v1_prefix}")
app.include_router(api_router, prefix=settings.api_v1_prefix)
logger.info("DIAGNOSTIC: ✓ api_router included in app")


@app.exception_handler(APIException)
async def api_exception_handler(
    request: Request, exc: APIException
) -> JSONResponse:
    """
    Handle custom API exceptions.
    
    CONTRACT RIGIDITY: All error responses must include request_id and context.
    This ensures frontend can reliably trace errors and display contextual information.
    
    OBSERVABILITY: Logs error with request ID and relevant context.
    Note: Middleware already logs unhandled exceptions, so this handler
    only logs API exceptions that were explicitly raised (not unhandled).
    
    Returns structured error response following API contract.
    """
    request_id = getattr(request.state, "request_id", None)
    # OBSERVABILITY: Include exception context (ticker, portfolio info, etc.) in log
    # but NOT sensitive data or predicted values
    log_extra = {
        "request_id": request_id,
        "error_code": exc.error_code,
        "status_code": exc.status_code,
        "path": request.url.path,
        "event": "api_exception",
    }
    # Add context from exception if available (ticker, dates, etc.)
    if hasattr(exc, "context") and exc.context:
        log_extra.update(exc.context)
    
    logger.warning(
        f"API exception: {exc.error_code} - {exc.message}",
        extra=log_extra,
    )
    
    # CONTRACT RIGIDITY: Error response must include request_id and context
    # Defensive assertion: request_id should always be present (set by middleware)
    if request_id is None:
        logger.error(
            "Missing request_id in API exception handler - this should never happen",
            extra={"path": request.url.path, "error_code": exc.error_code},
        )
        request_id = "unknown"  # Fallback to prevent contract violation
    
    # CONTRACT RIGIDITY: context field is always present (empty dict if no context)
    error_context = exc.context if hasattr(exc, "context") and exc.context else {}
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error={
                "code": exc.error_code,
                "message": exc.message,
                "request_id": request_id,
                "context": error_context,
            }
        ).model_dump(),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Handle HTTP exceptions (404, etc.).
    
    CONTRACT RIGIDITY: All error responses must include request_id and context.
    
    OBSERVABILITY: Logs error with request ID for traceability.
    
    Returns structured error response following API contract.
    """
    request_id = getattr(request.state, "request_id", None)
    error_code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
    
    logger.warning(
        f"HTTP exception: {error_code} - {exc.detail}",
        extra={
            "request_id": request_id,
            "error_code": error_code,
            "status_code": exc.status_code,
            "path": request.url.path,
            "event": "http_exception",
        },
    )
    
    # CONTRACT RIGIDITY: Error response must include request_id and context
    if request_id is None:
        logger.error(
            "Missing request_id in HTTP exception handler - this should never happen",
            extra={"path": request.url.path, "error_code": error_code},
        )
        request_id = "unknown"  # Fallback to prevent contract violation
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error={
                "code": error_code,
                "message": exc.detail,
                "request_id": request_id,
                "context": {},  # CONTRACT RIGIDITY: context always present (empty if no additional context)
            }
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle request validation errors.
    
    CONTRACT RIGIDITY: All error responses must include request_id and context.
    
    Returns structured error response following API contract.
    """
    errors = exc.errors()
    error_messages = [f"{err['loc']}: {err['msg']}" for err in errors]
    message = "; ".join(error_messages)
    
    request_id = getattr(request.state, "request_id", None)
    logger.warning(
        f"Validation error: {message}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "errors": errors,
            "event": "validation_error",
        },
    )
    
    # CONTRACT RIGIDITY: Error response must include request_id and context
    if request_id is None:
        logger.error(
            "Missing request_id in validation exception handler - this should never happen",
            extra={"path": request.url.path},
        )
        request_id = "unknown"  # Fallback to prevent contract violation
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error={
                "code": "VALIDATION_ERROR",
                "message": message,
                "request_id": request_id,
                "context": {
                    "validation_errors": errors,  # CONTRACT RIGIDITY: Include validation errors in context
                },
            }
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """
    Handle unexpected exceptions.
    
    CONTRACT RIGIDITY: All error responses must include request_id and context.
    
    OBSERVABILITY: Logs unhandled exceptions with request ID.
    Note: Middleware also logs exceptions, but this handler provides
    additional context before returning error response.
    
    Returns structured error response following API contract.
    """
    request_id = getattr(request.state, "request_id", None)
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
            "event": "unhandled_exception",
        },
        exc_info=True,
    )
    
    message = (
        "Internal server error"
        if not settings.debug
        else f"Internal server error: {str(exc)}"
    )
    
    # CONTRACT RIGIDITY: Error response must include request_id and context
    if request_id is None:
        logger.error(
            "Missing request_id in general exception handler - this should never happen",
            extra={"path": request.url.path, "exception_type": type(exc).__name__},
        )
        request_id = "unknown"  # Fallback to prevent contract violation
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error={
                "code": "INTERNAL_SERVER_ERROR",
                "message": message,
                "request_id": request_id,
                "context": {
                    "exception_type": type(exc).__name__,
                } if settings.debug else {},  # CONTRACT RIGIDITY: context always present
            }
        ).model_dump(),
    )


@app.on_event("startup")
async def startup_event() -> None:
    """
    Production-safe startup self-check (Phase 11.4).
    
    WHY THESE CHECKS EXIST:
    - Prevents silent misconfiguration in production
    - Ensures required environment variables are set
    - Logs critical configuration for operational visibility
    - Fails fast if production environment is misconfigured
    
    WHY FAIL FAST:
    - Running misconfigured in production is worse than not running at all
    - Early failure prevents data corruption, security issues, or degraded UX
    - Clear error messages guide deployment fixes
    """
    from pathlib import Path
    from app.data.providers.yahoo import YahooFinanceProvider
    from app.trades.providers.edgar import EdgarForm4Provider
    from app.trades.providers.quiver import QuiverTradeProvider
    from app.data.persistence import FileStorage
    
    # PRODUCTION GUARD: Fail fast if required env vars are missing in production
    # This prevents silent misconfiguration that could cause security or data issues
    if settings.env == Environment.PRODUCTION:
        # CORS origins must be explicitly set (already validated above, but log for visibility)
        cors_origins_list = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
        logger.info(
            "PRODUCTION: CORS origins configured",
            extra={"cors_origins_count": len(cors_origins_list)},
        )
        
        # Log warning if debug mode is enabled in production (should not happen)
        if settings.debug:
            logger.warning(
                "PRODUCTION WARNING: Debug mode is enabled in production. "
                "This exposes error details and should be disabled.",
            )
        
        # Log warning if log level is DEBUG in production
        if settings.log_level.upper() == "DEBUG":
            logger.warning(
                "PRODUCTION WARNING: Log level is DEBUG in production. "
                "This may expose sensitive information and should be set to INFO or higher.",
            )
    
    # STARTUP SELF-CHECK: Log environment and configuration
    logger.info(
        "Application startup complete",
        extra={
            "version": settings.version,
            "environment": settings.environment,
            "host": settings.host,
            "port": settings.port,
            "api_prefix": settings.api_v1_prefix,
            "debug_mode": settings.debug,
            "log_level": settings.log_level,
        },
    )
    
    # STARTUP SELF-CHECK: Log enabled providers
    enabled_providers = []
    
    # Check Yahoo Finance (always available, no API key required)
    yahoo_provider = YahooFinanceProvider()
    enabled_providers.append("yahoo")
    
    # Check Quiver (requires API key and feature flag)
    quiver_provider = QuiverTradeProvider()
    if await quiver_provider.is_available():
        enabled_providers.append("quiver")
    
    # Check EDGAR (always available, no API key required)
    edgar_provider = EdgarForm4Provider()
    enabled_providers.append("edgar")
    
    logger.info(
        "Enabled providers",
        extra={
            "providers": enabled_providers,
            "quiver_enabled": settings.quiver_enabled,
            "trades_endpoints_enabled": settings.trades_endpoints_enabled,
        },
    )
    
    # STARTUP SELF-CHECK: Log replay mode status
    replay_mode_available = False
    if settings.data_storage_path:
        storage_path = Path(settings.data_storage_path)
        if not storage_path.is_absolute():
            storage_path = Path.cwd() / storage_path
        
        # Check if storage directories exist (indicates replay mode is configured)
        yahoo_storage_path = storage_path / "yahoo"
        edgar_storage_path = storage_path / "edgar"
        fama_french_storage_path = storage_path / "fama_french"
        
        replay_mode_available = (
            yahoo_storage_path.exists() or
            edgar_storage_path.exists() or
            fama_french_storage_path.exists()
        )
        
        logger.info(
            "Replay mode status",
            extra={
                "replay_mode_configured": bool(settings.data_storage_path),
                "storage_path": str(storage_path),
                "replay_mode_available": replay_mode_available,
                "yahoo_storage_exists": yahoo_storage_path.exists(),
                "edgar_storage_exists": edgar_storage_path.exists(),
                "fama_french_storage_exists": fama_french_storage_path.exists(),
            },
        )
    else:
        logger.info(
            "Replay mode status",
            extra={
                "replay_mode_configured": False,
                "replay_mode_available": False,
            },
        )
    
    # PRODUCTION SAFETY CHECK: Verify app is production-safe
    production_safe = True
    safety_issues = []
    
    if settings.env == Environment.PRODUCTION:
        if settings.debug:
            production_safe = False
            safety_issues.append("Debug mode enabled")
        
        if settings.log_level.upper() == "DEBUG":
            production_safe = False
            safety_issues.append("Debug log level enabled")
        
        cors_origins_list_check = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
        if "*" in cors_origins_list_check:
            production_safe = False
            safety_issues.append("CORS wildcard allowed")
        
        if not cors_origins_list_check:
            production_safe = False
            safety_issues.append("No CORS origins configured")
    
    if production_safe:
        logger.info("Production safety check: PASSED")
    else:
        logger.error(
            "Production safety check: FAILED",
            extra={"safety_issues": safety_issues},
        )
        # Fail fast if production is misconfigured
        if settings.env == Environment.PRODUCTION:
            raise RuntimeError(
                f"Production environment is misconfigured. Issues: {', '.join(safety_issues)}. "
                "Fix configuration before deploying to production."
            )


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    """
    Simple infrastructure health check endpoint.
    
    Returns plain JSON without response envelope.
    Used by load balancers, monitoring, and infrastructure checks.
    """
    return {"status": "ok"}


@app.get("/")
async def root() -> dict[str, str]:
    """
    Root endpoint (non-API, returns simple info).
    
    Note: This endpoint is outside the /api/v1 namespace
    and uses a simple response format for API discovery.
    """
    return {
        "message": "PortfolioLab Backend API",
        "version": settings.version,
        "docs": "/docs",
    }


if __name__ == "__main__":
    # Canonical startup: Use python -m uvicorn for production
    # Example: python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
    # This block is for convenience during development only
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

