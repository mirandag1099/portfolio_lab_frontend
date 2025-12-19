"""Portfolio performance API endpoint."""

from fastapi import APIRouter, Body, Query
from typing import Optional, Any

from app.api.schemas import APIResponse
from app.core.exceptions import BadRequestError, NotFoundError, ProviderUnavailableError
from app.core.logging import get_logger
from app.data.providers.base import MarketDataProvider
from app.data.providers.yahoo import YahooFinanceProvider
from app.portfolio.models import Portfolio
from app.portfolio.validation import validate_portfolio
from app.analytics.returns import align_return_series, price_series_to_returns, ReturnSeries
from app.analytics.portfolio_agg import aggregate_portfolio_returns
from app.analytics.metrics import compute_metrics
from app.analytics.monte_carlo import simulate_monte_carlo
from app.analytics.monte_carlo_stats import compute_summary_stats

logger = get_logger(__name__)
router = APIRouter()


def get_provider() -> MarketDataProvider:
    """
    Get market data provider instance (singleton pattern).
    
    PERSISTENCE (Phase 10.1): Initializes optional file-based storage for raw price data.
    Storage is used to avoid refetching identical data on every request.
    """
    if not hasattr(get_provider, "_instance"):
        from pathlib import Path
        
        from app.core.config import settings
        from app.data.persistence import FileStorage
        
        # PERSISTENCE: Initialize storage if configured
        storage = None
        if settings.data_storage_path:
            storage_path = Path(settings.data_storage_path)
            # If relative path, make it relative to backend directory
            if not storage_path.is_absolute():
                storage_path = Path.cwd() / storage_path
            storage = FileStorage(storage_path / "yahoo")
        
        get_provider._instance = YahooFinanceProvider(storage=storage)
    return get_provider._instance


