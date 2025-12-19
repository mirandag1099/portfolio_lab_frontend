"""Monte Carlo simulation summary statistics.

This module computes descriptive statistics from Monte Carlo simulation outputs.
All statistics describe ranges and distributions, not forecasts or expectations.

IMPORTANT: These statistics are hypothetical and describe what occurred in the
simulations. They do not predict future performance or imply any expectations.

DETERMINISM GUARANTEES (Phase 8):
- Percentile calculations use explicit 'linear' interpolation for consistency
- All arrays use explicit float64 dtype for cross-platform numerical stability
- argmin/argmax operations handle ties deterministically (first occurrence)
- All float conversions are explicit to prevent precision drift
- Identical simulation inputs produce identical summary statistics
"""

import numpy as np
from typing import Optional

from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.analytics.monte_carlo import MonteCarloSimulation

logger = get_logger(__name__)


class TerminalReturnPercentiles(BaseModel):
    """Percentile distribution of terminal returns across simulations."""

    p5: float = Field(..., description="5th percentile terminal return (decimal format)")
    p25: float = Field(..., description="25th percentile terminal return (decimal format)")
    p50: float = Field(..., description="50th percentile (median) terminal return (decimal format)")
    p75: float = Field(..., description="75th percentile terminal return (decimal format)")
    p95: float = Field(..., description="95th percentile terminal return (decimal format)")


class MaxDrawdownDistribution(BaseModel):
    """Distribution of maximum drawdowns across simulation paths."""

    p5: float = Field(..., description="5th percentile max drawdown (decimal format, negative)")
    p25: float = Field(..., description="25th percentile max drawdown (decimal format, negative)")
    p50: float = Field(..., description="50th percentile (median) max drawdown (decimal format, negative)")
    p75: float = Field(..., description="75th percentile max drawdown (decimal format, negative)")
    p95: float = Field(..., description="95th percentile max drawdown (decimal format, negative)")
    worst: float = Field(..., description="Worst-case max drawdown across all paths (decimal format, negative)")


class PathExtremes(BaseModel):
    """Best-case and worst-case simulation paths."""

    worst_case_path: list[float] = Field(
        ...,
        description="Path with lowest terminal return (cumulative returns, starting at 0.0)",
    )
    best_case_path: list[float] = Field(
        ...,
        description="Path with highest terminal return (cumulative returns, starting at 0.0)",
    )
    worst_case_terminal_return: float = Field(
        ...,
        description="Terminal return of worst-case path (decimal format)",
    )
    best_case_terminal_return: float = Field(
        ...,
        description="Terminal return of best-case path (decimal format)",
    )


class MonteCarloSummaryStats(BaseModel):
    """Summary statistics from Monte Carlo simulation."""

    terminal_return_percentiles: TerminalReturnPercentiles = Field(
        ...,
        description="Percentile distribution of terminal returns",
    )
    max_drawdown_distribution: MaxDrawdownDistribution = Field(
        ...,
        description="Distribution of maximum drawdowns across paths",
    )
    probability_of_loss: float = Field(
        ...,
        description="Probability of loss: P(terminal_return < 0), range [0, 1]",
        ge=0.0,
        le=1.0,
    )
    path_extremes: PathExtremes = Field(
        ...,
        description="Best-case and worst-case simulation paths",
    )
    number_of_simulations: int = Field(..., description="Number of simulations analyzed", gt=0)
    horizon_days: int = Field(..., description="Number of days in each simulation path", gt=0)
    disclaimer: str = Field(
        ...,
        description="Disclaimer text explaining that these are hypothetical simulations",
    )


def _compute_max_drawdown(cumulative_path: list[float]) -> float:
    """
    Compute maximum drawdown from a cumulative return path.
    
    Maximum drawdown is the largest peak-to-trough decline in cumulative returns.
    Returns a negative value (or zero if no drawdown).
    
    NUMERICAL STABILITY: Uses explicit float64 dtype to ensure deterministic results.
    
    Args:
        cumulative_path: List of cumulative returns starting at 0.0
        
    Returns:
        Maximum drawdown as a negative decimal (e.g., -0.20 = -20%)
    """
    if not cumulative_path:
        return 0.0
    
    # NUMERICAL STABILITY: Explicit dtype ensures consistent precision
    cumulative_array = np.array(cumulative_path, dtype=np.float64)
    
    # Compute running maximum (peak)
    running_max = np.maximum.accumulate(cumulative_array)
    
    # Compute drawdown at each point (negative when below peak)
    drawdowns = cumulative_array - running_max
    
    # Maximum drawdown is the most negative value
    max_drawdown = float(np.min(drawdowns))
    
    return max_drawdown


