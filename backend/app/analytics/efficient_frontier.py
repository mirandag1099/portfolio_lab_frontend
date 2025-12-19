"""Efficient frontier generator for portfolio analysis.

This module generates efficient frontier points showing the tradeoff between
expected return and volatility for different portfolio allocations.

IMPORTANT: The efficient frontier describes tradeoffs and possibilities, not
recommendations. It does not rank portfolios or suggest optimal allocations.
All outputs are descriptive and based on historical data assumptions.
"""

import numpy as np
from scipy.optimize import minimize
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.core.logging import get_logger

logger = get_logger(__name__)


class FrontierPoint(BaseModel):
    """A single point on the efficient frontier."""

    weights: list[float] = Field(
        ...,
        description="Portfolio weights for each asset (must sum to 1.0)",
    )
    expected_return: float = Field(
        ...,
        description="Expected annualized return (decimal format, e.g., 0.10 = 10%)",
    )
    volatility: float = Field(
        ...,
        description="Annualized volatility (standard deviation, decimal format)",
        ge=0.0,
    )
    sharpe_ratio: float = Field(
        ...,
        description="Sharpe ratio (risk-free rate = 0, annualized)",
    )

    @field_validator("weights")
    @classmethod
    def validate_weights(cls, v: list[float]) -> list[float]:
        """Validate that weights sum to approximately 1.0 and are non-negative."""
        weights_sum = sum(v)
        if abs(weights_sum - 1.0) > 1e-6:
            raise ValueError(f"Weights must sum to 1.0, got {weights_sum}")
        if any(w < -1e-6 for w in v):  # Allow small numerical errors
            raise ValueError("Weights must be non-negative (long-only constraint)")
        return v


class EfficientFrontier(BaseModel):
    """Complete efficient frontier results."""

    frontier_points: list[FrontierPoint] = Field(
        ...,
        description="List of frontier points ordered by increasing volatility",
    )
    asset_names: list[str] = Field(
        ...,
        description="Names of assets (tickers) in order corresponding to weights",
    )
    min_volatility: float = Field(
        ...,
        description="Minimum achievable volatility (decimal format)",
        ge=0.0,
    )
    max_return: float = Field(
        ...,
        description="Maximum achievable expected return (decimal format)",
    )
    min_return: float = Field(
        ...,
        description="Minimum achievable expected return (decimal format)",
    )
    assumptions: list[str] = Field(
        ...,
        description="Explicit assumptions made in frontier generation",
    )
    solver: str = Field(
        ...,
        description="Optimization solver used (e.g., 'SLSQP')",
    )
    trading_days_per_year: int = Field(
        default=252,
        description="Number of trading days per year for annualization",
    )


def _estimate_mean_returns(returns_matrix: np.ndarray, trading_days_per_year: int = 252) -> np.ndarray:
    """
    Estimate annualized mean returns from daily return matrix.
    
    Args:
        returns_matrix: Matrix of daily returns, shape (num_assets, num_periods)
        trading_days_per_year: Number of trading days per year for annualization
        
    Returns:
        Array of annualized mean returns, shape (num_assets,)
    """
    # Compute mean daily return per asset
    mean_daily = np.mean(returns_matrix, axis=1)
    
    # Annualize: (1 + daily_mean)^252 - 1 ≈ daily_mean * 252 (for small returns)
    # More accurate: use compound annualization
    mean_annualized = mean_daily * trading_days_per_year
    
    return mean_annualized


def _estimate_covariance(returns_matrix: np.ndarray, trading_days_per_year: int = 252) -> np.ndarray:
    """
    Estimate annualized covariance matrix from daily return matrix.
    
    Args:
        returns_matrix: Matrix of daily returns, shape (num_assets, num_periods)
        trading_days_per_year: Number of trading days per year for annualization
        
    Returns:
        Annualized covariance matrix, shape (num_assets, num_assets)
    """
    # Compute covariance of daily returns
    cov_daily = np.cov(returns_matrix, ddof=1)  # Sample covariance
    
    # Annualize: multiply by trading days per year
    cov_annualized = cov_daily * trading_days_per_year
    
    return cov_annualized


def _portfolio_volatility(weights: np.ndarray, cov_matrix: np.ndarray) -> float:
    """
    Compute portfolio volatility from weights and covariance matrix.
    
    Args:
        weights: Portfolio weights, shape (num_assets,)
        cov_matrix: Covariance matrix, shape (num_assets, num_assets)
        
    Returns:
        Portfolio volatility (standard deviation)
    """
    return float(np.sqrt(weights @ cov_matrix @ weights))


