"""Health check endpoint."""

from fastapi import APIRouter

from app.api.schemas import APIResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=APIResponse)
async def health_check() -> APIResponse:
    """
    Health check endpoint.
    
    Returns structured response following API contract:
    {
        "data": {
            "status": "ok",
            "service": "portfoliolab-backend"
        },
        "metadata": {}
    }
    """
    return APIResponse(
        data={
            "status": "ok",
            "service": settings.service_name,
        },
        metadata={},
    )

