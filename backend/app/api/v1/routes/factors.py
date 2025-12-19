"""Factor analysis API endpoint."""

from fastapi import APIRouter, Body
from typing import Any

from app.api.schemas import APIResponse
from app.core.exceptions import BadRequestError, NotFoundError, ProviderUnavailableError
from app.core.logging import get_logger
from app.data.providers.base import MarketDataProvider
from app.data.providers.yahoo import YahooFinanceProvider
from app.data.providers.fama_french import get_factor_series
from app.portfolio.models import Portfolio
from app.portfolio.validation import validate_portfolio
from app.analytics.returns import align_return_series, price_series_to_returns, ReturnSeries
from app.analytics.portfolio_agg import aggregate_portfolio_returns
from app.analytics.factors import align_portfolio_with_factors
from app.analytics.regression import run_factor_regression

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


@router.post("/factors", response_model=APIResponse)
async def compute_factor_analysis(
    portfolio: Portfolio = Body(..., description="Portfolio definition"),
) -> APIResponse:
    """
    Compute Fama-French factor analysis for portfolio returns.
    
    This endpoint performs factor regression analysis to attribute portfolio
    returns to market, size (SMB), and value (HML) factors. Results are
    descriptive attribution, not forecasting or investment advice.
    
    Pipeline:
    1. Portfolio validation
    2. Market data fetching
    3. Return series construction and alignment
    4. Portfolio aggregation
    5. Fama-French factor loading
    6. Factor alignment with portfolio returns
    7. Regression analysis
    
    IMPORTANT: Factor analysis results are descriptive attribution only.
    They explain historical relationships, not future performance.
    Alpha and factor loadings describe what happened, not what will happen.
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

        # Step 3: Convert price series to return series
        # DETERMINISM ENFORCEMENT: Sort tickers to ensure deterministic processing order
        return_series_list: list[ReturnSeries] = []
        for ticker in sorted(price_series_map.keys()):
            price_series = price_series_map[ticker]
            return_series = price_series_to_returns(price_series)
            return_series_list.append(return_series)

        # Step 4: Align return series by date intersection
        aligned_returns, dates = align_return_series(
            return_series_list, validated_portfolio.start_date, validated_portfolio.end_date
        )
        
        if not aligned_returns:
            raise BadRequestError("No aligned return data available after date intersection")

        # Step 5: Aggregate portfolio returns
        portfolio_return_series = aggregate_portfolio_returns(
            aligned_returns, dates, validated_portfolio, benchmark_returns=None
        )

        # Step 6: Load Fama-French factors
        # PERSISTENCE (Phase 10.1): Initialize storage for Fama-French factors
        from pathlib import Path
        
        from app.core.config import settings
        from app.data.persistence import FileStorage
        
        storage = None
        if settings.data_storage_path:
            storage_path = Path(settings.data_storage_path)
            if not storage_path.is_absolute():
                storage_path = Path.cwd() / storage_path
            storage = FileStorage(storage_path / "fama_french")
        
        try:
            factor_series = get_factor_series(
                start_date=validated_portfolio.start_date,
                end_date=validated_portfolio.end_date,
                storage=storage,
            )
        except Exception as e:
            # OBSERVABILITY: Include portfolio context in error
            # No duplicate logging - exception handler will log with request ID
            raise BadRequestError(
                f"Failed to load Fama-French factor data: {str(e)}",
                context={
                    "start_date": str(validated_portfolio.start_date),
                    "end_date": str(validated_portfolio.end_date),
                },
            )

        # Step 7: Align portfolio returns with factors
        # FAIL-FAST ENFORCEMENT: Factor alignment is required - no silent fallback
        try:
            aligned_factor_data = align_portfolio_with_factors(
                portfolio_returns=portfolio_return_series,
                factor_series=factor_series,
            )
        except ValueError as e:
            # OBSERVABILITY: Include portfolio context in error
            # No duplicate logging - exception handler will log with request ID
            raise BadRequestError(
                f"Could not align portfolio returns with factors: {str(e)}",
                context={
                    "portfolio_start_date": str(validated_portfolio.start_date),
                    "portfolio_end_date": str(validated_portfolio.end_date),
                    "tickers": [h.ticker for h in validated_portfolio.holdings],
                },
            )

        # Step 8: Run factor regression
        # FAIL-FAST ENFORCEMENT: Factor regression is required - no silent fallback
        try:
            regression_results = run_factor_regression(aligned_factor_data)
        except ValueError as e:
            # OBSERVABILITY: Include portfolio context in error
            # No duplicate logging - exception handler will log with request ID
            raise BadRequestError(
                f"Factor regression failed: {str(e)}",
                context={
                    "portfolio_start_date": str(validated_portfolio.start_date),
                    "portfolio_end_date": str(validated_portfolio.end_date),
                    "tickers": [h.ticker for h in validated_portfolio.holdings],
                },
            )

        # ORDERING NOTE: holdings array preserves input order (not sorted). This is intentional:
        # - Frontend may rely on user-specified order for display
        # - Sorting would change user intent
        # - Order is deterministic (same input → same output order)
        
        # Build response data
        response_data: dict[str, Any] = {
            "portfolio": {
                "holdings": [
                    {"ticker": h.ticker, "weight": float(h.weight)} for h in validated_portfolio.holdings
                ],
                "currency": validated_portfolio.currency,
                "start_date": str(validated_portfolio.start_date),
                "end_date": str(validated_portfolio.end_date),
            },
            "alpha": {
                "value": regression_results.alpha,
                "annualized": regression_results.alpha * 252,  # Annualize daily alpha
                "t_statistic": regression_results.statistics.alpha_t_stat,
                "p_value": regression_results.statistics.alpha_p_value,
                "interpretation": (
                    "Alpha represents the average daily excess return (portfolio return minus "
                    "risk-free rate) not explained by market, size, or value factors. "
                    "IMPORTANT: Alpha ≠ skill. A positive alpha may result from: (1) omitted "
                    "factors not in the model, (2) measurement error, (3) luck, (4) model "
                    "misspecification, or (5) genuine skill. Statistical significance (p-value) "
                    "indicates whether alpha differs from zero with confidence, but does not "
                    "establish causation or skill. This is descriptive attribution of past "
                    "returns only, not a prediction of future performance."
                ),
            },
            "factor_loadings": {
                "market_beta": {
                    "value": regression_results.factor_loadings.market_beta,
                    "t_statistic": regression_results.statistics.market_t_stat,
                    "p_value": regression_results.statistics.market_p_value,
                    "interpretation": (
                        "Market beta measures sensitivity to market excess returns. "
                        "Beta = 1.0 means portfolio moves with the market. "
                        "Beta > 1.0 means more volatile than market. "
                        "Beta < 1.0 means less volatile than market."
                    ),
                },
                "smb_beta": {
                    "value": regression_results.factor_loadings.smb_beta,
                    "t_statistic": regression_results.statistics.smb_t_stat,
                    "p_value": regression_results.statistics.smb_p_value,
                    "interpretation": (
                        "SMB (Small Minus Big) beta measures sensitivity to size factor. "
                        "Positive beta means portfolio tilts toward small-cap stocks. "
                        "Negative beta means portfolio tilts toward large-cap stocks."
                    ),
                },
                "hml_beta": {
                    "value": regression_results.factor_loadings.hml_beta,
                    "t_statistic": regression_results.statistics.hml_t_stat,
                    "p_value": regression_results.statistics.hml_p_value,
                    "interpretation": (
                        "HML (High Minus Low) beta measures sensitivity to value factor. "
                        "Positive beta means portfolio tilts toward value stocks. "
                        "Negative beta means portfolio tilts toward growth stocks."
                    ),
                },
            },
            "regression_statistics": {
                "r_squared": regression_results.statistics.r_squared,
                "adjusted_r_squared": regression_results.statistics.adjusted_r_squared,
                "num_observations": regression_results.num_observations,
                "interpretation": (
                    "R-squared measures how much of portfolio return variance is explained by factors. "
                    "Higher R² means factors explain more of portfolio returns. "
                    "Adjusted R² penalizes for number of factors."
                ),
            },
        }

        # PROVENANCE & REPLAY METADATA (Phase 11.2): Track data sources and replay status
        # This metadata is read-only and descriptive - it explains where data came from
        # and whether results are replay-stable (historical analytics never change).
        from pathlib import Path
        from app.core.config import settings
        from app.data.persistence import FileStorage, make_storage_key
        
        # Check if price data and factor data are persisted (for replay mode detection)
        price_data_persisted = False
        factor_data_persisted = False
        replay_mode_active = False
        if settings.data_storage_path:
            storage_path = Path(settings.data_storage_path)
            if not storage_path.is_absolute():
                storage_path = Path.cwd() / storage_path
            
            # Check price data persistence
            yahoo_storage = FileStorage(storage_path / "yahoo")
            sample_ticker = sorted(price_series_map.keys())[0] if price_series_map else None
            if sample_ticker:
                price_storage_key = make_storage_key(
                    "yahoo",
                    ticker=sample_ticker.upper(),
                    start=validated_portfolio.start_date.isoformat(),
                    end=validated_portfolio.end_date.isoformat(),
                )
                price_data_persisted = yahoo_storage.exists(price_storage_key)
            
            # Check factor data persistence
            fama_french_storage = FileStorage(storage_path / "fama_french")
            factor_storage_key = make_storage_key(
                "fama_french",
                dataset="daily_factors",
                start=validated_portfolio.start_date.isoformat(),
                end=validated_portfolio.end_date.isoformat(),
            )
            factor_data_persisted = fama_french_storage.exists(factor_storage_key)
            
            # Replay mode is active if any data is persisted
            replay_mode_active = price_data_persisted or factor_data_persisted
        
        # Build metadata
        metadata: dict[str, Any] = {
            "alignment": {
                "portfolio_original_start": str(aligned_factor_data.metadata.portfolio_original_start),
                "portfolio_original_end": str(aligned_factor_data.metadata.portfolio_original_end),
                "portfolio_original_days": aligned_factor_data.metadata.portfolio_original_days,
                "factor_original_start": str(aligned_factor_data.metadata.factor_original_start),
                "factor_original_end": str(aligned_factor_data.metadata.factor_original_end),
                "factor_original_days": aligned_factor_data.metadata.factor_original_days,
                "aligned_start": str(aligned_factor_data.metadata.aligned_start) if aligned_factor_data.metadata.aligned_start else None,
                "aligned_end": str(aligned_factor_data.metadata.aligned_end) if aligned_factor_data.metadata.aligned_end else None,
                "aligned_days": aligned_factor_data.metadata.aligned_days,
                "portfolio_dropped_days": aligned_factor_data.metadata.portfolio_dropped_days,
                "factor_dropped_days": aligned_factor_data.metadata.factor_dropped_days,
            },
            "regression": {
                "method": "OLS",
                "model": "R_portfolio - RF = alpha + β_mkt * (MKT - RF) + β_smb * SMB + β_hml * HML + error",
                "factors_used": ["MKT-RF", "SMB", "HML"],
                "assumptions": regression_results.assumptions,
            },
            "factor_data": {
                "source": factor_series.metadata.source,
                "dataset_name": factor_series.metadata.dataset_name,
                "frequency": factor_series.metadata.frequency,
            },
            # PROVENANCE METADATA (Phase 11.2): Expose existing data source information
            # This is read-only and descriptive - explains where data came from
            "provenance": {
                "data_sources": ["yahoo", "fama_french"],  # Market price + factor data sources
                "replay_mode": replay_mode_active,  # True if data was loaded from persistence
                "persisted": {
                    "price_data": price_data_persisted,  # True if price data is persisted
                    "factor_data": factor_data_persisted,  # True if factor data is persisted
                },
                # as_of_date: Not deterministically known (providers don't provide this)
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
            "disclaimers": {
                "primary": (
                    "Factor analysis results are descriptive attribution only. They explain "
                    "historical relationships between portfolio returns and factors. Alpha and "
                    "factor loadings describe what happened in the past, not what will happen "
                    "in the future. These results are not investment advice."
                ),
                "alpha_interpretation": (
                    "Alpha (intercept) represents the average excess return not explained by "
                    "market, size, or value factors. Alpha ≠ skill. A positive alpha may "
                    "result from: (1) omitted factors not in the model, (2) measurement error, "
                    "(3) luck, (4) model misspecification, or (5) genuine skill. Statistical "
                    "significance (p-value) indicates whether alpha differs from zero with "
                    "confidence, but does not establish causation or skill."
                ),
                "statistical_uncertainty": (
                    "All regression coefficients (alpha, betas) are point estimates with "
                    "statistical uncertainty. t-statistics and p-values quantify this uncertainty. "
                    "A p-value < 0.05 indicates statistical significance at the 5% level, meaning "
                    "there is less than 5% probability the coefficient is zero by chance alone. "
                    "However, statistical significance does not imply economic significance or "
                    "predictive power."
                ),
                "model_limitations": (
                    "The Fama-French 3-factor model is a simplified representation of return "
                    "generation. It assumes linear relationships, stationary factors, and "
                    "homoscedastic residuals. Real markets may violate these assumptions. "
                    "The model explains historical variance (R²) but does not predict future "
                    "returns. Factor loadings may change over time due to portfolio composition "
                    "changes, market regime shifts, or factor evolution."
                ),
                "data_limitations": (
                    "Factor analysis requires aligned date ranges between portfolio returns and "
                    "factor returns. Missing dates are excluded (intersection-only alignment). "
                    "This may reduce the analysis period and affect statistical power. Factor "
                    "data comes from official Fama-French datasets, but portfolio returns depend "
                    "on market data provider accuracy and availability."
                ),
            },
        }

        logger.info(
            f"Factor analysis completed",
            extra={
                "alpha": regression_results.alpha,
                "market_beta": regression_results.factor_loadings.market_beta,
                "r_squared": regression_results.statistics.r_squared,
                "num_observations": regression_results.num_observations,
            },
        )
        
        # DEFENSIVE ASSERTION: Ensure response_data structure is valid before returning
        # Fail fast if malformed data is about to be returned
        assert isinstance(response_data, dict), "response_data must be a dict"
        assert "portfolio" in response_data, "response_data must contain 'portfolio'"
        assert "alpha" in response_data, "response_data must contain 'alpha'"
        assert "factor_loadings" in response_data, "response_data must contain 'factor_loadings'"
        assert "regression_statistics" in response_data, "response_data must contain 'regression_statistics'"
        
        # DEFENSIVE ASSERTION: Ensure metadata is always a dict (never None)
        assert isinstance(metadata, dict), "metadata must be a dict (never None)"

        return APIResponse(data=response_data, metadata=metadata)

    except (NotFoundError, BadRequestError, ProviderUnavailableError):
        # PROVIDER CONTRACT: All provider exceptions are typed and propagate as-is
        raise
    except Exception as e:
        # OBSERVABILITY: Include minimal context - full portfolio details may be sensitive
        # No duplicate logging - middleware/exception handler will log with request ID
        raise BadRequestError(
            f"Failed to compute factor analysis: {str(e)}",
            context={"exception_type": type(e).__name__},
        )

