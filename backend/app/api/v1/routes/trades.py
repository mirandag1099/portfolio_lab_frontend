"""Read-only trade APIs (Phase 6.5).

These endpoints expose normalized trade events for browsing and pattern
recognition. They are strictly observational and non-predictive.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from app.api.schemas import APIResponse
from app.core.config import settings
from app.core.exceptions import BadRequestError, APIException
from app.core.logging import get_logger
from app.trades.models import TradeEvent
from app.trades.providers.edgar import EdgarForm4Provider
from app.trades.providers.quiver import QuiverTradeProvider


logger = get_logger(__name__)
router = APIRouter()


# Standardized disclaimer text (Phase 6.6)
OBSERVATIONAL_ONLY_LABEL = (
    "OBSERVATIONAL ONLY: This data is descriptive and historical. "
    "It does not predict future performance, generate investment signals, "
    "or constitute investment advice."
)


def build_trade_metadata(
    source: str,
    source_attribution: str,
    time_delay_disclaimer: str,
    additional_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build standardized trade response metadata with enforced disclaimers (Phase 6.6).
    
    This function ensures every trade response includes:
    - Time delay disclaimer
    - "Observational only" label
    - Source attribution
    
    Raises APIException if any required disclaimer is missing.
    
    Args:
        source: Source identifier (e.g., "quiver", "sec_edgar_form4")
        source_attribution: Human-readable source attribution
        time_delay_disclaimer: Time delay disclaimer text
        additional_metadata: Optional additional metadata fields
        
    Returns:
        Standardized metadata dictionary with all required disclaimers
        
    Raises:
        APIException: If any required disclaimer field is missing or empty
    """
    # Validate required fields (backend enforcement)
    if not source or not source.strip():
        raise APIException(
            "Missing source attribution in trade metadata",
            status_code=500,
            error_code="MISSING_SOURCE_ATTRIBUTION",
        )
    
    if not source_attribution or not source_attribution.strip():
        raise APIException(
            "Missing source attribution text in trade metadata",
            status_code=500,
            error_code="MISSING_SOURCE_ATTRIBUTION_TEXT",
        )
    
    if not time_delay_disclaimer or not time_delay_disclaimer.strip():
        raise APIException(
            "Missing time delay disclaimer in trade metadata",
            status_code=500,
            error_code="MISSING_TIME_DELAY_DISCLAIMER",
        )
    
    # Build standardized metadata
    metadata: Dict[str, Any] = {
        "source": source,
        "source_attribution": source_attribution,
        "time_delay_disclaimer": time_delay_disclaimer,
        "observational_only_label": OBSERVATIONAL_ONLY_LABEL,
    }
    
    # Merge additional metadata if provided
    if additional_metadata:
        metadata.update(additional_metadata)
    
    return metadata


def get_quiver_provider() -> QuiverTradeProvider:
    """
    Provider factory for Quiver politician trades.
    
    DEPRECATED (Phase 8): Quiver is deprecated and non-strategic per PRD v2.0.
    This factory respects the quiver_enabled feature flag - if disabled,
    provider methods will fail fast with explicit errors.
    """
    return QuiverTradeProvider()


def get_edgar_provider() -> EdgarForm4Provider:
    """
    Provider factory for EDGAR Form 4 insider trades.
    
    PERSISTENCE (Phase 10.1): Initializes optional file-based storage for raw EDGAR data.
    Storage is used to avoid refetching identical data on every request.
    """
    from pathlib import Path
    
    from app.core.config import settings
    from app.data.persistence import FileStorage
    
    # PERSISTENCE: Initialize storage if configured
    storage = None
    if settings.data_storage_path:
        storage_path = Path(settings.data_storage_path)
        # If relative path, make it relative to backend directory
        if not storage_path.is_absolute():
            # Assume we're running from backend directory
            storage_path = Path.cwd() / storage_path
        storage = FileStorage(storage_path / "edgar")
    
    return EdgarForm4Provider(storage=storage)


