"""Portfolio validation logic."""

from decimal import Decimal

from app.core.exceptions import BadRequestError
from app.core.logging import get_logger
from app.data.providers.base import MarketDataProvider
from app.portfolio.models import Portfolio

logger = get_logger(__name__)
WEIGHT_SUM_TOLERANCE = Decimal("0.01")


class ValidationError(BadRequestError):
    """Portfolio validation error."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.error_code = "VALIDATION_ERROR"


async def validate_portfolio(portfolio: Portfolio, provider: MarketDataProvider) -> Portfolio:
    """
    Validate portfolio: weights, tickers, dates.
    
    Normalizes weights to sum exactly to 1.0.
    """
    # Check weight sum
    total_weight = sum(holding.weight for holding in portfolio.holdings)
    if abs(total_weight - Decimal("1.0")) > WEIGHT_SUM_TOLERANCE:
        raise ValidationError(f"Portfolio weights must sum to 1.0 (got {total_weight})")

    # Normalize weights to sum exactly to 1.0
    if total_weight != Decimal("1.0"):
        for holding in portfolio.holdings:
            holding.weight = holding.weight / total_weight

    # Check for duplicate tickers
    tickers = [holding.ticker for holding in portfolio.holdings]
    if len(tickers) != len(set(tickers)):
        raise ValidationError("Portfolio contains duplicate tickers")

    # DETERMINISM ENFORCEMENT: Fail fast if provider unavailable
    # Best-effort validation causes non-deterministic behavior (some runs validate, others don't)
    try:
        available = await provider.is_available()
        if not available:
            raise ValidationError(
                f"Market data provider '{provider.name}' is not available. "
                "Cannot validate portfolio tickers. Provider must be available for deterministic validation."
            )
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(
            f"Failed to check provider availability: {str(e)}. "
            "Provider must be available for deterministic portfolio validation."
        )

    # Validate dates
    if portfolio.start_date >= portfolio.end_date:
        raise ValidationError("start_date must be before end_date")

    from datetime import date

    if portfolio.end_date > date.today():
        raise ValidationError("end_date cannot be in the future")

    return portfolio

