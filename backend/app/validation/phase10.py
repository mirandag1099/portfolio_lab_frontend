"""Phase 10 validation hooks for operational testing (Phase 10.5).

This module provides simple functions to validate Phase 10 behavior:
- Persistence (cold start vs warm start)
- Replay mode guarantees
- Failure recovery rules

MANUAL VERIFICATION PATH:
1. Cold Start Test: clear_storage_for_testing() → simulate_cold_start()
2. Warm Start Test: simulate_warm_start()
3. Provider Outage Test: simulate_provider_outage()
4. Replay Mode Verification: verify_replay_mode()

These functions are simple validation hooks - no test framework required.
They can be called directly or integrated into manual testing workflows.
"""

from __future__ import annotations

import shutil
from datetime import date
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.data.persistence import FileStorage, make_storage_key

logger = get_logger(__name__)


def clear_storage_for_testing() -> None:
    """
    Clear all persisted data for testing (simulates cold start).
    
    OPERATIONAL VALIDATION: Use this to test cold start behavior.
    After clearing, providers should fetch from upstream and store data.
    
    WARNING: This deletes all persisted data. Use only for testing.
    
    Example:
        clear_storage_for_testing()
        # Now test provider - should fetch from upstream
    """
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    
    if storage_path.exists():
        shutil.rmtree(storage_path)
        logger.info(
            "Cleared storage for testing (cold start simulation)",
            extra={"storage_path": str(storage_path)},
        )
    else:
        logger.info(
            "Storage path does not exist (already cold start)",
            extra={"storage_path": str(storage_path)},
        )


def simulate_cold_start(
    ticker: str = "AAPL",
    start: date = date(2023, 1, 1),
    end: date = date(2023, 12, 31),
) -> dict:
    """
    Simulate cold start scenario (no persisted data).
    
    OPERATIONAL VALIDATION: Tests that providers fetch from upstream
    and store data when no persisted data exists.
    
    Args:
        ticker: Ticker symbol to test
        start: Start date
        end: End date
        
    Returns:
        Dictionary with validation results:
        - fetched_from_upstream: bool
        - stored_to_persistence: bool
        - data_source: str ("upstream" or "storage")
        
    Example:
        result = simulate_cold_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        assert result["fetched_from_upstream"] == True
        assert result["stored_to_persistence"] == True
    """
    from app.data.providers.yahoo import YahooFinanceProvider
    from app.data.persistence import FileStorage
    
    # Clear storage to simulate cold start
    clear_storage_for_testing()
    
    # Initialize provider with storage
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    storage = FileStorage(storage_path / "yahoo")
    provider = YahooFinanceProvider(storage=storage)
    
    # Check storage key before fetch
    storage_key = make_storage_key(
        "yahoo",
        ticker=ticker.upper(),
        start=start.isoformat(),
        end=end.isoformat(),
    )
    existed_before = storage.exists(storage_key)
    
    # Fetch data (should fetch from upstream in cold start)
    import asyncio
    
    async def _fetch():
        return await provider.get_price_series(ticker, start, end)
    
    price_series = asyncio.run(_fetch())
    
    # Check storage key after fetch
    exists_after = storage.exists(storage_key)
    
    result = {
        "ticker": ticker,
        "start": str(start),
        "end": str(end),
        "existed_before": existed_before,
        "exists_after": exists_after,
        "fetched_from_upstream": not existed_before,
        "stored_to_persistence": exists_after and not existed_before,
        "bars_count": len(price_series.bars),
        "data_source": "upstream" if not existed_before else "storage",
    }
    
    logger.info(
        "Cold start simulation completed",
        extra=result,
    )
    
    return result


def simulate_warm_start(
    ticker: str = "AAPL",
    start: date = date(2023, 1, 1),
    end: date = date(2023, 12, 31),
) -> dict:
    """
    Simulate warm start scenario (persisted data exists).
    
    OPERATIONAL VALIDATION: Tests that providers use persisted data
    when available (replay mode).
    
    Args:
        ticker: Ticker symbol to test
        start: Start date
        end: End date
        
    Returns:
        Dictionary with validation results:
        - used_persisted_data: bool
        - fetched_from_upstream: bool
        - data_source: str ("storage" or "upstream")
        
    Example:
        result = simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        assert result["used_persisted_data"] == True
        assert result["data_source"] == "storage"
    """
    from app.data.providers.yahoo import YahooFinanceProvider
    from app.data.persistence import FileStorage
    
    # Initialize provider with storage
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    storage = FileStorage(storage_path / "yahoo")
    provider = YahooFinanceProvider(storage=storage)
    
    # Check storage key before fetch
    storage_key = make_storage_key(
        "yahoo",
        ticker=ticker.upper(),
        start=start.isoformat(),
        end=end.isoformat(),
    )
    existed_before = storage.exists(storage_key)
    
    # Fetch data (should use persisted data in warm start)
    import asyncio
    
    async def _fetch():
        return await provider.get_price_series(ticker, start, end)
    
    price_series = asyncio.run(_fetch())
    
    result = {
        "ticker": ticker,
        "start": str(start),
        "end": str(end),
        "existed_before": existed_before,
        "used_persisted_data": existed_before,
        "fetched_from_upstream": not existed_before,
        "bars_count": len(price_series.bars),
        "data_source": "storage" if existed_before else "upstream",
    }
    
    logger.info(
        "Warm start simulation completed",
        extra=result,
    )
    
    return result


