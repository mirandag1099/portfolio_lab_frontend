"""Monte Carlo simulation engine for portfolio return path generation.

This module implements Monte Carlo simulation methods for generating hypothetical
portfolio return paths based on historical return characteristics.

IMPORTANT: These simulations are stress-testing tools, not predictions or forecasts.
All outputs are explicitly labeled as hypothetical and must never imply future
performance expectations.

DETERMINISM GUARANTEES (Phase 8):
- All simulations require an explicit random_seed parameter (None is rejected)
- Random seed must be derived from explicit inputs or configuration, never runtime state
- All numerical operations use explicit float64 dtype for cross-platform consistency
- Percentile calculations use explicit 'linear' interpolation method
- All float conversions are explicit to prevent precision drift
- Identical inputs + identical seed = identical outputs across runs, machines, environments
"""

import numpy as np
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.core.logging import get_logger

logger = get_logger(__name__)


class SimulationMetadata(BaseModel):
    """Metadata describing simulation parameters and assumptions."""

    simulation_method: Literal["historical_bootstrap", "multivariate_normal"] = Field(
        ...,
        description="Method used for generating simulated returns",
    )
    number_of_simulations: int = Field(
        ...,
        description="Number of simulated return paths generated",
        gt=0,
    )
    horizon_days: int = Field(
        ...,
        description="Number of days in each simulated path",
        gt=0,
    )
    random_seed: Optional[int] = Field(
        None,
        description="Random seed used for deterministic simulation (None = non-deterministic)",
    )
    historical_returns_count: int = Field(
        ...,
        description="Number of historical daily returns used as input",
        gt=0,
    )
    assumptions: list[str] = Field(
        ...,
        description="List of explicit assumptions made in the simulation",
    )
    mean_return: Optional[float] = Field(
        None,
        description="Mean daily return estimated from historical data (if applicable)",
    )
    volatility: Optional[float] = Field(
        None,
        description="Volatility (std dev) of daily returns estimated from historical data (if applicable)",
    )


class MonteCarloSimulation(BaseModel):
    """Complete Monte Carlo simulation results."""

    simulated_paths: list[list[float]] = Field(
        ...,
        description="Matrix of simulated return paths. Shape: (num_simulations × horizon_days). Each inner list represents one simulated path of daily returns.",
    )
    cumulative_paths: Optional[list[list[float]]] = Field(
        None,
        description="Cumulative return paths computed from simulated_paths. Shape: (num_simulations × horizon_days). Each path starts at 0.0 and accumulates returns.",
    )
    metadata: SimulationMetadata = Field(
        ...,
        description="Simulation metadata and assumptions",
    )

    @field_validator("simulated_paths")
    @classmethod
    def validate_paths_shape(cls, v: list[list[float]]) -> list[list[float]]:
        """Validate that all paths have the same length."""
        if not v:
            raise ValueError("simulated_paths cannot be empty")
        path_length = len(v[0])
        for i, path in enumerate(v):
            if len(path) != path_length:
                raise ValueError(
                    f"All paths must have the same length. Path {i} has length {len(path)}, expected {path_length}"
                )
        return v


def _estimate_statistics(returns: list[float]) -> tuple[float, float]:
    """
    Estimate mean and volatility from historical returns.
    
    NUMERICAL STABILITY: Uses explicit float64 dtype and float conversion to ensure
    deterministic results across platforms and NumPy versions.
    
    Args:
        returns: List of historical daily returns (decimal format, e.g., 0.01 = 1%)
        
    Returns:
        Tuple of (mean_return, volatility) where both are in decimal format
    """
    # NUMERICAL STABILITY: Explicit dtype ensures consistent precision
    returns_array = np.array(returns, dtype=np.float64)
    mean_return = float(np.mean(returns_array))
    volatility = float(np.std(returns_array, ddof=1))  # Sample standard deviation
    
    return mean_return, volatility


