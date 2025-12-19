"""Factor return alignment with portfolio returns.

This module aligns portfolio return series with Fama-French factor returns
for regression analysis. Alignment uses date intersection only - no forward
filling or interpolation.

IMPORTANT: If factor alignment is wrong, alpha is meaningless. This step
must be deterministic and transparent.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.analytics.portfolio_agg import PortfolioReturnSeries
from app.data.models.factors import FactorSeries

logger = get_logger(__name__)


class AlignedFactorMatrix(BaseModel):
    """Aligned portfolio and factor returns for regression analysis."""

    dates: list[date] = Field(
        ...,
        description="Ordered list of aligned trading dates (oldest to newest)",
    )
    portfolio_returns: list[float] = Field(
        ...,
        description="Portfolio daily returns aligned to dates (same order, decimal format)",
    )
    market_excess_returns: list[float] = Field(
        ...,
        description="Market excess returns (MKT-RF) aligned to dates (same order, decimal format)",
    )
    smb_returns: list[float] = Field(
        ...,
        description="SMB factor returns aligned to dates (same order, decimal format)",
    )
    hml_returns: list[float] = Field(
        ...,
        description="HML factor returns aligned to dates (same order, decimal format)",
    )
    risk_free_rates: list[float] = Field(
        ...,
        description="Risk-free rates (RF) aligned to dates (same order, decimal format)",
    )


class FactorAlignmentMetadata(BaseModel):
    """Metadata describing factor alignment process and data loss."""

    portfolio_original_start: date = Field(..., description="Original portfolio return series start date")
    portfolio_original_end: date = Field(..., description="Original portfolio return series end date")
    portfolio_original_days: int = Field(..., description="Original number of portfolio return days")
    
    factor_original_start: date = Field(..., description="Original factor series start date")
    factor_original_end: date = Field(..., description="Original factor series end date")
    factor_original_days: int = Field(..., description="Original number of factor return days")
    
    aligned_start: Optional[date] = Field(
        None,
        description="Start date after alignment (intersection of portfolio and factor dates)",
    )
    aligned_end: Optional[date] = Field(
        None,
        description="End date after alignment (intersection of portfolio and factor dates)",
    )
    aligned_days: int = Field(..., description="Number of days after alignment")
    
    portfolio_dropped_days: int = Field(
        ...,
        description="Number of portfolio return days dropped due to missing factor data",
    )
    factor_dropped_days: int = Field(
        ...,
        description="Number of factor return days dropped due to missing portfolio data",
    )
    
    alignment_method: str = Field(
        default="intersection",
        description="Method used for alignment (currently only 'intersection' supported)",
    )


class AlignedFactorData(BaseModel):
    """Complete aligned factor data with metadata."""

    matrix: AlignedFactorMatrix = Field(..., description="Aligned return matrices")
    metadata: FactorAlignmentMetadata = Field(..., description="Alignment metadata and data loss information")


def align_portfolio_with_factors(
    portfolio_returns: PortfolioReturnSeries,
    factor_series: FactorSeries,
) -> AlignedFactorData:
    """
    Align portfolio return series with Fama-French factor returns.
    
    This function performs intersection-only alignment:
    - Only dates present in BOTH series are kept
    - No forward filling
    - No interpolation
    - Deterministic ordering (chronological)
    
    If alignment is wrong, regression alpha is meaningless. This function
    ensures dates match exactly between portfolio and factor returns.
    
    Args:
        portfolio_returns: Portfolio return series with dates and returns
        factor_series: Fama-French factor series with factor bars
        
    Returns:
        AlignedFactorData with aligned matrices and metadata
        
    Raises:
        ValueError: If no common dates found or inputs invalid
    """
    if not portfolio_returns.dates:
        raise ValueError("Portfolio return series cannot be empty")
    
    if not factor_series.bars:
        raise ValueError("Factor series cannot be empty")
    
    # Extract dates from both series
    portfolio_dates_set = set(portfolio_returns.dates)
    factor_dates_set = {bar.trading_date for bar in factor_series.bars}
    
    # Compute intersection
    common_dates = portfolio_dates_set & factor_dates_set
    
    if not common_dates:
        raise ValueError(
            f"No common dates found between portfolio returns ({portfolio_returns.dates[0]} to {portfolio_returns.dates[-1]}) "
            f"and factor returns ({factor_series.bars[0].trading_date} to {factor_series.bars[-1].trading_date})"
        )
    
    # Sort dates chronologically
    # ORDERING GUARANTEE (Phase 11.1): Sort dates ascending (oldest to newest) for deterministic ordering
    # This ensures frontend rendering is stable and replay-safe
    common_dates_sorted = sorted(common_dates)
    
    # Build factor date -> factor bar mapping for fast lookup
    factor_map = {bar.trading_date: bar for bar in factor_series.bars}
    
    # Build portfolio date -> return mapping
    portfolio_map = dict(zip(portfolio_returns.dates, portfolio_returns.returns))
    
    # Extract aligned data
    aligned_portfolio_returns: list[float] = []
    aligned_market_excess: list[float] = []
    aligned_smb: list[float] = []
    aligned_hml: list[float] = []
    aligned_rf: list[float] = []
    
    for dt in common_dates_sorted:
        aligned_portfolio_returns.append(portfolio_map[dt])
        
        factor_bar = factor_map[dt]
        aligned_market_excess.append(factor_bar.market_excess_return)
        aligned_smb.append(factor_bar.smb)
        aligned_hml.append(factor_bar.hml)
        aligned_rf.append(factor_bar.risk_free_rate)
    
    # Compute metadata
    portfolio_original_start = portfolio_returns.dates[0]
    portfolio_original_end = portfolio_returns.dates[-1]
    portfolio_original_days = len(portfolio_returns.dates)
    
    factor_original_start = factor_series.bars[0].trading_date
    factor_original_end = factor_series.bars[-1].trading_date
    factor_original_days = len(factor_series.bars)
    
    aligned_start = common_dates_sorted[0] if common_dates_sorted else None
    aligned_end = common_dates_sorted[-1] if common_dates_sorted else None
    aligned_days = len(common_dates_sorted)
    
    portfolio_dropped_days = portfolio_original_days - aligned_days
    factor_dropped_days = factor_original_days - aligned_days
    
    metadata = FactorAlignmentMetadata(
        portfolio_original_start=portfolio_original_start,
        portfolio_original_end=portfolio_original_end,
        portfolio_original_days=portfolio_original_days,
        factor_original_start=factor_original_start,
        factor_original_end=factor_original_end,
        factor_original_days=factor_original_days,
        aligned_start=aligned_start,
        aligned_end=aligned_end,
        aligned_days=aligned_days,
        portfolio_dropped_days=portfolio_dropped_days,
        factor_dropped_days=factor_dropped_days,
        alignment_method="intersection",
    )
    
    matrix = AlignedFactorMatrix(
        dates=common_dates_sorted,
        portfolio_returns=aligned_portfolio_returns,
        market_excess_returns=aligned_market_excess,
        smb_returns=aligned_smb,
        hml_returns=aligned_hml,
        risk_free_rates=aligned_rf,
    )
    
    logger.info(
        f"Aligned portfolio returns with factors",
        extra={
            "portfolio_original_days": portfolio_original_days,
            "factor_original_days": factor_original_days,
            "aligned_days": aligned_days,
            "portfolio_dropped": portfolio_dropped_days,
            "factor_dropped": factor_dropped_days,
        },
    )
    
    if portfolio_dropped_days > 0 or factor_dropped_days > 0:
        logger.warning(
            f"Data loss during alignment: {portfolio_dropped_days} portfolio days and {factor_dropped_days} factor days dropped",
            extra={
                "portfolio_dropped_days": portfolio_dropped_days,
                "factor_dropped_days": factor_dropped_days,
                "aligned_start": str(aligned_start),
                "aligned_end": str(aligned_end),
            },
        )
    
    return AlignedFactorData(matrix=matrix, metadata=metadata)