def _portfolio_return(weights: np.ndarray, mean_returns: np.ndarray) -> float:
    """
    Compute portfolio expected return from weights and mean returns.
    
    Args:
        weights: Portfolio weights, shape (num_assets,)
        mean_returns: Mean returns per asset, shape (num_assets,)
        
    Returns:
        Portfolio expected return
    """
    return float(weights @ mean_returns)


def _minimize_volatility_unconstrained(
    cov_matrix: np.ndarray,
) -> np.ndarray:
    """
    Find global minimum variance portfolio (no return constraint).
    
    This solves:
        min w^T Σ w
        s.t. Σw = 1
             w >= 0 (long-only)
    
    Args:
        cov_matrix: Covariance matrix
        
    Returns:
        Optimal weights for minimum variance portfolio
    """
    num_assets = cov_matrix.shape[0]
    
    # Objective function: portfolio variance
    def objective(weights: np.ndarray) -> float:
        return float(weights @ cov_matrix @ weights)
    
    # Constraint: weights sum to 1
    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}]
    
    # Bounds: long-only
    bounds = [(0.0, 1.0) for _ in range(num_assets)]
    
    # Initial guess: equal weights
    x0 = np.ones(num_assets) / num_assets
    
    try:
        result = minimize(
            objective,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000, "ftol": 1e-9},
        )
        
        if result.success:
            weights = result.x
            weights = weights / np.sum(weights)  # Normalize
            return weights
        else:
            # Fallback to equal weights
            return np.ones(num_assets) / num_assets
    except Exception:
        # Fallback to equal weights
        return np.ones(num_assets) / num_assets


def _minimize_volatility(
    target_return: float,
    mean_returns: np.ndarray,
    cov_matrix: np.ndarray,
    solver: str = "SLSQP",
) -> Optional[np.ndarray]:
    """
    Minimize portfolio volatility subject to target return constraint.
    
    This solves:
        min w^T Σ w
        s.t. w^T μ = target_return
             Σw = 1
             w >= 0 (long-only)
    
    Args:
        target_return: Target expected return (annualized)
        mean_returns: Mean returns per asset
        cov_matrix: Covariance matrix
        solver: Optimization solver to use
        
    Returns:
        Optimal weights if solution found, None otherwise
    """
    num_assets = len(mean_returns)
    
    # Objective function: portfolio variance
    def objective(weights: np.ndarray) -> float:
        return float(weights @ cov_matrix @ weights)
    
    # Constraints
    # 1. Weights sum to 1
    constraints = [
        {"type": "eq", "fun": lambda w: np.sum(w) - 1.0},
        {"type": "eq", "fun": lambda w: _portfolio_return(w, mean_returns) - target_return},
    ]
    
    # Bounds: long-only (weights >= 0)
    bounds = [(0.0, 1.0) for _ in range(num_assets)]
    
    # Initial guess: equal weights
    x0 = np.ones(num_assets) / num_assets
    
    try:
        result = minimize(
            objective,
            x0,
            method=solver,
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000, "ftol": 1e-9},
        )
        
        if result.success:
            weights = result.x
            # Normalize to ensure exact sum = 1.0
            weights = weights / np.sum(weights)
            return weights
        else:
            logger.warning(
                f"Optimization failed for target return {target_return}: {result.message}",
                extra={"target_return": target_return, "solver": solver},
            )
            return None
    except Exception as e:
        logger.error(
            f"Optimization error for target return {target_return}: {str(e)}",
            extra={"target_return": target_return, "solver": solver},
            exc_info=True,
        )
        return None