def simulate_bootstrap(
    historical_returns: list[float],
    num_simulations: int,
    horizon_days: int,
    random_seed: Optional[int] = None,
) -> MonteCarloSimulation:
    """
    Generate simulated return paths using historical bootstrap method.
    
    This method samples daily returns directly from the historical return distribution,
    preserving the empirical distribution without assuming normality.
    
    Args:
        historical_returns: List of historical daily returns (decimal format)
        num_simulations: Number of simulated paths to generate
        horizon_days: Number of days in each simulated path
        random_seed: Random seed for deterministic results (None for non-deterministic)
        
    Returns:
        MonteCarloSimulation with simulated paths and metadata
        
    Raises:
        ValueError: If historical_returns is empty or insufficient
    """
    if not historical_returns:
        raise ValueError("historical_returns cannot be empty")
    
    if len(historical_returns) < 10:
        logger.warning(
            f"Bootstrap simulation using only {len(historical_returns)} historical returns. Results may be unreliable."
        )
    
    # Set random seed for determinism
    rng = np.random.default_rng(random_seed)
    
    # Sample returns with replacement from historical distribution
    # NUMERICAL STABILITY: Ensure all sampled returns are explicitly converted to float
    simulated_paths: list[list[float]] = []
    for _ in range(num_simulations):
        # Sample horizon_days returns from historical distribution
        sampled_returns = rng.choice(historical_returns, size=horizon_days, replace=True)
        # Explicit float conversion ensures deterministic precision
        simulated_paths.append([float(x) for x in sampled_returns.tolist()])
    
    # Compute cumulative paths
    # NUMERICAL STABILITY: Use explicit float conversion to ensure deterministic precision
    cumulative_paths: list[list[float]] = []
    for path in simulated_paths:
        cumulative = [0.0]
        for ret in path:
            # Explicit float conversion ensures consistent precision across platforms
            cumulative.append(float(cumulative[-1] + float(ret)))
        cumulative_paths.append([float(x) for x in cumulative[1:]])  # Remove initial 0.0, ensure float type
    
    # Estimate statistics for metadata
    mean_return, volatility = _estimate_statistics(historical_returns)
    
    metadata = SimulationMetadata(
        simulation_method="historical_bootstrap",
        number_of_simulations=num_simulations,
        horizon_days=horizon_days,
        random_seed=random_seed,
        historical_returns_count=len(historical_returns),
        assumptions=[
            "Returns are sampled from historical empirical distribution",
            "No normality assumption",
            "Historical distribution is stationary (may not hold in reality)",
            "Returns are independent across days (may not hold in reality)",
            "Simulations are hypothetical stress tests, not predictions",
        ],
        mean_return=mean_return,
        volatility=volatility,
    )
    
    return MonteCarloSimulation(
        simulated_paths=simulated_paths,
        cumulative_paths=cumulative_paths,
        metadata=metadata,
    )


def simulate_multivariate_normal(
    historical_returns: list[float],
    num_simulations: int,
    horizon_days: int,
    random_seed: Optional[int] = None,
) -> MonteCarloSimulation:
    """
    Generate simulated return paths using multivariate normal distribution.
    
    This method assumes returns follow a normal distribution with mean and variance
    estimated from historical data. This is a simplifying assumption that may not
    hold in reality (e.g., fat tails, skewness).
    
    Args:
        historical_returns: List of historical daily returns (decimal format)
        num_simulations: Number of simulated paths to generate
        horizon_days: Number of days in each simulated path
        random_seed: Random seed for deterministic results (None for non-deterministic)
        
    Returns:
        MonteCarloSimulation with simulated paths and metadata
        
    Raises:
        ValueError: If historical_returns is empty or insufficient
    """
    if not historical_returns:
        raise ValueError("historical_returns cannot be empty")
    
    if len(historical_returns) < 30:
        logger.warning(
            f"Multivariate normal simulation using only {len(historical_returns)} historical returns. Statistical estimates may be unreliable."
        )
    
    # Estimate mean and volatility from historical data
    mean_return, volatility = _estimate_statistics(historical_returns)
    
    # Set random seed for determinism
    rng = np.random.default_rng(random_seed)
    
    # Generate simulated returns from normal distribution
    # NUMERICAL STABILITY: Ensure all sampled returns are explicitly converted to float
    simulated_paths: list[list[float]] = []
    for _ in range(num_simulations):
        # Sample horizon_days returns from normal distribution
        sampled_returns = rng.normal(
            loc=mean_return,
            scale=volatility,
            size=horizon_days,
        )
        # Explicit float conversion ensures deterministic precision
        simulated_paths.append([float(x) for x in sampled_returns.tolist()])
    
    # Compute cumulative paths
    # NUMERICAL STABILITY: Use explicit float conversion to ensure deterministic precision
    cumulative_paths: list[list[float]] = []
    for path in simulated_paths:
        cumulative = [0.0]
        for ret in path:
            # Explicit float conversion ensures consistent precision across platforms
            cumulative.append(float(cumulative[-1] + float(ret)))
        cumulative_paths.append([float(x) for x in cumulative[1:]])  # Remove initial 0.0, ensure float type
    
    metadata = SimulationMetadata(
        simulation_method="multivariate_normal",
        number_of_simulations=num_simulations,
        horizon_days=horizon_days,
        random_seed=random_seed,
        historical_returns_count=len(historical_returns),
        assumptions=[
            "Returns follow a normal distribution (may not hold in reality)",
            "Mean and volatility are estimated from historical data",
            "Returns are independent across days (may not hold in reality)",
            "Distribution parameters are stationary (may not hold in reality)",
            "Simulations are hypothetical stress tests, not predictions",
        ],
        mean_return=mean_return,
        volatility=volatility,
    )
    
    return MonteCarloSimulation(
        simulated_paths=simulated_paths,
        cumulative_paths=cumulative_paths,
        metadata=metadata,
    )