@router.get(
    "/trades/politicians",
    response_model=APIResponse,
    summary="Browse US politician trade disclosures (Quiver, observational only)",
)
async def get_politician_trades(
    politician: Optional[str] = Query(
        default=None,
        description="Optional politician name filter (e.g., 'Nancy Pelosi').",
    ),
    start_date: Optional[date] = Query(
        default=None,
        description="Optional start date (inclusive) for transaction_date filter.",
    ),
    end_date: Optional[date] = Query(
        default=None,
        description="Optional end date (inclusive) for transaction_date filter.",
    ),
    provider: QuiverTradeProvider = Depends(get_quiver_provider),
) -> APIResponse:
    """Return normalized trade events for US politicians.

    DEPRECATED (Phase 8): This endpoint uses Quiver, which is deprecated and non-strategic.
    Quiver integration can be disabled via the quiver_enabled feature flag.

    All data is:
    - Public and time-delayed
    - Observational and descriptive
    - Non-predictive and not investment advice
    """
    # FEATURE FLAG: Check if trade endpoints are enabled
    if not settings.trades_endpoints_enabled:
        raise BadRequestError(
            "Trade endpoints are disabled. "
            "Set TRADES_ENDPOINTS_ENABLED=true to enable trade data endpoints.",
            context={"feature_flag": "trades_endpoints_enabled"},
        )
    
    if start_date and end_date and end_date < start_date:
        raise BadRequestError("end_date must be on or after start_date")

    if not await provider.is_available():
        raise BadRequestError(
            "Quiver trade provider is not configured; "
            "set QUIVER_API_KEY to enable politician trade data."
        )

    events: list[TradeEvent] = await provider.get_politician_trades(
        politician=politician,
        start_date=start_date,
        end_date=end_date,
    )

    # CONTRACT RIGIDITY: events is always a list (never None)
    # Provider contract guarantees this, but assert for fail-fast behavior
    assert isinstance(events, list), "events must be a list (never None)"
    
    # ORDERING GUARANTEE (Phase 11.1): events are sorted deterministically by the provider
    # (QuiverTradeProvider) before returning. The same query always produces the same ordering.
    # 
    # WHY THIS MATTERS: Frontend rendering relies on consistent ordering. Deterministic
    # ordering enables stable frontend state and predictable UI behavior.
    # 
    # LIGHTWEIGHT ASSERTION: Verify events are sorted by transaction_date (ascending)
    if len(events) > 1:
        transaction_dates = [e.transaction_date for e in events]
        assert transaction_dates == sorted(transaction_dates), (
            "events must be sorted by transaction_date (ascending). "
            "This is required for deterministic frontend rendering."
        )
    
    # PROVENANCE METADATA (Phase 11.2): Quiver does not have persistence implemented
    # (it's deprecated per PRD v2.0), so persisted and replay_mode are always False
    # This is explicit - we don't fabricate values
    
    # Build metadata with enforced disclaimers (Phase 6.6)
    metadata = build_trade_metadata(
        source="quiver",
        source_attribution="Quiver Quantitative - US Politician Trade Disclosures",
        time_delay_disclaimer=(
            "Trade data is based on public disclosure filings and is "
            "time-delayed by design. Filings may be delayed by days or weeks "
            "after the transaction date. This data is descriptive, not predictive."
        ),
        additional_metadata={
            "type": "politician_trades",
            "coverage_notes": (
                "Coverage is limited to US politician trades captured by Quiver. "
                "Data may be incomplete or revised over time."
            ),
            "filters": {
                "politician": politician,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
            # PROVENANCE METADATA (Phase 11.2): Expose existing data source information
            # This is read-only and descriptive - explains where data came from
            "provenance": {
                "data_sources": ["quiver"],  # Trade data source
                "replay_mode": False,  # Quiver does not have persistence (deprecated)
                "persisted": False,  # Quiver does not have persistence (deprecated)
                # as_of_date: Not deterministically known (Quiver doesn't provide this)
                # We don't fabricate dates - only include if deterministically known
            },
            # VERSIONING SEMANTICS (Phase 11.2): Quiver is deprecated and non-strategic
            # Note: Quiver data is not replay-stable (no persistence)
            "versioning": {
                "result_stability": None,  # Quiver does not have replay guarantees
                "version_semantics": None,  # Quiver does not have versioning semantics
                "explanation": (
                    "Quiver is deprecated and non-strategic per PRD v2.0. "
                    "This data source does not have replay-stability guarantees. "
                    "For replay-stable trade data, use EDGAR-based endpoints."
                ),
            },
        },
    )
    
    # DEFENSIVE ASSERTION: Ensure metadata is always a dict (never None)
    assert isinstance(metadata, dict), "metadata must be a dict (never None)"

    return APIResponse(data=events, metadata=metadata)


@router.get(
    "/trades/insiders",
    response_model=APIResponse,
    summary="Browse insider trades via SEC EDGAR Form 4 (observational only)",
)
async def get_insider_trades(
    cik: str = Query(
        ...,
        description=(
            "Company CIK (Central Index Key) used to fetch Form 4 filings from EDGAR."
        ),
    ),
    start_date: Optional[date] = Query(
        default=None,
        description="Optional start date (inclusive) for filing_date filter.",
    ),
    end_date: Optional[date] = Query(
        default=None,
        description="Optional end date (inclusive) for filing_date filter.",
    ),
    provider: EdgarForm4Provider = Depends(get_edgar_provider),
) -> APIResponse:
    """
    Return normalized insider trade events from SEC Form 4 filings.
    
    GUARDRAILS (Phase 9.3):
    - This endpoint uses EDGAR Form 4 filings EXCLUSIVELY for insider trades
    - Quiver MUST NEVER be used for insider trades
    - There is NO fallback to Quiver - EDGAR failures result in explicit errors
    - Any attempt to use Quiver for insiders will fail fast with BadRequestError
    
    This endpoint is the ONLY valid path for insider trades. All insider trades
    must come from EDGAR via EdgarForm4Provider.
    """
    # GUARDRAIL (Phase 9.3): Explicitly prevent Quiver usage for insider trades
    # This endpoint MUST ONLY use EDGAR. Quiver is not allowed for insiders.
    # FEATURE FLAG: Check if trade endpoints are enabled
    if not settings.trades_endpoints_enabled:
        raise BadRequestError(
            "Trade endpoints are disabled. "
            "Set TRADES_ENDPOINTS_ENABLED=true to enable trade data endpoints.",
            context={"feature_flag": "trades_endpoints_enabled"},
        )
    
    if start_date and end_date and end_date < start_date:
        raise BadRequestError("end_date must be on or after start_date")

    # VALIDATION (Phase 9.5): All exceptions from provider propagate as structured ErrorResponse
    # - "No filings found" → valid empty list (provider returns [])
    # - "Filing exists but reports no transactions" → valid empty list (provider returns [])
    # - "Transactions exist but all fail parsing" → BadRequestError (provider raises)
    # - Network/SEC outage → ProviderUnavailableError (provider raises)
    # - Malformed SEC response → BadRequestError (provider raises)
    # FastAPI exception handlers convert these to ErrorResponse at API boundary
    events: list[TradeEvent] = await provider.get_insider_trades_for_cik(
        cik=cik,
        start_date=start_date,
        end_date=end_date,
    )

    # CONTRACT RIGIDITY: events is always a list (never None)
    # Provider contract guarantees this (returns [] for no filings, not None)
    assert isinstance(events, list), "events must be a list (never None)"
    
    # ORDERING GUARANTEE (Phase 11.1): events are sorted deterministically by:
    # 1. transaction_date (ascending, oldest to newest)
    # 2. actor_id (ascending, for same date)
    # 3. source.value (ascending, for same date/actor)
    # 4. transaction_index (ascending, for SEC trades with same date/actor/source)
    # 5. stable_identity (for bit-for-bit stability)
    # 
    # This ordering is enforced by the provider (EdgarForm4Provider) before returning events.
    # The same EDGAR filing(s) always produce the same event ordering (replay-safe).
    # 
    # WHY THIS MATTERS: Frontend rendering relies on consistent ordering. If events were
    # reordered between identical requests, list rendering would flicker, scroll positions
    # would jump, and user experience would degrade. Deterministic ordering enables stable
    # frontend state and predictable UI behavior.
    # 
    # LIGHTWEIGHT ASSERTION: Verify events are sorted by transaction_date (ascending)
    if len(events) > 1:
        transaction_dates = [e.transaction_date for e in events]
        assert transaction_dates == sorted(transaction_dates), (
            "events must be sorted by transaction_date (ascending). "
            "This is required for deterministic frontend rendering."
        )
    
    # PROVENANCE & REPLAY METADATA (Phase 11.2): Track data sources and replay status
    # Check if EDGAR data is persisted (for replay mode detection)
    from pathlib import Path
    from app.core.config import settings
    from app.data.persistence import FileStorage, make_storage_key
    
    edgar_data_persisted = False
    replay_mode_active = False
    if settings.data_storage_path:
        storage_path = Path(settings.data_storage_path)
        if not storage_path.is_absolute():
            storage_path = Path.cwd() / storage_path
        edgar_storage = FileStorage(storage_path / "edgar")
        
        # Check if submissions data is persisted (indicates replay mode)
        cik_normalized = cik.strip().lstrip("0")
        submissions_key = make_storage_key("edgar", type="submissions", cik=cik_normalized)
        edgar_data_persisted = edgar_storage.exists(submissions_key)
        replay_mode_active = edgar_data_persisted
    
    # Build metadata with enforced disclaimers (Phase 6.6)
    metadata = build_trade_metadata(
        source="sec_edgar_form4",
        source_attribution="SEC EDGAR - Form 4 Insider Trading Filings",
        time_delay_disclaimer=(
            "Trade data is based on public Form 4 filings submitted to the SEC. "
            "Form 4 filings are required within 2 business days of the transaction, "
            "but may be delayed, corrected, or amended. This data is descriptive, not predictive."
        ),
        additional_metadata={
            "type": "insider_trades",
            "coverage_notes": (
                "Coverage is limited to Form 4 filings associated with the provided CIK. "
                "Filings may be missing, amended, or subject to parsing limitations."
            ),
            "filters": {
                "cik": cik,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
            # PROVENANCE METADATA (Phase 11.2): Expose existing data source information
            # This is read-only and descriptive - explains where data came from
            "provenance": {
                "data_sources": ["sec_edgar"],  # Trade data source
                "replay_mode": replay_mode_active,  # True if data was loaded from persistence
                "persisted": edgar_data_persisted,  # True if EDGAR data is persisted
                # as_of_date: Not deterministically known (EDGAR doesn't provide this)
                # We don't fabricate dates - only include if deterministically known
            },
            # VERSIONING SEMANTICS (Phase 11.2): Explain replay stability guarantees
            # Per PRD v2.0 and Phase 10: Historical analytics never change once persisted
            "versioning": {
                "result_stability": "replay-stable",
                "version_semantics": "immutable-historical",
                # DOCUMENTATION: Why historical analytics never change (per PRD v2.0):
                # - Once raw EDGAR data is persisted, it is ALWAYS used (replay mode)
                # - Never overwrites existing data (ensures historical trade data remains stable)
                # - Same historical request today vs later → identical results
                # - No upstream drift affects past analytics
                "explanation": (
                    "Historical trade data is replay-stable: once raw EDGAR filings are persisted, "
                    "they are always used for that CIK. Newer upstream data does not affect past results. "
                    "Same historical request today vs later produces identical results. This ensures "
                    "auditability and prevents historical trade data from drifting over time."
                ),
            },
        },
    )
    
    # DEFENSIVE ASSERTION: Ensure metadata is always a dict (never None)
    assert isinstance(metadata, dict), "metadata must be a dict (never None)"

    return APIResponse(data=events, metadata=metadata)


@router.get(
    "/trades/ticker/{ticker}",
    response_model=APIResponse,
    summary="Browse trades for a specific ticker (politicians + insiders, observational)",
)
async def get_trades_by_ticker(
    ticker: str,
    start_date: Optional[date] = Query(
        default=None,
        description="Optional start date (inclusive) for transaction_date filter.",
    ),
    end_date: Optional[date] = Query(
        default=None,
        description="Optional end date (inclusive) for transaction_date filter.",
    ),
    quiver_provider: QuiverTradeProvider = Depends(get_quiver_provider),
    edgar_provider: EdgarForm4Provider = Depends(get_edgar_provider),
) -> APIResponse:
    """
    Return combined politician + insider trades for a single ticker.

    PROVENANCE: This endpoint combines data from multiple sources (Quiver for politicians,
    EDGAR for insiders). Each TradeEvent includes a `source` field indicating its origin.
    Aggregated outputs preserve source information per record.

    NO SILENT FALLBACK: EDGAR failures do not silently fall back to Quiver. Each provider
    is independent and failures result in explicit errors.

    This endpoint simply concatenates events from both providers and filters
    to the requested ticker symbol. It does **not** compute signals,
    rankings, or performance metrics.
    """
    # FEATURE FLAG: Check if trade endpoints are enabled
    if not settings.trades_endpoints_enabled:
        raise BadRequestError(
            "Trade endpoints are disabled. "
            "Set TRADES_ENDPOINTS_ENABLED=true to enable trade data endpoints.",
            context={"feature_flag": "trades_endpoints_enabled"},
        )
    
    if start_date and end_date and end_date < start_date:
        raise BadRequestError("end_date must be on or after start_date")

    events: list[TradeEvent] = []

    # Politician trades (if Quiver is enabled and configured)
    # NO SILENT FALLBACK: If Quiver is disabled, this simply doesn't include politician trades
    # EDGAR failures do not fall back to Quiver
    if await quiver_provider.is_available():
        pol_events = await quiver_provider.get_politician_trades(
            start_date=start_date,
            end_date=end_date,
        )
        events.extend(pol_events)

    # Insider trades require a CIK universe; for now this endpoint does not
    # attempt to discover all CIKs for a ticker. It focuses on politician data.
    # Future phases may extend this to join against a mapping service.

    # Filter by ticker (case-insensitive, using TradeEvent's normalized ticker)
    normalized = ticker.upper()
    events = [e for e in events if e.ticker.upper() == normalized]

    # ORDERING GUARANTEE (Phase 11.1): events are sorted deterministically by:
    # 1. transaction_date (ascending, oldest to newest)
    # 2. actor_id (ascending, for same date)
    # 3. source.value (ascending, for same date/actor)
    # 4. transaction_index (ascending, for SEC trades with same date/actor/source)
    # 
    # This ensures the same query always produces the same event ordering (replay-safe).
    # The ordering is explicit and documented - never rely on dict iteration order.
    # 
    # WHY THIS MATTERS: Frontend rendering relies on consistent ordering. If events were
    # reordered between identical requests, list rendering would flicker, scroll positions
    # would jump, and user experience would degrade. Deterministic ordering enables stable
    # frontend state and predictable UI behavior.
    # 
    # DETERMINISM ENFORCEMENT (Phase 9.2): Deterministic ordering including transaction_index
    # For SEC-sourced trades, transaction_index ensures stable ordering within filings
    events.sort(
        key=lambda e: (
            e.transaction_date,
            e.actor_id,
            e.source.value,
            e.metadata.get("transaction_index", 0) if e.source.value == "sec" else 0,
        )
    )

    # CONTRACT RIGIDITY: events is always a list (never None)
    # Even if no trades found, events is [] (not None)
    assert isinstance(events, list), "events must be a list (never None)"
    
    # LIGHTWEIGHT ASSERTION: Verify events are sorted by transaction_date (ascending)
    if len(events) > 1:
        transaction_dates = [e.transaction_date for e in events]
        assert transaction_dates == sorted(transaction_dates), (
            "events must be sorted by transaction_date (ascending). "
            "This is required for deterministic frontend rendering."
        )
    
    # PROVENANCE & REPLAY METADATA (Phase 11.2): Track data sources and replay status
    # This endpoint combines multiple sources (Quiver + EDGAR), so we check both
    from pathlib import Path
    from app.core.config import settings
    from app.data.persistence import FileStorage, make_storage_key
    
    data_sources = []
    quiver_persisted = False
    edgar_persisted = False
    replay_mode_active = False
    
    if await quiver_provider.is_available():
        data_sources.append("quiver")
        # Quiver does not have persistence (deprecated)
        quiver_persisted = False
    
    # Check if EDGAR data is persisted (for replay mode detection)
    # Note: This endpoint doesn't use CIK, so we can't check specific EDGAR persistence
    # We set edgar_persisted to None (unknown) rather than False (not persisted)
    if settings.data_storage_path:
        storage_path = Path(settings.data_storage_path)
        if not storage_path.is_absolute():
            storage_path = Path.cwd() / storage_path
        edgar_storage = FileStorage(storage_path / "edgar")
        # We can't determine EDGAR persistence without CIK, so we set it to None
        edgar_persisted = None
    else:
        edgar_persisted = None
    
    # Replay mode is active if any persisted source is available
    # Since Quiver has no persistence and EDGAR status is unknown, replay_mode is False
    replay_mode_active = False
    
    # Build metadata with enforced disclaimers (Phase 6.6)
    # Note: This endpoint combines multiple sources, so we use a combined attribution
    sources_used = []
    if await quiver_provider.is_available():
        sources_used.append("Quiver Quantitative")
    # EDGAR not yet integrated for ticker endpoint, but attribution prepared for future
    
    metadata = build_trade_metadata(
        source="quiver",  # Primary source for now
        source_attribution=(
            "Quiver Quantitative (US Politician Trades). "
            "SEC EDGAR Form 4 insider trades require CIK mapping and are not yet included."
        ),
        time_delay_disclaimer=(
            "Trade data is based on public disclosure filings and is "
            "time-delayed by design. Filings may be delayed by days or weeks "
            "after the transaction date. This data is descriptive, not predictive."
        ),
        additional_metadata={
            "type": "trades_by_ticker",
            "coverage_notes": (
                "Currently includes politician trades from Quiver. "
                "Insider trades via EDGAR require CIK mapping and are not "
                "included in this ticker-focused endpoint yet."
            ),
            "filters": {
                "ticker": normalized,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            },
            # PROVENANCE METADATA (Phase 11.2): Expose existing data source information
            # This is read-only and descriptive - explains where data came from
            "provenance": {
                "data_sources": data_sources if data_sources else [],  # Sources used (quiver, sec_edgar)
                "replay_mode": replay_mode_active,  # True if data was loaded from persistence
                "persisted": {
                    "quiver": quiver_persisted,  # False (Quiver has no persistence)
                    "edgar": edgar_persisted,  # None (unknown without CIK)
                },
                # as_of_date: Not deterministically known (providers don't provide this)
                # We don't fabricate dates - only include if deterministically known
            },
            # VERSIONING SEMANTICS (Phase 11.2): Explain replay stability guarantees
            # Per PRD v2.0 and Phase 10: Historical analytics never change once persisted
            "versioning": {
                "result_stability": "replay-stable" if replay_mode_active else None,
                "version_semantics": "immutable-historical" if replay_mode_active else None,
                # DOCUMENTATION: Why historical analytics never change (per PRD v2.0):
                # - Once raw data is persisted, it is ALWAYS used (replay mode)
                # - Never overwrites existing data (ensures historical data remains stable)
                # - Same historical request today vs later → identical results
                # - No upstream drift affects past analytics
                "explanation": (
                    "Historical trade data is replay-stable when persisted: once raw data is persisted, "
                    "it is always used for that query. Newer upstream data does not affect past results. "
                    "Same historical request today vs later produces identical results. This ensures "
                    "auditability and prevents historical trade data from drifting over time. "
                    "Note: Quiver data is not replay-stable (no persistence)."
                ) if replay_mode_active else (
                    "This endpoint combines multiple sources. Quiver data is not replay-stable (no persistence). "
                    "EDGAR data would be replay-stable if persisted, but CIK mapping is required to determine persistence status."
                ),
            },
        },
    )
    
    # DEFENSIVE ASSERTION: Ensure metadata is always a dict (never None)
    assert isinstance(metadata, dict), "metadata must be a dict (never None)"

    return APIResponse(data=events, metadata=metadata)


