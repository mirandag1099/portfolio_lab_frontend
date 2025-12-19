"""Yahoo Finance market data provider (MVP, temporary)."""

import asyncio
import json
from datetime import date
from typing import Optional

import yfinance as yf

from app.core.exceptions import BadRequestError, NotFoundError, ProviderUnavailableError
from app.core.logging import get_logger
from app.data.models.prices import PriceBar, PriceSeries, PriceSeriesMetadata
from app.data.persistence import FileStorage, make_storage_key
from app.data.providers.base import MarketDataProvider

logger = get_logger(__name__)


class YahooFinanceProvider(MarketDataProvider):
    """
    Yahoo Finance provider (MVP, labeled as temporary).
    
    PERSISTENCE (Phase 10.1): If storage is provided, raw price data is stored and
    reused to avoid refetching identical data on every request.
    """

    MAX_REQUESTS_PER_SECOND = 2
    _last_request_time: Optional[float] = None
    _request_lock = asyncio.Lock()
    
    def __init__(self, storage: Optional[FileStorage] = None) -> None:
        """
        Initialize Yahoo Finance provider.
        
        Args:
            storage: Optional file storage for persisting raw price data
        """
        self._storage = storage

    @property
    def name(self) -> str:
        return "yahoo"

    async def _rate_limit(self) -> None:
        """
        Rate limiting to avoid overwhelming Yahoo Finance.
        
        RATE DISCIPLINE: Enforces max 2 requests per second to prevent abuse.
        
        OBSERVABILITY: Logs when rate discipline is applied (delay enforced).
        """
        async with self._request_lock:
            import time

            if self._last_request_time is not None:
                elapsed = time.time() - self._last_request_time
                min_interval = 1.0 / self.MAX_REQUESTS_PER_SECOND
                if elapsed < min_interval:
                    delay = min_interval - elapsed
                    # RATE DISCIPLINE: Explicit delay to respect Yahoo Finance limits
                    # OBSERVABILITY: Log when rate discipline is applied
                    logger.info(
                        "Yahoo Finance rate limit enforced - applying delay",
                        extra={
                            "delay_seconds": round(delay, 3),
                            "max_requests_per_second": self.MAX_REQUESTS_PER_SECOND,
                            "rate_discipline": True,
                        },
                    )
                    await asyncio.sleep(delay)
            self._last_request_time = time.time()

    async def get_price_series(self, ticker: str, start: date, end: date) -> PriceSeries:
        """
        Fetch historical price series from Yahoo Finance.
        
        PROVIDER CONTRACT: Returns valid PriceSeries or raises explicit exception.
        Never returns None or partial data.
        
        REPLAY MODE (Historical Analytics Stability):
        - Once persisted data exists for a date range, it is ALWAYS used
        - Never refetches upstream data for past dates that are already stored
        - Same historical request today vs later → identical results
        - No upstream drift affects past analytics
        
        IMPORTANT: Yahoo Finance is used as an MVP data source only.
        This is unofficial, best-effort, and temporary.
        
        Args:
            ticker: Ticker symbol
            start: Start date (inclusive)
            end: End date (inclusive)
            
        Returns:
            PriceSeries with valid price data
            
        Raises:
            NotFoundError: If ticker doesn't exist or has no data for date range
            ProviderUnavailableError: If Yahoo Finance is unreachable
            BadRequestError: If input is invalid or response is malformed
        """
        Fetch historical price series from Yahoo Finance (implementation).
        
        PROVIDER CONTRACT: Returns valid PriceSeries or raises explicit exception.
        Never returns None or partial data.
        
        REPLAY MODE (Historical Analytics Stability):
        - Once persisted data exists for a date range, it is ALWAYS used
        - Never refetches upstream data for past dates that are already stored
        - Same historical request today vs later → identical results
        - No upstream drift affects past analytics
        
        IMPORTANT: Yahoo Finance is used as an MVP data source only.
        This is unofficial, best-effort, and temporary.
        
        Args:
            ticker: Ticker symbol
            start: Start date (inclusive)
            end: End date (inclusive)
            
        Returns:
            PriceSeries with valid price data
            
        Raises:
            NotFoundError: If ticker doesn't exist or has no data for date range
            ProviderUnavailableError: If Yahoo Finance is unreachable
            BadRequestError: If input is invalid or response is malformed
        """
        # REPLAY MODE: Check storage first - if persisted data exists, use it
        # This ensures historical analytics never change once data is persisted
        # Storage key is deterministic: ticker + date range (same inputs → same key)
        storage_key = make_storage_key(
            "yahoo",
            ticker=ticker.upper(),
            start=start.isoformat(),
            end=end.isoformat(),
        )
        
        if self._storage and self._storage.exists(storage_key):
            # PERSISTENCE: Read-through behavior - load from storage if available
            # VALIDATION: Loaded data must pass same validation as fresh data
            try:
                stored_data = self._storage.read(storage_key)
                price_data = json.loads(stored_data.decode("utf-8"))
                
                # VALIDATION: Ensure stored data has required structure (same as fresh data)
                if not isinstance(price_data, dict) or "bars" not in price_data or "metadata" not in price_data:
                    raise BadRequestError(
                        f"Stored price data has invalid structure for ticker '{ticker}'. "
                        "Expected dict with 'bars' and 'metadata' keys.",
                        context={"ticker": ticker, "start": str(start), "end": str(end)},
                    )
                
                # Reconstruct PriceSeries from stored data (Pydantic validation happens here)
                bars = [PriceBar(**bar) for bar in price_data["bars"]]
                metadata = PriceSeriesMetadata(**price_data["metadata"])
                
                # VALIDATION: Ensure bars list is not empty (same validation as fresh data)
                if not bars:
                    raise NotFoundError(
                        f"No price data available for ticker '{ticker}' "
                        f"for date range {start} to {end}.",
                        context={"ticker": ticker, "start": str(start), "end": str(end)},
                    )
                
                # REPLAY MODE: Return persisted data - ensures historical analytics stability
                # Same historical request today vs later → identical results
                # No upstream drift affects past analytics
                logger.info(
                    "Loaded price series from persistence (replay mode)",
                    extra={
                        "ticker": ticker,
                        "start": str(start),
                        "end": str(end),
                        "source": "storage",
                        "bars_count": len(bars),
                        "replay_mode": True,
                    },
                )
                return PriceSeries(bars=bars, metadata=metadata)
            except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError) as exc:
                # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                # Identical invalid requests must produce identical errors for frontend stability
                raise BadRequestError(
                    f"Price data for ticker '{ticker}' is corrupted or invalid.",
                    context={"ticker": ticker, "start": str(start), "end": str(end), "error": str(exc)},
                ) from exc

        # FAILURE RECOVERY: If persisted data doesn't exist, attempt fresh fetch
        # If fresh fetch fails, check persisted data again as fallback
        # This ensures predictable behavior during outages
        
        # LOGGING DISCIPLINE: Log once when fetching fresh data (request_id added automatically)
        logger.info(
            "Fetching price series from upstream",
            extra={"ticker": ticker, "start": str(start), "end": str(end), "source": "upstream"},
        )
        
        await self._rate_limit()

        try:
            ticker_obj = yf.Ticker(ticker)
            df = ticker_obj.history(start=start, end=end, interval="1d", auto_adjust=True)

            # ERROR DETERMINISM (Phase 11.3): Same missing data always produces same error
            # Identical invalid requests must produce identical errors for frontend stability
            if df.empty:
                raise NotFoundError(
                    f"No price data available for ticker '{ticker}' "
                    f"for date range {start} to {end}.",
                    context={"ticker": ticker, "start": str(start), "end": str(end)},
                )

            bars: list[PriceBar] = []
            for idx, row in df.iterrows():
                bars.append(
                    PriceBar(
                        trading_date=idx.date(),
                        open=float(row["Open"]),
                        high=float(row["High"]),
                        low=float(row["Low"]),
                        close=float(row["Close"]),
                        adjusted_close=float(row["Close"]),  # auto_adjust=True means Close is already adjusted
                        volume=int(row["Volume"]),
                    )
                )

            # ERROR DETERMINISM (Phase 11.3): Same parsing failure always produces same error
            # Identical invalid requests must produce identical errors for frontend stability
            if not bars:
                raise NotFoundError(
                    f"No price data available for ticker '{ticker}' "
                    f"for date range {start} to {end}.",
                    context={"ticker": ticker, "start": str(start), "end": str(end)},
                )

            metadata = PriceSeriesMetadata(
                source="yahoo",
                ticker=ticker.upper(),
                currency="USD",  # Yahoo doesn't provide currency, defaulting to USD
                is_adjusted=True,
                frequency="daily",
            )

            price_series = PriceSeries(bars=bars, metadata=metadata)
            
            # REPLAY MODE: Store raw price data after successful fetch
            # GUARDRAIL: Only write if data doesn't exist (never overwrite historical data)
            # This ensures historical analytics remain stable - once persisted, never changed
            if self._storage:
                # GUARDRAIL: Check if data already exists before writing
                # Never overwrite historical data - this would break replay guarantees
                if not self._storage.exists(storage_key):
                    try:
                        # Store as JSON for easy reconstruction
                        price_data = {
                            "bars": [bar.model_dump() for bar in bars],
                            "metadata": metadata.model_dump(),
                        }
                        stored_data = json.dumps(price_data, sort_keys=True, default=str).encode("utf-8")
                        self._storage.write(storage_key, stored_data)
                        logger.debug(
                            "Stored price series to persistence",
                            extra={"ticker": ticker, "start": str(start), "end": str(end)},
                        )
                    except Exception as exc:  # noqa: BLE001
                        # Log storage failure but don't fail the request
                        logger.warning(
                            "Failed to store price series",
                            extra={"ticker": ticker, "start": str(start), "end": str(end), "error": str(exc)},
                        )
                else:
                    # REPLAY MODE: Data already exists - log but don't overwrite
                    logger.debug(
                        "Price series already persisted (replay mode - not overwriting)",
                        extra={"ticker": ticker, "start": str(start), "end": str(end)},
                    )

            return price_series

        except Exception as e:
            # FAILURE RECOVERY: If upstream fetch fails, check persisted data as fallback
            # This ensures predictable behavior during outages
            # Rule: If persisted data exists → use it, if not → fail with explicit error
            
            # Check if persisted data exists as fallback
            if self._storage and self._storage.exists(storage_key):
                # FALLBACK RULE: Persisted data exists → use it (cached replay during outage)
                logger.warning(
                    "Upstream fetch failed, using persisted data as fallback (cached replay)",
                    extra={
                        "ticker": ticker,
                        "start": str(start),
                        "end": str(end),
                        "source": "storage_fallback",
                        "upstream_error": str(e),
                        "error_type": type(e).__name__,
                        "failure_recovery": True,
                    },
                )
                
                # Load persisted data (same validation as normal replay mode)
                try:
                    stored_data = self._storage.read(storage_key)
                    price_data = json.loads(stored_data.decode("utf-8"))
                    
                    # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                    # Identical invalid requests must produce identical errors for frontend stability
                    if not isinstance(price_data, dict) or "bars" not in price_data or "metadata" not in price_data:
                        raise BadRequestError(
                            f"Price data for ticker '{ticker}' is corrupted or invalid.",
                            context={"ticker": ticker, "start": str(start), "end": str(end)},
                        )
                    
                    # Reconstruct PriceSeries from stored data
                    bars = [PriceBar(**bar) for bar in price_data["bars"]]
                    metadata = PriceSeriesMetadata(**price_data["metadata"])
                    
                    # VALIDATION: Ensure bars list is not empty
                    if not bars:
                        raise NotFoundError(
                            f"No price data available for ticker '{ticker}' "
                            f"for date range {start} to {end}.",
                            context={"ticker": ticker, "start": str(start), "end": str(end)},
                        )
                    
                    # Return persisted data (cached replay during outage)
                    return PriceSeries(bars=bars, metadata=metadata)
                except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError) as exc:
                    # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                    # Identical invalid requests must produce identical errors for frontend stability
                    raise BadRequestError(
                        f"Price data for ticker '{ticker}' is corrupted or invalid.",
                        context={
                            "ticker": ticker,
                            "start_date": str(start),
                            "end_date": str(end),
                            "upstream_error": str(e),
                            "storage_error": str(exc),
                        },
                    ) from exc
            
            # NO FALLBACK: Persisted data doesn't exist → fail with explicit error
            # Clear distinction: fresh fetch failure (no cached data available)
            error_msg = str(e).lower()
            
            # ERROR DETERMINISM (Phase 11.3): Same failure always produces same error
            # Identical invalid requests must produce identical errors for frontend stability
            # Classify error type deterministically based on error message patterns
            error_msg_lower = error_msg.lower()
            is_not_found = any(pattern in error_msg_lower for pattern in ["not found", "no data", "invalid", "does not exist", "symbol"])
            
            # ASSERTION: Ensure error classification is deterministic
            # Same error message pattern always produces same error type
            if is_not_found:
                raise NotFoundError(
                    f"No price data available for ticker '{ticker}' "
                    f"for date range {start} to {end}.",
                    context={
                        "ticker": ticker,
                        "start_date": str(start),
                        "end_date": str(end),
                    },
                )
            else:
                # Provider unavailable (network, rate limit, etc.)
                raise ProviderUnavailableError(
                    f"Market data provider is temporarily unavailable.",
                    provider_name="yahoo",
                    context={
                        "ticker": ticker,
                        "start_date": str(start),
                        "end_date": str(end),
                        "error_type": type(e).__name__,
                    },
                )

    async def is_available(self) -> bool:
        """
        Check if Yahoo Finance is available (lightweight check).
        
        PROVIDER CONTRACT: Lightweight, side-effect free check.
        Does not perform actual data fetches, only checks reachability.
        """
        try:
            # Lightweight check: try to instantiate ticker object
            # This doesn't fetch data, just checks if yfinance can connect
            ticker = yf.Ticker("AAPL")
            # Accessing .info triggers a minimal API call, but it's the lightest check available
            info = ticker.info
            return info is not None and len(info) > 0
        except Exception:
            # Provider unavailable - network issue or service down
            return False

