"""Application exceptions."""

from typing import Any, Dict, Optional


class APIException(Exception):
    """
    Base exception for API errors.
    
    OBSERVABILITY: All API exceptions include context for debugging.
    Context should include relevant identifiers (ticker, portfolio info, etc.)
    but NOT sensitive data or derived/predicted values.
    
    ERROR DETERMINISM (Phase 11.3): Identical invalid requests must produce
    identical errors. Same failure conditions always yield same error code,
    message, and context structure. This ensures frontend can reliably handle
    errors without flickering or inconsistent UI states.
    
    WHY ERROR DETERMINISM MATTERS:
    - Frontend rendering relies on consistent error codes and messages
    - Same invalid request must always produce same error (no variation)
    - Error codes enable stable frontend error handling logic
    - Consistent context structure enables predictable error UI rendering
    
    All API exceptions should inherit from this to ensure
    consistent error handling.
    """

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Initialize API exception.
        
        ERROR DETERMINISM (Phase 11.3): Message must be descriptive, factual, and
        non-prescriptive. No internal implementation details, no recommendations,
        no ambiguous phrasing. Same failure always produces same message.
        
        Args:
            message: Human-readable error message with sufficient context.
                    Must be frontend-safe: descriptive, factual, non-prescriptive.
                    Must NOT include internal implementation details.
            status_code: HTTP status code
            error_code: Machine-readable error code
            context: Optional additional context for debugging (ticker, portfolio info, etc.)
                    Must NOT include sensitive data or predicted values.
                    Must be consistent structure for same failure type.
        """
        # ERROR DETERMINISM ASSERTION: Ensure message is not None or empty
        # Same failure must always produce same non-empty message
        assert message and message.strip(), "Error message cannot be empty"
        
        self.message = message.strip()
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        # ERROR DETERMINISM: Ensure context is always a dict (never None)
        # Same failure must always produce same context structure
        self.context = context or {}
        super().__init__(self.message)


class NotFoundError(APIException):
    """Resource not found error."""

    def __init__(self, message: str = "Resource not found", context: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message, status_code=404, error_code="NOT_FOUND", context=context)


class BadRequestError(APIException):
    """Bad request error."""

    def __init__(self, message: str = "Bad request", context: Optional[Dict[str, Any]] = None) -> None:
        super().__init__(message, status_code=400, error_code="BAD_REQUEST", context=context)


class ProviderUnavailableError(APIException):
    """
    Provider unavailable error.
    
    OBSERVABILITY: Distinguishes provider outages from missing data.
    Use this when a provider cannot be reached or is misconfigured,
    NOT when data simply doesn't exist (use NotFoundError for that).
    """

    def __init__(self, message: str, provider_name: str, context: Optional[Dict[str, Any]] = None) -> None:
        """
        Initialize provider unavailable error.
        
        Args:
            message: Human-readable error message
            provider_name: Name of the unavailable provider
            context: Optional additional context (ticker, dates, etc.)
        """
        full_message = f"Provider '{provider_name}' is unavailable: {message}"
        full_context = context or {}
        full_context["provider_name"] = provider_name
        super().__init__(full_message, status_code=503, error_code="PROVIDER_UNAVAILABLE", context=full_context)

