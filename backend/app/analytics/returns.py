"""Return series construction and alignment."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.data.models.prices import PriceSeries

logger = get_logger(__name__)


class ReturnBar(BaseModel):
    """A single daily return."""

    trading_date: date = Field(
        ...,
        alias="date",
        description="Trading date",
    )
    return_: float = Field(..., description="Daily return (decimal, e.g., 0.01 = 1%)", alias="return")

    model_config = {
        "populate_by_name": True,
    }


class ReturnSeries(BaseModel):
    """A return series for a single asset."""

    ticker: str = Field(..., description="Ticker symbol")
    returns: list[ReturnBar] = Field(..., description="Ordered list of daily returns (oldest to newest)")
    uses_adjusted_prices: bool = Field(..., description="Whether returns were calculated using adjusted prices")


def price_series_to_returns(price_series: PriceSeries) -> ReturnSeries:
    """Convert price series to daily return series."""
    bars = price_series.bars
    if len(bars) < 2:
        raise ValueError("Price series must have at least 2 bars to compute returns")

    returns: list[ReturnBar] = []
    
    # DETERMINISM ENFORCEMENT: Fail fast if adjusted_close is missing when expected
    # Mixed adjusted/unadjusted data would cause non-deterministic results
    has_adjusted = any(bar.adjusted_close is not None for bar in bars)
    has_unadjusted = any(bar.adjusted_close is None for bar in bars)
    
    if has_adjusted and has_unadjusted:
        raise ValueError(
            f"Mixed adjusted/unadjusted prices detected for {price_series.metadata.ticker}. "
            "All bars must have adjusted_close if any bar has it. "
            "This prevents non-deterministic return calculations."
        )
    
    for i in range(1, len(bars)):
        prev_bar = bars[i - 1]
        curr_bar = bars[i]

        # DETERMINISM: Use consistent price source (adjusted_close if available, else close)
        # This is now safe because we've verified consistency above
        prev_price = prev_bar.adjusted_close if prev_bar.adjusted_close is not None else prev_bar.close
        curr_price = curr_bar.adjusted_close if curr_bar.adjusted_close is not None else curr_bar.close

        # Daily return: (P_t / P_{t-1}) - 1
        daily_return = (curr_price / prev_price) - 1.0

        returns.append(ReturnBar(trading_date=curr_bar.trading_date, return_=daily_return))

    uses_adjusted = price_series.metadata.is_adjusted and all(bar.adjusted_close is not None for bar in bars)

    return ReturnSeries(
        ticker=price_series.metadata.ticker,
        returns=returns,
        uses_adjusted_prices=uses_adjusted,
    )


def align_return_series(return_series_list: list[ReturnSeries], original_start: date, original_end: date) -> tuple[dict[str, list[float]], list[date]]:
    """
    Align multiple return series by date intersection.
    
    ORDERING GUARANTEE (Phase 11.1): Returns dates in ascending chronological order
    (oldest to newest). This ensures frontend can render time series charts without
    reordering. The same inputs always produce the same date ordering (replay-safe).
    
    Returns a tuple of:
    - dict mapping ticker -> list of aligned returns (same dates for all, in date order)
    - list of aligned dates (sorted ascending, oldest to newest)
    """
    if not return_series_list:
        return {}, []

    # Build date sets for each series
    date_sets = {}
    for rs in return_series_list:
        dates = {ret.trading_date for ret in rs.returns}
        date_sets[rs.ticker] = dates

    # Find intersection of all dates
    common_dates = set.intersection(*date_sets.values())
    if not common_dates:
        raise ValueError("No common dates found across return series")

    # ORDERING GUARANTEE: Sort dates ascending (oldest to newest) for deterministic ordering
    # This ensures frontend rendering is stable and replay-safe
    common_dates_sorted = sorted(common_dates)

    # Build aligned returns dict
    aligned: dict[str, list[float]] = {}
    for rs in return_series_list:
        # Create date -> return mapping
        return_map = {ret.trading_date: ret.return_ for ret in rs.returns}
        # Extract aligned returns in date order
        aligned[rs.ticker] = [return_map[dt] for dt in common_dates_sorted]

    return aligned, common_dates_sorted

