"""Performance and risk metrics computation."""

import math
from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.analytics.portfolio_agg import PortfolioReturnSeries

logger = get_logger(__name__)
TRADING_DAYS_PER_YEAR = 252


class PerformanceMetrics(BaseModel):
    """Core performance and risk metrics."""

    cumulative_return: float = Field(..., description="Total cumulative return over the period (decimal, e.g., 0.15 = 15%)")
    cagr: float = Field(..., description="Compound Annual Growth Rate (decimal, e.g., 0.10 = 10%)")
    annualized_volatility: float = Field(..., description="Annualized volatility (standard deviation of returns, decimal)")
    max_drawdown: float = Field(..., description="Maximum drawdown over the period (decimal, e.g., -0.20 = -20%)")
    sharpe_ratio: float = Field(..., description="Sharpe ratio (risk-free rate = 0, annualized)")


def compute_cumulative_return(returns: list[float]) -> float:
    """Compute cumulative return: (1 + r1) * (1 + r2) * ... - 1"""
    cumulative = 1.0
    for ret in returns:
        cumulative *= 1.0 + ret
    return cumulative - 1.0


def compute_cagr(cumulative_return: float, years: float) -> float:
    """
    Compute CAGR: (1 + cumulative_return)^(1/years) - 1
    
    FAIL-FAST ENFORCEMENT: Invalid years parameter raises ValueError instead of returning 0.0.
    Zero or negative years indicates invalid input, not a valid zero CAGR.
    """
    if years <= 0:
        raise ValueError(f"CAGR calculation requires positive years, got {years}. Invalid input must fail explicitly.")
    return (1.0 + cumulative_return) ** (1.0 / years) - 1.0


def compute_annualized_volatility(returns: list[float], trading_days_per_year: int = TRADING_DAYS_PER_YEAR) -> float:
    """
    Compute annualized volatility: std(returns) * sqrt(trading_days_per_year)
    
    FAIL-FAST ENFORCEMENT: Single return cannot compute volatility - raises ValueError.
    Returning 0.0 masks invalid input and produces misleading metrics.
    """
    if len(returns) < 2:
        raise ValueError(
            f"Volatility calculation requires at least 2 returns, got {len(returns)}. "
            "Single return cannot compute standard deviation - invalid input must fail explicitly."
        )

    import numpy as np

    returns_array = np.array(returns)
    daily_std = float(np.std(returns_array, ddof=1))
    return daily_std * math.sqrt(trading_days_per_year)


def compute_max_drawdown(returns: list[float]) -> float:
    """
    Compute maximum drawdown from return series.
    
    FAIL-FAST ENFORCEMENT: Empty returns raise ValueError instead of returning 0.0.
    Empty return series indicates invalid input, not a valid zero drawdown.
    """
    if not returns:
        raise ValueError("Max drawdown calculation requires non-empty return series. Empty returns indicate invalid input.")

    cumulative = 1.0
    peak = 1.0
    max_dd = 0.0

    for ret in returns:
        cumulative *= 1.0 + ret
        if cumulative > peak:
            peak = cumulative
        drawdown = (cumulative - peak) / peak
        if drawdown < max_dd:
            max_dd = drawdown

    return max_dd


def compute_sharpe_ratio(returns: list[float], risk_free_rate: float = 0.0, trading_days_per_year: int = TRADING_DAYS_PER_YEAR) -> float:
    """
    Compute Sharpe ratio: (mean_return - risk_free_rate) / volatility * sqrt(trading_days_per_year)
    
    FAIL-FAST ENFORCEMENT: 
    - Single return cannot compute Sharpe ratio - raises ValueError
    - Zero volatility (constant returns) raises ValueError instead of returning 0.0
    Returning 0.0 masks invalid inputs and produces misleading metrics.
    """
    if len(returns) < 2:
        raise ValueError(
            f"Sharpe ratio calculation requires at least 2 returns, got {len(returns)}. "
            "Single return cannot compute volatility - invalid input must fail explicitly."
        )

    import numpy as np

    returns_array = np.array(returns)
    mean_return = float(np.mean(returns_array))
    volatility = compute_annualized_volatility(returns, trading_days_per_year)

    # FAIL-FAST: Zero volatility (constant returns) is invalid for Sharpe ratio
    # Returning 0.0 masks this condition and produces misleading metrics
    if volatility == 0:
        raise ValueError(
            "Sharpe ratio cannot be computed for constant returns (zero volatility). "
            "Constant returns indicate invalid input or data error - explicit error required."
        )

    # Annualize mean return
    mean_annualized = mean_return * trading_days_per_year

    return (mean_annualized - risk_free_rate) / volatility


def compute_metrics(portfolio_returns: PortfolioReturnSeries, risk_free_rate: float = 0.0, trading_days_per_year: int = TRADING_DAYS_PER_YEAR) -> PerformanceMetrics:
    """
    Compute all performance metrics from portfolio return series.
    
    FAIL-FAST ENFORCEMENT: Empty returns raise ValueError instead of returning default values.
    This ensures invalid inputs are caught early rather than producing misleading metrics.
    """
    returns = portfolio_returns.returns

    # FAIL-FAST: Empty returns indicate invalid input, not a valid zero-return portfolio
    if not returns:
        raise ValueError("Portfolio returns cannot be empty. Empty return series indicates invalid input or data error.")

    cumulative_return = compute_cumulative_return(returns)
    years = len(returns) / trading_days_per_year
    cagr = compute_cagr(cumulative_return, years)
    annualized_volatility = compute_annualized_volatility(returns, trading_days_per_year)
    max_drawdown = compute_max_drawdown(returns)
    sharpe_ratio = compute_sharpe_ratio(returns, risk_free_rate, trading_days_per_year)

    return PerformanceMetrics(
        cumulative_return=cumulative_return,
        cagr=cagr,
        annualized_volatility=annualized_volatility,
        max_drawdown=max_drawdown,
        sharpe_ratio=sharpe_ratio,
    )