@router.post("/performance", response_model=APIResponse)
async def compute_portfolio_performance(
    portfolio: Portfolio = Body(..., description="Portfolio definition"),
    include_monte_carlo: bool = Query(
        default=False,
        description="Include Monte Carlo simulation results (hypothetical stress tests)",
    ),
    monte_carlo_simulations: int = Query(
        default=1000,
        description="Number of Monte Carlo simulations to run (if include_monte_carlo=true)",
        ge=100,
        le=10000,
    ),
    monte_carlo_horizon_days: int = Query(
        default=252,
        description="Horizon in days for Monte Carlo simulations (if include_monte_carlo=true)",
        ge=30,
        le=2520,
    ),
) -> APIResponse:
    """
    Compute portfolio performance metrics and optionally Monte Carlo simulations.
    
    This endpoint orchestrates the full portfolio analytics pipeline:
    1. Portfolio validation
    2. Market data fetching
    3. Return series construction and alignment
    4. Portfolio aggregation
    5. Performance metrics computation
    6. Optional Monte Carlo simulation (stress testing)
    
    IMPORTANT: Monte Carlo results are hypothetical stress tests, not predictions.
    They are included in metadata.monte_carlo when requested.
    """
    try:
        # Step 1: Validate portfolio
        provider = get_provider()
        validated_portfolio = await validate_portfolio(portfolio, provider)

        # Step 2: Fetch market data for all holdings
        price_series_map = {}
        for holding in validated_portfolio.holdings:
            # PROVIDER CONTRACT: get_price_series never returns None - raises exception instead
            series = await provider.get_price_series(
                holding.ticker, validated_portfolio.start_date, validated_portfolio.end_date
            )
            price_series_map[holding.ticker] = series
            # PROVIDER CONTRACT: All provider exceptions are typed and contextual
            # NotFoundError, ProviderUnavailableError, and BadRequestError propagate as-is

        # Fetch benchmark if provided
        # PROVIDER CONTRACT: get_price_series raises exception if data unavailable
        # If benchmark is provided, it must succeed - no silent fallback
        benchmark_series = None
        if validated_portfolio.benchmark:
            benchmark_series = await provider.get_price_series(
                validated_portfolio.benchmark,
                validated_portfolio.start_date,
                validated_portfolio.end_date,
            )

        # Step 3: Convert price series to return series
        # DETERMINISM ENFORCEMENT: Sort tickers to ensure deterministic processing order
        return_series_list: list[ReturnSeries] = []
        for ticker in sorted(price_series_map.keys()):
            price_series = price_series_map[ticker]
            return_series = price_series_to_returns(price_series)
            return_series_list.append(return_series)

        # Step 4: Align return series by date intersection
        aligned_returns, dates = align_return_series(return_series_list, validated_portfolio.start_date, validated_portfolio.end_date)
        
        if not aligned_returns:
            raise BadRequestError("No aligned return data available after date intersection")
        
        # Align benchmark returns if available
        # FAIL-FAST ENFORCEMENT: If benchmark is provided, alignment must succeed
        # Silent fallback to None masks errors and causes non-deterministic behavior
        benchmark_returns = None
        if benchmark_series:
            benchmark_return_series = price_series_to_returns(benchmark_series)
            # DETERMINISM ENFORCEMENT: Fail fast if benchmark dates don't match portfolio dates
            # Using .get() with default 0.0 masks missing data and causes non-deterministic behavior
            benchmark_return_map = {ret.trading_date: ret.return_ for ret in benchmark_return_series.returns}
            benchmark_returns = []
            for dt in dates:
                if dt not in benchmark_return_map:
                    # ERROR DETERMINISM (Phase 11.3): Same missing benchmark data always produces same error
                    # Identical invalid requests must produce identical errors for frontend stability
                    raise BadRequestError(
                        f"Benchmark '{validated_portfolio.benchmark}' missing return data for date {dt}.",
                        context={
                            "benchmark": validated_portfolio.benchmark,
                            "missing_date": str(dt),
                            "portfolio_start_date": str(validated_portfolio.start_date),
                            "portfolio_end_date": str(validated_portfolio.end_date),
                        },
                    )
                benchmark_returns.append(benchmark_return_map[dt])

        # Step 5: Aggregate portfolio returns
        portfolio_return_series = aggregate_portfolio_returns(
            aligned_returns, dates, validated_portfolio, benchmark_returns
        )

        # Step 6: Compute performance metrics
        metrics = compute_metrics(portfolio_return_series)

        # Step 7: Optional Monte Carlo simulation
        monte_carlo_summary = None
        if include_monte_carlo:
            try:
                # Use portfolio returns as historical data for simulation
                historical_returns = portfolio_return_series.returns
                
                # DETERMINISM: Seed is hardcoded constant (not derived from runtime state)
                # This ensures identical inputs produce identical Monte Carlo outputs across runs
                # Seed value 42 is arbitrary but explicit and documented
                MONTE_CARLO_SEED = 42
                
                simulation = simulate_monte_carlo(
                    historical_returns=historical_returns,
                    num_simulations=monte_carlo_simulations,
                    horizon_days=monte_carlo_horizon_days,
                    method="historical_bootstrap",
                    random_seed=MONTE_CARLO_SEED,  # Explicit constant seed for determinism
                )
                
                monte_carlo_summary = compute_summary_stats(simulation)
                
                logger.info(
                    "Monte Carlo simulation completed",
                    extra={
                        "num_simulations": monte_carlo_simulations,
                        "horizon_days": monte_carlo_horizon_days,
                    },
                )
            except Exception as e:
                logger.error(f"Monte Carlo simulation failed: {str(e)}", exc_info=True)
                # Don't fail the whole request if Monte Carlo fails
                monte_carlo_summary = None

        # CONTRACT RIGIDITY: Ensure benchmark_returns is always an array (never null)
        # If no benchmark provided, use empty array [] instead of None
        benchmark_returns_list = portfolio_return_series.benchmark_returns if portfolio_return_series.benchmark_returns is not None else []
        
        # CONTRACT RIGIDITY: Build portfolio dict with explicit benchmark handling
        # If benchmark is None, omit the field entirely (not null)
        # 
        # ORDERING NOTE: holdings array preserves input order (not sorted). This is intentional:
        # - Frontend may rely on user-specified order for display
        # - Sorting would change user intent
        # - Order is deterministic (same input → same output order)
        portfolio_dict: dict[str, Any] = {
            "holdings": [
                {"ticker": h.ticker, "weight": float(h.weight)} for h in validated_portfolio.holdings
            ],
            "currency": validated_portfolio.currency,
            "start_date": str(validated_portfolio.start_date),
            "end_date": str(validated_portfolio.end_date),
        }
        # CONTRACT RIGIDITY: Only include benchmark if it's present (explicit field presence)
        if validated_portfolio.benchmark:
            portfolio_dict["benchmark"] = validated_portfolio.benchmark
        
        # ORDERING GUARANTEE (Phase 11.1): dates, portfolio_returns, and benchmark_returns are always
        # in ascending chronological order (oldest to newest). This ensures:
        # 1. Frontend can render time series charts without reordering
        # 2. Identical requests produce identical ordering (replay-safe)
        # 3. Date-based indexing is deterministic (dates[i] corresponds to returns[i])
        # The ordering is guaranteed by align_return_series() which sorts dates ascending.
        # 
        # WHY THIS MATTERS: Frontend rendering relies on consistent ordering. If dates were
        # unordered or reordered between requests, charts would flicker, animations would break,
        # and user experience would degrade. Deterministic ordering enables stable frontend state.
        
        # LIGHTWEIGHT ASSERTION: Verify dates are in ascending order (fail fast if violated)
        dates_list = portfolio_return_series.dates
        if len(dates_list) > 1:
            assert dates_list == sorted(dates_list), (
                "dates must be in ascending order (oldest to newest). "
                "This is required for deterministic frontend rendering."
            )
        
        # Build response data
        response_data = {
            "portfolio": portfolio_dict,
            "returns": {
                # ORDERING GUARANTEE: dates are in ascending chronological order (oldest to newest)
                "dates": [str(d) for d in dates_list],
                # ORDERING GUARANTEE: portfolio_returns[i] corresponds to dates[i] (same order)
                "portfolio_returns": portfolio_return_series.returns,
                # CONTRACT RIGIDITY: benchmark_returns is always an array (never null)
                # ORDERING GUARANTEE: benchmark_returns[i] corresponds to dates[i] (same order)
                "benchmark_returns": benchmark_returns_list,
            },
            "metrics": {
                "cumulative_return": metrics.cumulative_return,
                "cagr": metrics.cagr,
                "annualized_volatility": metrics.annualized_volatility,
                "max_drawdown": metrics.max_drawdown,
                "sharpe_ratio": metrics.sharpe_ratio,
            },
        }
        
        # DEFENSIVE ASSERTION: Ensure response_data structure is valid before returning
        # Fail fast if malformed data is about to be returned
        assert isinstance(response_data, dict), "response_data must be a dict"
        assert "portfolio" in response_data, "response_data must contain 'portfolio'"
        assert "returns" in response_data, "response_data must contain 'returns'"
        assert "metrics" in response_data, "response_data must contain 'metrics'"
        assert isinstance(response_data["returns"]["benchmark_returns"], list), "benchmark_returns must be a list (never null)"
        
        # LIGHTWEIGHT ASSERTION: Verify array lengths match (dates and returns must align)
        assert len(response_data["returns"]["dates"]) == len(response_data["returns"]["portfolio_returns"]), (
            "dates and portfolio_returns must have same length for deterministic indexing"
        )
        assert len(response_data["returns"]["dates"]) == len(response_data["returns"]["benchmark_returns"]), (
            "dates and benchmark_returns must have same length for deterministic indexing"
        )

        # PROVENANCE & REPLAY METADATA (Phase 11.2): Track data sources and replay status
        # This metadata is read-only and descriptive - it explains where data came from
        # and whether results are replay-stable (historical analytics never change).
        from pathlib import Path
        from app.core.config import settings
        from app.data.persistence import FileStorage, make_storage_key
        
        # Check if price data is persisted (for replay mode detection)
        # We check storage existence for at least one ticker to determine replay status
        # This is a lightweight check - we don't need to check all tickers
        price_data_persisted = False
        replay_mode_active = False
        if settings.data_storage_path:
            storage_path = Path(settings.data_storage_path)
            if not storage_path.is_absolute():
                storage_path = Path.cwd() / storage_path
            storage = FileStorage(storage_path / "yahoo")
            
            # Check if any ticker's data is persisted (indicates replay mode)
            # If at least one ticker has persisted data, we're in replay mode
            sample_ticker = sorted(price_series_map.keys())[0] if price_series_map else None
            if sample_ticker:
                sample_storage_key = make_storage_key(
                    "yahoo",
                    ticker=sample_ticker.upper(),
                    start=validated_portfolio.start_date.isoformat(),
                    end=validated_portfolio.end_date.isoformat(),
                )
                price_data_persisted = storage.exists(sample_storage_key)
                replay_mode_active = price_data_persisted
        
        # Build metadata
        metadata: dict[str, Any] = {
            "alignment": {
                "aligned_start_date": str(dates[0]) if dates else None,
                "aligned_end_date": str(dates[-1]) if dates else None,
                "total_trading_days": len(dates),
                # ORDERING GUARANTEE (Phase 11.1): tickers are sorted alphabetically (ascending)
                # This ensures deterministic metadata ordering - same portfolio → same ticker order
                # Frontend can rely on this ordering for consistent display (e.g., legend order in charts)
                "tickers": sorted(aligned_returns.keys()),
            },
            "aggregation": {
                "method": "weighted_sum",
                "rebalancing_frequency": "daily",
                "transaction_costs": False,
                "leverage": 1.0,
            },
            "metrics": {
                "trading_days_per_year": 252,
                "risk_free_rate": 0.0,
            },
            # PROVENANCE METADATA (Phase 11.2): Expose existing data source information
            # This is read-only and descriptive - explains where data came from
            "provenance": {
                "data_sources": ["yahoo"],  # Market price data source
                "replay_mode": replay_mode_active,  # True if data was loaded from persistence
                "persisted": price_data_persisted,  # True if price data is persisted
                # as_of_date: Not deterministically known (Yahoo doesn't provide this)
                # We don't fabricate dates - only include if deterministically known
            },
            # VERSIONING SEMANTICS (Phase 11.2): Explain replay stability guarantees
            # Per PRD v2.0 and Phase 10: Historical analytics never change once persisted
            # This field explains WHY newer upstream data does not affect past results
            "versioning": {
                "result_stability": "replay-stable",
                "version_semantics": "immutable-historical",
                # DOCUMENTATION: Why historical analytics never change (per PRD v2.0):
                # - Once raw data is persisted for a date range, it is ALWAYS used (replay mode)
                # - Never overwrites existing data (ensures historical analytics remain stable)
                # - Same historical request today vs later → identical results
                # - No upstream drift affects past analytics
                # - This is a core guarantee: historical results are immutable and replay-safe
                "explanation": (
                    "Historical analytics are replay-stable: once raw data is persisted for a date range, "
                    "it is always used for that range. Newer upstream data does not affect past results. "
                    "Same historical request today vs later produces identical results. This ensures "
                    "auditability and prevents historical analytics from drifting over time."
                ),
            },
        }

        # CONTRACT RIGIDITY: Add Monte Carlo to metadata only if available (explicit field presence)
        # If not available, field is absent (not null) - this is correct per contract
        if monte_carlo_summary:
            metadata["monte_carlo"] = {
                "terminal_return_percentiles": {
                    "p5": monte_carlo_summary.terminal_return_percentiles.p5,
                    "p25": monte_carlo_summary.terminal_return_percentiles.p25,
                    "p50": monte_carlo_summary.terminal_return_percentiles.p50,
                    "p75": monte_carlo_summary.terminal_return_percentiles.p75,
                    "p95": monte_carlo_summary.terminal_return_percentiles.p95,
                },
                "max_drawdown_distribution": {
                    "p5": monte_carlo_summary.max_drawdown_distribution.p5,
                    "p25": monte_carlo_summary.max_drawdown_distribution.p25,
                    "p50": monte_carlo_summary.max_drawdown_distribution.p50,
                    "p75": monte_carlo_summary.max_drawdown_distribution.p75,
                    "p95": monte_carlo_summary.max_drawdown_distribution.p95,
                    "worst": monte_carlo_summary.max_drawdown_distribution.worst,
                },
                "probability_of_loss": monte_carlo_summary.probability_of_loss,
                "number_of_simulations": monte_carlo_summary.number_of_simulations,
                "horizon_days": monte_carlo_summary.horizon_days,
                "disclaimer": monte_carlo_summary.disclaimer,
            }
        
        # DEFENSIVE ASSERTION: Ensure metadata is always a dict (never None)
        # This is enforced by APIResponse schema, but assert here for fail-fast behavior
        assert isinstance(metadata, dict), "metadata must be a dict (never None)"

        return APIResponse(data=response_data, metadata=metadata)

    except (NotFoundError, BadRequestError, ProviderUnavailableError):
        # PROVIDER CONTRACT: All provider exceptions are typed and propagate as-is
        raise
    except Exception as e:
        # OBSERVABILITY: Include minimal context - full portfolio details may be sensitive
        # No duplicate logging - middleware/exception handler will log with request ID
        raise BadRequestError(
            f"Failed to compute portfolio performance: {str(e)}",
            context={"exception_type": type(e).__name__},
        )

