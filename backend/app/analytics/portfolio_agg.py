"""Portfolio aggregation logic."""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.portfolio.models import Portfolio

logger = get_logger(__name__)


class PortfolioReturnSeries(BaseModel):
    """Portfolio-level return series."""

    dates: list[date] = Field(..., description="Ordered list of trading dates (oldest to newest)")
    returns: list[float] = Field(..., description="Portfolio daily returns (same order as dates, decimal format)")
    benchmark_returns: Optional[list[float]] = Field(None, description="Benchmark daily returns if benchmark provided (same order as dates)")


def aggregate_portfolio_returns(
    aligned_returns: dict[str, list[float]],
    dates: list[date],
    portfolio: Portfolio,
    benchmark_returns: Optional[list[float]] = None,
) -> PortfolioReturnSeries:
    """
    Aggregate asset-level returns into portfolio-level returns using weights.
    
    Portfolio return = weighted sum of asset returns.
    """
    if not aligned_returns:
        raise ValueError("aligned_returns cannot be empty")

    num_days = len(dates)
    if not all(len(returns) == num_days for returns in aligned_returns.values()):
        raise ValueError("All return series must have the same length as dates")

    # Build weight map
    weight_map = {holding.ticker: float(holding.weight) for holding in portfolio.holdings}

    # DETERMINISM ENFORCEMENT: Sort ticker keys to ensure deterministic iteration order
    # Dictionary iteration order is preserved in Python 3.7+, but explicit sorting
    # guarantees consistency across runs and makes the assumption explicit
    sorted_tickers = sorted(aligned_returns.keys())

    # Compute portfolio returns as weighted sum
    # DETERMINISM ENFORCEMENT: Verify all tickers in aligned_returns have weights
    # Using .get() with default 0.0 masks missing weights and causes non-deterministic behavior
    missing_weights = [ticker for ticker in sorted_tickers if ticker not in weight_map]
    if missing_weights:
        raise ValueError(
            f"Missing weights for tickers in aligned returns: {missing_weights}. "
            "All tickers in aligned_returns must have corresponding weights in portfolio. "
            "This prevents silent zero-weighting and non-deterministic results."
        )
    
    portfolio_returns: list[float] = []
    for i in range(num_days):
        portfolio_return = 0.0
        for ticker in sorted_tickers:
            asset_returns = aligned_returns[ticker]
            weight = weight_map[ticker]  # Safe: we've verified all tickers have weights
            portfolio_return += weight * asset_returns[i]
        portfolio_returns.append(portfolio_return)

    return PortfolioReturnSeries(
        dates=dates,
        returns=portfolio_returns,
        benchmark_returns=benchmark_returns,
    )