def generate_efficient_frontier(
    returns_matrix: np.ndarray,
    asset_names: list[str],
    num_points: int = 50,
    solver: str = "SLSQP",
    trading_days_per_year: int = 252,
    risk_free_rate: float = 0.0,
) -> EfficientFrontier:
    """
    Generate efficient frontier points showing return vs volatility tradeoff.
    
    This function computes the efficient frontier by solving a series of
    constrained optimization problems. Each point represents a portfolio
    allocation that minimizes volatility for a given target return (or
    maximizes return for a given volatility).
    
    IMPORTANT: The efficient frontier describes tradeoffs and possibilities
    based on historical data. It does NOT:
    - Recommend specific portfolios
    - Rank portfolios as "optimal"
    - Imply future performance
    - Account for transaction costs or market impact
    
    Args:
        returns_matrix: Matrix of daily returns, shape (num_assets, num_periods)
                        Each row is an asset, each column is a time period
        asset_names: List of asset names (tickers) corresponding to rows
        num_points: Number of frontier points to generate
        solver: Optimization solver ('SLSQP' recommended)
        trading_days_per_year: Number of trading days per year for annualization
        risk_free_rate: Risk-free rate for Sharpe ratio calculation (default 0.0)
        
    Returns:
        EfficientFrontier with frontier points and metadata
        
    Raises:
        ValueError: If inputs are invalid
        
    Example:
        >>> returns = np.array([
        ...     [0.001, -0.002, 0.003, ...],  # Asset 1 returns
        ...     [0.002, 0.001, -0.001, ...],  # Asset 2 returns
        ... ])
        >>> frontier = generate_efficient_frontier(
        ...     returns_matrix=returns,
        ...     asset_names=["AAPL", "MSFT"],
        ...     num_points=50
        ... )
    """
    if returns_matrix.shape[0] != len(asset_names):
        raise ValueError(
            f"Number of assets ({returns_matrix.shape[0]}) must match number of asset names ({len(asset_names)})"
        )
    
    if returns_matrix.shape[0] < 2:
        raise ValueError("Efficient frontier requires at least 2 assets")
    
    if num_points < 2:
        raise ValueError("num_points must be at least 2")
    
    num_assets, num_periods = returns_matrix.shape
    
    if num_periods < 30:
        logger.warning(
            f"Computing efficient frontier with only {num_periods} periods. Results may be unreliable."
        )
    
    logger.info(
        f"Generating efficient frontier",
        extra={
            "num_assets": num_assets,
            "num_periods": num_periods,
            "num_points": num_points,
            "solver": solver,
        },
    )
    
    # Estimate mean returns and covariance matrix
    mean_returns = _estimate_mean_returns(returns_matrix, trading_days_per_year)
    cov_matrix = _estimate_covariance(returns_matrix, trading_days_per_year)
    
    # Find maximum achievable return (asset with highest return, 100% allocation)
    max_return = float(np.max(mean_returns))
    
    # Compute global minimum volatility portfolio (unconstrained by return)
    min_vol_weights = _minimize_volatility_unconstrained(cov_matrix)
    min_vol_return = _portfolio_return(min_vol_weights, mean_returns)
    min_volatility = _portfolio_volatility(min_vol_weights, cov_matrix)
    
    # Generate target returns evenly spaced from min_vol_return to max_return
    # This ensures we start from the efficient frontier (minimum variance point)
    target_returns = np.linspace(min_vol_return, max_return, num_points)
    
    # Generate frontier points
    frontier_points: list[FrontierPoint] = []
    
    for target_ret in target_returns:
        weights = _minimize_volatility(
            target_return=target_ret,
            mean_returns=mean_returns,
            cov_matrix=cov_matrix,
            solver=solver,
        )
        
        if weights is None:
            continue
        
        # Compute portfolio metrics
        portfolio_return = _portfolio_return(weights, mean_returns)
        portfolio_vol = _portfolio_volatility(weights, cov_matrix)
        
        # Compute Sharpe ratio
        sharpe = (portfolio_return - risk_free_rate) / portfolio_vol if portfolio_vol > 0 else 0.0
        
        frontier_points.append(
            FrontierPoint(
                weights=weights.tolist(),
                expected_return=portfolio_return,
                volatility=portfolio_vol,
                sharpe_ratio=sharpe,
            )
        )
    
    if not frontier_points:
        raise ValueError("Could not generate any frontier points. Check input data and constraints.")
    
    # Sort by volatility (ascending)
    frontier_points.sort(key=lambda p: p.volatility)
    
    # Update min/max return from actual frontier points
    actual_min_return = min(p.expected_return for p in frontier_points)
    actual_max_return = max(p.expected_return for p in frontier_points)
    actual_min_volatility = min(p.volatility for p in frontier_points)
    
    assumptions = [
        "Mean returns and covariance estimated from historical data",
        "Historical patterns may not persist in the future",
        "Long-only constraint: no short selling",
        "Weights sum to 1.0: fully invested",
        "No leverage: weights between 0 and 1",
        "No transaction costs or market impact",
        "Returns are normally distributed (may not hold in reality)",
        "Covariance is stationary (may not hold in reality)",
        "Frontier describes tradeoffs, not recommendations",
        "Frontier does not rank portfolios as optimal",
    ]
    
    return EfficientFrontier(
        frontier_points=frontier_points,
        asset_names=asset_names,
        min_volatility=actual_min_volatility,
        max_return=actual_max_return,
        min_return=actual_min_return,
        assumptions=assumptions,
        solver=solver,
        trading_days_per_year=trading_days_per_year,
    )

