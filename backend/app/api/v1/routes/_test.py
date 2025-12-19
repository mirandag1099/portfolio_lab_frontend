"""Internal test-only endpoints.

These endpoints are temporary and intended for internal testing of Phase 1-3 functionality.
They verify routing, logging, middleware, exception handling, and configuration loading.
"""

from fastapi import APIRouter

from app.api.schemas import APIResponse
from app.core.config import settings

router = APIRouter()


@router.get("/ping", response_model=APIResponse)
async def ping() -> APIResponse:
    """
    Ping endpoint to verify routing, logging, middleware, and exception handling.
    
    Returns:
        APIResponse with {"pong": true}
    """
    return APIResponse(
        data={"pong": True},
        metadata={},
    )


@router.get("/settings", response_model=APIResponse)
async def get_settings() -> APIResponse:
    """
    Settings endpoint to verify Settings loading and environment wiring.
    
    Returns safe, non-sensitive configuration values:
    - environment: Current environment (local/development/production)
    - debug: Whether debug mode is enabled
    - api_v1_prefix: API v1 route prefix
    - version: Application version
    
    Note: API keys and sensitive values are intentionally excluded.
    """
    return APIResponse(
        data={
            "environment": settings.environment,
            "debug": settings.debug,
            "api_v1_prefix": settings.api_v1_prefix,
            "version": settings.version,
        },
        metadata={},
    )