def compute_summary_stats(simulation: MonteCarloSimulation) -> MonteCarloSummaryStats:
    """
    Compute descriptive statistics from Monte Carlo simulation results.
    
    This function computes:
    - Terminal return percentiles (5th, 25th, 50th, 75th, 95th)
    - Max drawdown distribution across paths
    - Probability of loss (P(terminal_return < 0))
    - Best-case and worst-case paths
    
    IMPORTANT: These statistics describe ranges observed in hypothetical simulations.
    They do not predict future performance or imply expectations.
    
    Args:
        simulation: MonteCarloSimulation results from simulate_monte_carlo()
        
    Returns:
        MonteCarloSummaryStats with all computed statistics
        
    Raises:
        ValueError: If simulation data is invalid or cumulative_paths is None
    """
    if simulation.cumulative_paths is None:
        raise ValueError("cumulative_paths must be computed to generate summary statistics")
    
    if not simulation.cumulative_paths:
        raise ValueError("cumulative_paths cannot be empty")
    
    cumulative_paths = simulation.cumulative_paths
    num_simulations = len(cumulative_paths)
    horizon_days = len(cumulative_paths[0])
    
    logger.info(
        f"Computing summary statistics from Monte Carlo simulation",
        extra={
            "num_simulations": num_simulations,
            "horizon_days": horizon_days,
        },
    )
    
    # Extract terminal returns (last value of each cumulative path)
    # NUMERICAL STABILITY: Convert to list of floats immediately to ensure deterministic type
    terminal_returns = [float(path[-1]) for path in cumulative_paths]
    terminal_returns_array = np.array(terminal_returns, dtype=np.float64)

    # NUMERICAL STABILITY: Use explicit interpolation method for deterministic percentile calculation
    # 'linear' interpolation ensures consistent results across NumPy versions and platforms
    percentiles = np.percentile(terminal_returns_array, [5, 25, 50, 75, 95], method='linear')
    terminal_return_percentiles = TerminalReturnPercentiles(
        p5=float(percentiles[0]),
        p25=float(percentiles[1]),
        p50=float(percentiles[2]),
        p75=float(percentiles[3]),
        p95=float(percentiles[4]),
    )
    
    # Validate monotonicity
    if not (terminal_return_percentiles.p5 <= terminal_return_percentiles.p25 <= 
            terminal_return_percentiles.p50 <= terminal_return_percentiles.p75 <= 
            terminal_return_percentiles.p95):
        logger.warning(
            "Terminal return percentiles are not strictly monotonic. This may indicate numerical precision issues."
        )
    
    # Compute max drawdown for each path
    # NUMERICAL STABILITY: Convert to list of floats immediately for deterministic type
    max_drawdowns = [float(_compute_max_drawdown(path)) for path in cumulative_paths]
    max_drawdowns_array = np.array(max_drawdowns, dtype=np.float64)

    # NUMERICAL STABILITY: Use explicit interpolation method for deterministic percentile calculation
    drawdown_percentiles = np.percentile(max_drawdowns_array, [5, 25, 50, 75, 95], method='linear')
    worst_drawdown = float(min(max_drawdowns))  # Use Python min for deterministic result
    
    max_drawdown_distribution = MaxDrawdownDistribution(
        p5=float(drawdown_percentiles[0]),
        p25=float(drawdown_percentiles[1]),
        p50=float(drawdown_percentiles[2]),
        p75=float(drawdown_percentiles[3]),
        p95=float(drawdown_percentiles[4]),
        worst=worst_drawdown,
    )
    
    # Compute probability of loss
    # DETERMINISM: Use explicit array for boolean operations
    losses = terminal_returns_array < 0.0
    probability_of_loss = float(np.mean(losses))

    # DETERMINISM ENFORCEMENT: Handle ties explicitly for argmin/argmax
    # If multiple paths have identical terminal returns, select the first occurrence
    # This ensures deterministic selection across runs
    terminal_returns_list = terminal_returns  # Already converted to list above
    
    min_value = min(terminal_returns_list)
    max_value = max(terminal_returns_list)
    
    # Find first occurrence of min/max to ensure determinism
    worst_case_idx = terminal_returns_list.index(min_value)
    best_case_idx = terminal_returns_list.index(max_value)
    
    # NUMERICAL STABILITY: Ensure paths are converted to lists of floats for deterministic serialization
    worst_case_path = [float(x) for x in cumulative_paths[worst_case_idx]]
    best_case_path = [float(x) for x in cumulative_paths[best_case_idx]]

    path_extremes = PathExtremes(
        worst_case_path=worst_case_path,
        best_case_path=best_case_path,
        worst_case_terminal_return=float(terminal_returns_list[worst_case_idx]),
        best_case_terminal_return=float(terminal_returns_list[best_case_idx]),
    )
    
    # Generate disclaimer text
    disclaimer = (
        "These statistics are computed from hypothetical Monte Carlo simulations "
        "based on historical return characteristics. They describe ranges observed "
        "in the simulations and are intended for stress-testing purposes only. "
        "They do not predict future performance, imply expectations, or guarantee "
        "any outcomes. Past performance and simulated scenarios do not guarantee "
        "future results."
    )
    
    return MonteCarloSummaryStats(
        terminal_return_percentiles=terminal_return_percentiles,
        max_drawdown_distribution=max_drawdown_distribution,
        probability_of_loss=probability_of_loss,
        path_extremes=path_extremes,
        number_of_simulations=num_simulations,
        horizon_days=horizon_days,
        disclaimer=disclaimer,
    )

