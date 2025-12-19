"""Canonical price data models."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PriceBar(BaseModel):
    """A single price bar (OHLCV data)."""

    trading_date: date = Field(
        ...,
        alias="date",
        description="Trading date (timezone-naive, UTC date)",
    )
    open: float = Field(..., description="Opening price", gt=0)
    high: float = Field(..., description="Highest price", gt=0)
    low: float = Field(..., description="Lowest price", gt=0)
    close: float = Field(..., description="Closing price", gt=0)
    adjusted_close: Optional[float] = Field(
        None,
        description="Adjusted closing price (splits and dividends). None if not available.",
    )
    volume: int = Field(..., description="Trading volume", ge=0)

    @field_validator("adjusted_close")
    @classmethod
    def validate_adjusted_close(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("adjusted_close must be positive when provided")
        return v

    model_config = {
        "populate_by_name": True,
    }


class PriceSeriesMetadata(BaseModel):
    """Metadata for a price series."""

    source: str = Field(..., description="Data provider name (e.g., 'yahoo', 'polygon', 'tiingo')")
    ticker: str = Field(..., description="Ticker symbol")
    currency: str = Field(..., description="Currency code (e.g., 'USD', 'EUR')")
    is_adjusted: bool = Field(..., description="Whether prices are adjusted for splits and dividends")
    frequency: str = Field(default="daily", description="Data frequency (currently only 'daily' supported)")


class PriceSeries(BaseModel):
    """A complete price series with metadata."""

    bars: list[PriceBar] = Field(..., description="Ordered list of price bars (oldest to newest)")
    metadata: PriceSeriesMetadata = Field(..., description="Series metadata")

