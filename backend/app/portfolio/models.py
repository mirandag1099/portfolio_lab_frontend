"""Portfolio models for defining user portfolios."""

from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Holding(BaseModel):
    """A single portfolio holding."""

    ticker: str = Field(..., description="Ticker symbol (e.g., 'AAPL', 'MSFT')", min_length=1)
    weight: Decimal = Field(..., description="Portfolio weight as decimal (0.0 to 1.0)", ge=0, le=1)

    @field_validator("ticker")
    @classmethod
    def validate_ticker(cls, v: str) -> str:
        return v.upper().strip()

    class Config:
        json_schema_extra = {
            "example": {
                "ticker": "AAPL",
                "weight": 0.5,
            }
        }


class Portfolio(BaseModel):
    """Portfolio definition with holdings and analysis parameters."""

    holdings: list[Holding] = Field(..., description="List of portfolio holdings", min_length=1)
    currency: str = Field(default="USD", description="Portfolio currency code (e.g., 'USD', 'EUR')", min_length=3, max_length=3)
    benchmark: Optional[str] = Field(None, description="Benchmark ticker (e.g., 'SPY', '^GSPC'). Optional.")
    start_date: date = Field(..., description="Analysis start date (inclusive)")
    end_date: date = Field(..., description="Analysis end date (inclusive)")

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("benchmark")
    @classmethod
    def validate_benchmark(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return v.upper().strip()

    @field_validator("holdings")
    @classmethod
    def validate_holdings_not_empty(cls, v: list[Holding]) -> list[Holding]:
        if not v:
            raise ValueError("Portfolio must have at least one holding")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "holdings": [
                    {"ticker": "AAPL", "weight": 0.5},
                    {"ticker": "MSFT", "weight": 0.5},
                ],
                "currency": "USD",
                "benchmark": "SPY",
                "start_date": "2023-01-01",
                "end_date": "2024-01-01",
            }
        }