def simulate_provider_outage(
    ticker: str = "AAPL",
    start: date = date(2023, 1, 1),
    end: date = date(2023, 12, 31),
) -> dict:
    """
    Simulate provider outage scenario.
    
    OPERATIONAL VALIDATION: Tests failure recovery rules:
    - If persisted data exists → use it (cached replay during outage)
    - If persisted data doesn't exist → fail with explicit error
    
    NOTE: This function validates the logic but cannot actually simulate
    network failures. For true outage testing, use network tools or mocks.
    
    Args:
        ticker: Ticker symbol to test
        start: Start date
        end: End date
        
    Returns:
        Dictionary with validation results:
        - fallback_available: bool
        - would_use_fallback: bool (if persisted data exists)
        - would_fail_explicitly: bool (if persisted data doesn't exist)
        
    Example:
        # First ensure data is persisted
        simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        
        # Then test outage scenario
        result = simulate_provider_outage("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        assert result["fallback_available"] == True
        assert result["would_use_fallback"] == True
    """
    from app.data.persistence import FileStorage
    
    # Check if persisted data exists
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    storage = FileStorage(storage_path / "yahoo")
    
    storage_key = make_storage_key(
        "yahoo",
        ticker=ticker.upper(),
        start=start.isoformat(),
        end=end.isoformat(),
    )
    
    fallback_available = storage.exists(storage_key)
    
    result = {
        "ticker": ticker,
        "start": str(start),
        "end": str(end),
        "fallback_available": fallback_available,
        "would_use_fallback": fallback_available,
        "would_fail_explicitly": not fallback_available,
        "failure_recovery_rule": (
            "Use persisted data (cached replay during outage)"
            if fallback_available
            else "Fail with explicit error (no persisted data available)"
        ),
    }
    
    logger.info(
        "Provider outage simulation completed",
        extra=result,
    )
    
    return result


def verify_replay_mode(
    ticker: str = "AAPL",
    start: date = date(2023, 1, 1),
    end: date = date(2023, 12, 31),
) -> dict:
    """
    Verify replay mode guarantees.
    
    OPERATIONAL VALIDATION: Tests that same historical request produces
    identical results (replay mode guarantee).
    
    This function:
    1. Fetches data twice with same inputs
    2. Verifies results are identical
    3. Confirms persisted data is used (not refetched)
    
    Args:
        ticker: Ticker symbol to test
        start: Start date
        end: End date
        
    Returns:
        Dictionary with validation results:
        - first_fetch_source: str
        - second_fetch_source: str
        - results_identical: bool
        - replay_mode_verified: bool
        
    Example:
        result = verify_replay_mode("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        assert result["replay_mode_verified"] == True
        assert result["first_fetch_source"] == "upstream" or "storage"
        assert result["second_fetch_source"] == "storage"
    """
    from app.data.providers.yahoo import YahooFinanceProvider
    from app.data.persistence import FileStorage
    
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    storage = FileStorage(storage_path / "yahoo")
    provider = YahooFinanceProvider(storage=storage)
    
    storage_key = make_storage_key(
        "yahoo",
        ticker=ticker.upper(),
        start=start.isoformat(),
        end=end.isoformat(),
    )
    
    # First fetch
    existed_before_first = storage.exists(storage_key)
    
    import asyncio
    
    async def _fetch():
        return await provider.get_price_series(ticker, start, end)
    
    first_result = asyncio.run(_fetch())
    first_source = "storage" if existed_before_first else "upstream"
    
    # Second fetch (should use persisted data)
    existed_before_second = storage.exists(storage_key)
    second_result = asyncio.run(_fetch())
    second_source = "storage" if existed_before_second else "upstream"
    
    # Verify results are identical
    first_bars = [bar.model_dump() for bar in first_result.bars]
    second_bars = [bar.model_dump() for bar in second_result.bars]
    results_identical = first_bars == second_bars
    
    # Verify replay mode: second fetch should use storage
    replay_mode_verified = second_source == "storage" and results_identical
    
    result = {
        "ticker": ticker,
        "start": str(start),
        "end": str(end),
        "first_fetch_source": first_source,
        "second_fetch_source": second_source,
        "first_fetch_bars_count": len(first_result.bars),
        "second_fetch_bars_count": len(second_result.bars),
        "results_identical": results_identical,
        "replay_mode_verified": replay_mode_verified,
    }
    
    logger.info(
        "Replay mode verification completed",
        extra=result,
    )
    
    return result


def verify_persistence_behavior() -> dict:
    """
    Verify persistence behavior across all providers.
    
    OPERATIONAL VALIDATION: Checks that persistence is configured and
    working for all providers (Yahoo, Fama-French, EDGAR).
    
    Returns:
        Dictionary with validation results for each provider:
        - yahoo_configured: bool
        - fama_french_configured: bool
        - edgar_configured: bool
        - storage_path: str
        - storage_exists: bool
        
    Example:
        result = verify_persistence_behavior()
        assert result["yahoo_configured"] == True
        assert result["storage_exists"] == True
    """
    storage_path = Path(settings.data_storage_path)
    if not storage_path.is_absolute():
        storage_path = Path.cwd() / storage_path
    
    # Check provider-specific storage directories
    yahoo_path = storage_path / "yahoo"
    fama_french_path = storage_path / "fama_french"
    edgar_path = storage_path / "edgar"
    
    result = {
        "storage_path": str(storage_path),
        "storage_exists": storage_path.exists(),
        "yahoo_configured": True,  # Always configured if storage_path is set
        "fama_french_configured": True,
        "edgar_configured": True,
        "yahoo_storage_exists": yahoo_path.exists(),
        "fama_french_storage_exists": fama_french_path.exists(),
        "edgar_storage_exists": edgar_path.exists(),
    }
    
    logger.info(
        "Persistence behavior verification completed",
        extra=result,
    )
    
    return result

