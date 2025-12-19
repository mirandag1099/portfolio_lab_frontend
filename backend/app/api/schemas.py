"""API response schemas for consistent contract.

CONTRACT RIGIDITY (API Hardening):
- All success responses use APIResponse envelope (data + metadata)
- All error responses use ErrorResponse envelope (error with code, message, request_id, context)
- Metadata is always present (never None) - use empty dict if no metadata
- Empty arrays are always [] (never null)
- Optional fields are explicit (either present or absent, not null)
"""

from typing import Any, Optional

from pydantic import BaseModel, Field


class APIResponse(BaseModel):
    """
    Standard API response envelope.
    
    CONTRACT RIGIDITY: Metadata is always present (never None).
    Use empty dict {} if no metadata is needed.
    
    All successful API responses follow this structure:
    {
        "data": {...},
        "metadata": {...}  // Always present, never null
    }
    """

    data: Any = Field(..., description="Response data payload")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Response metadata (pagination, timestamps, etc.). Always present, never null.",
    )


class ErrorResponse(BaseModel):
    """
    Standard error response structure.
    
    CONTRACT RIGIDITY: All error responses must include:
    - code: Machine-readable error code
    - message: Human-readable error message
    - request_id: Unique request identifier for traceability
    - context: Optional additional context (ticker, dates, etc.)
    
    All error responses follow this structure:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human-readable error message",
            "request_id": "uuid-string",
            "context": {...}  // Optional, but field is always present
        }
    }
    """

    error: dict[str, Any] = Field(
        ...,
        description="Error details with code, message, request_id, and optional context",
        example={
            "code": "NOT_FOUND",
            "message": "Resource not found",
            "request_id": "550e8400-e29b-41d4-a716-446655440000",
            "context": {},
        },
    )

