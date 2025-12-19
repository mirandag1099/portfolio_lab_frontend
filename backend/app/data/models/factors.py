"""Canonical factor data models for Fama-French factors."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class FactorBar(BaseModel):
    """A single factor return bar."""

    trading_date: date = Field(
        ...,
        alias="date",
        description="Trading date",
    )
    market_excess_return: float = Field(
        ...,
        description="Market excess return (MKT-RF) in decimal format (e.g., 0.01 = 1%)",
    )
    smb: float = Field(
        ...,
        description="Small Minus Big (SMB) factor return in decimal format",
    )
    hml: float = Field(
        ...,
        description="High Minus Low (HML) factor return in decimal format",
    )
    risk_free_rate: float = Field(
        ...,
        description="Risk-free rate (RF) in decimal format",
    )

    model_config = {
        "populate_by_name": True,
    }


class FactorSeriesMetadata(BaseModel):
    """Metadata for a factor series."""

    source: str = Field(..., description="Data source (e.g., 'fama_french')")
    dataset_name: str = Field(..., description="Official dataset name from Ken French Data Library")
    frequency: str = Field(..., description="Data frequency (daily, monthly, annual)")
    factors_included: list[str] = Field(
        ...,
        description="List of factor names included (e.g., ['MKT-RF', 'SMB', 'HML', 'RF'])",
    )
    start_date: date = Field(..., description="First date in series")
    end_date: date = Field(..., description="Last date in series")


class FactorSeries(BaseModel):
    """A complete factor return series with metadata."""

    bars: list[FactorBar] = Field(..., description="Ordered list of factor bars (oldest to newest)")
    metadata: FactorSeriesMetadata = Field(..., description="Factor series metadata")