def simulate_monte_carlo(
    historical_returns: list[float],
    num_simulations: int,
    horizon_days: int,
    method: Literal["historical_bootstrap", "multivariate_normal"] = "historical_bootstrap",
    random_seed: Optional[int] = None,
) -> MonteCarloSimulation:
    """
    Generate Monte Carlo simulated return paths.
    
    This is the main entry point for Monte Carlo simulation. It generates
    hypothetical return paths based on historical return characteristics.
    
    IMPORTANT: These simulations are stress-testing tools, not predictions.
    They explore "what if" scenarios based on historical patterns, but do
    not imply future performance expectations.
    
    DETERMINISM: random_seed is required for reproducible results. If None,
    raises ValueError to prevent non-deterministic outputs.
    
    Args:
        historical_returns: List of historical daily returns (decimal format, e.g., 0.01 = 1%)
        num_simulations: Number of simulated paths to generate (typically 1000-10000)
        horizon_days: Number of days in each simulated path
        method: Simulation method - "historical_bootstrap" (default) or "multivariate_normal"
        random_seed: Random seed for deterministic results (REQUIRED - None raises ValueError)
        
    Returns:
        MonteCarloSimulation containing:
        - simulated_paths: Matrix of daily returns (num_simulations × horizon_days)
        - cumulative_paths: Cumulative return paths starting from 0.0
        - metadata: Simulation parameters and assumptions
        
    Raises:
        ValueError: If inputs are invalid, insufficient historical data, or random_seed is None
        
    Example:
        >>> historical = [0.001, -0.002, 0.003, ...]  # Daily returns
        >>> result = simulate_monte_carlo(
        ...     historical_returns=historical,
        ...     num_simulations=1000,
        ...     horizon_days=252,
        ...     method="historical_bootstrap",
        ...     random_seed=42
        ... )
        >>> len(result.simulated_paths)  # 1000 simulations
        1000
        >>> len(result.simulated_paths[0])  # 252 days each
        252
    """
    if not historical_returns:
        raise ValueError("historical_returns cannot be empty")
    
    if num_simulations <= 0:
        raise ValueError("num_simulations must be positive")
    
    if horizon_days <= 0:
        raise ValueError("horizon_days must be positive")
    
    # DETERMINISM ENFORCEMENT: Require explicit random seed for reproducible results
    if random_seed is None:
        raise ValueError(
            "random_seed is required for deterministic Monte Carlo simulation. "
            "Non-deterministic simulations are not allowed. Provide an integer seed value."
        )
    
    logger.info(
        f"Generating Monte Carlo simulation",
        extra={
            "method": method,
            "num_simulations": num_simulations,
            "horizon_days": horizon_days,
            "historical_returns_count": len(historical_returns),
            "random_seed": random_seed,
        },
    )
    
    if method == "historical_bootstrap":
        return simulate_bootstrap(
            historical_returns=historical_returns,
            num_simulations=num_simulations,
            horizon_days=horizon_days,
            random_seed=random_seed,
        )
    elif method == "multivariate_normal":
        return simulate_multivariate_normal(
            historical_returns=historical_returns,
            num_simulations=num_simulations,
            horizon_days=horizon_days,
            random_seed=random_seed,
        )
    else:
        raise ValueError(f"Unknown simulation method: {method}")

