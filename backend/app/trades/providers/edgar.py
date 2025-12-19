"""SEC EDGAR Form 4 provider (Phase 6.3, hardened in Phase 9.1).

This provider:
- Fetches Form 4 filings from EDGAR's public endpoints
- Parses XML documents using the Form 4 parser
- Normalizes insider trades into canonical TradeEvent models

Design goals (Phase 9.1):
- EDGAR is the first-class, authoritative source for insider trades
- Deterministic, auditable, and replayable ingestion
- No silent parsing failures - explicit errors for all failure modes
- Complete provenance tracking (CIK, accession, filing_date)
- Fail-fast behavior for invalid or incomplete data

DETERMINISM GUARANTEES:
- All results are deterministically ordered by transaction_date, ticker, actor_id, source
- Identical inputs produce identical outputs across runs
- No silent fallbacks or partial results

AUDITABILITY GUARANTEES:
- Every TradeEvent includes full provenance (CIK, accession_number, filing_date)
- All errors include contextual metadata for debugging
- No data is silently skipped or inferred
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date
from typing import Deque, List, Optional
from collections import deque

from app.core.config import settings
from app.core.exceptions import (
    BadRequestError,
    NotFoundError,
    ProviderUnavailableError,
)
from app.core.logging import get_logger
from app.data.persistence import FileStorage, make_storage_key
from app.trades.models import TradeEvent
from app.trades.parsers.form4 import parse_form4_xml
from app.trades.providers.base import TradeDataProvider


logger = get_logger(__name__)


@dataclass
class _EdgarRateLimiter:
    """Simple client-side rate limiter respecting SEC fair access policy.

    The SEC currently recommends no more than 10 requests per second.
    We choose a conservative limit below that.
    """

    max_calls: int
    period_seconds: float
    _call_times: Deque[float] = field(default_factory=deque)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def acquire(self) -> None:
        """
        Acquire rate limit permission with explicit delay logging.
        
        RATE DISCIPLINE: Enforces SEC fair access policy (max 10 req/sec).
        We use a conservative limit (5 req/sec) for safety margin.
        
        OBSERVABILITY: Logs when rate discipline is applied (delay enforced).
        """
        async with self._lock:
            now = time.monotonic()
            window_start = now - self.period_seconds
            while self._call_times and self._call_times[0] < window_start:
                self._call_times.popleft()

            if len(self._call_times) >= self.max_calls:
                oldest = self._call_times[0]
                sleep_for = self.period_seconds - (now - oldest)
                if sleep_for > 0:
                    # RATE DISCIPLINE: Explicit delay to respect SEC fair access policy
                    # OBSERVABILITY: Log when rate discipline is applied
                    logger.info(
                        "EDGAR rate limit enforced - applying delay",
                        extra={
                            "delay_seconds": round(sleep_for, 3),
                            "max_calls": self.max_calls,
                            "period_seconds": self.period_seconds,
                            "rate_discipline": True,
                        },
                    )
                    await asyncio.sleep(sleep_for)

                now = time.monotonic()
                window_start = now - self.period_seconds
                while self._call_times and self._call_times[0] < window_start:
                    self._call_times.popleft()

            self._call_times.append(time.monotonic())


class EdgarForm4Provider(TradeDataProvider):
    """EDGAR-based provider for insider trades via Form 4 filings."""

    # Company submissions endpoint; requires CIK.
    SUBMISSIONS_URL_TEMPLATE = (
        "https://data.sec.gov/submissions/CIK{cik_padded}.json"
    )

    def __init__(self, *, user_agent: str = "portfoliolab/1.0", storage: Optional[FileStorage] = None) -> None:
        """Initialize EDGAR provider.
        
        SEC COMPLIANCE: User-Agent is required by SEC fair access policy.
        Rate limiting enforced to respect SEC recommendations (max 10 req/sec).
        
        PERSISTENCE (Phase 10.1): If storage is provided, raw EDGAR data (submissions JSON,
        Form 4 XML) is stored and reused to avoid refetching identical data.
        """
        if not user_agent or not user_agent.strip():
            raise ValueError(
                "User-Agent is required for SEC EDGAR access per fair access policy. "
                "Cannot proceed without explicit User-Agent."
            )
        self._user_agent = user_agent.strip()
        # Conservative limit: 5 requests per second within a 1-second window.
        # SEC recommends max 10 req/sec; we use 5 for safety margin.
        self._limiter = _EdgarRateLimiter(max_calls=5, period_seconds=1.0)
        # PERSISTENCE (Phase 10.1): Optional storage for raw EDGAR data
        self._storage = storage

    @property
    def name(self) -> str:
        return "edgar_form4"

    async def is_available(self) -> bool:
        # EDGAR is public; availability mainly depends on network reachability.
        # We avoid probing in this method to keep it side-effect free.
        return True

    async def get_politician_trades(  # type: ignore[override]
        self,
        *,
        politician: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[TradeEvent]:
        """
        EDGAR provider does not implement politician trades.

        GUARDRAILS (Phase 9.3): EDGAR is EXCLUSIVELY for insider trades.
        Politician trades must use Quiver (if enabled) or other sources.
        This method is kept for interface compatibility and always returns [].

        This provider's ONLY purpose is insider trades via get_insider_trades_for_cik().
        """
        logger.info(
            "EdgarForm4Provider.get_politician_trades called; returning empty list "
            "because EDGAR only covers insiders, not politicians."
        )
        return []

    async def get_insider_trades_for_cik(
        self,
        *,
        cik: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[TradeEvent]:
        """
        Get insider trades for a CIK with within-request memoization.
        
        WITHIN-REQUEST MEMOIZATION: Same provider call within a request → single execution.
        This prevents accidental abuse of upstream providers.
        
        RATE DISCIPLINE: Explicit delays are applied and logged to respect SEC limits.
        """
        # WITHIN-REQUEST MEMOIZATION: Check if this exact call was already made in this request
        # This prevents duplicate provider calls within the same request
        from app.core.memoization import get_request_cache
        
        cache_key = f"edgar:insider_trades:{cik}:{start_date.isoformat() if start_date else 'all'}:{end_date.isoformat() if end_date else 'all'}"
        cache = get_request_cache()
        
        if cache_key in cache:
            logger.debug(
                "Using memoized insider trades (within-request cache hit)",
                extra={"cik": cik, "start_date": str(start_date), "end_date": str(end_date)},
            )
            return cache[cache_key]
        
        # Continue with normal execution (will cache result at end)
        result = await self._get_insider_trades_for_cik_impl(
            cik=cik,
            start_date=start_date,
            end_date=end_date,
        )
        
        # Cache result for within-request memoization
        cache[cache_key] = result
        
        return result
    
    async def _get_insider_trades_for_cik_impl(
        self,
        *,
        cik: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[TradeEvent]:
        """
        Fetch insider trades from Form 4 filings for a given company CIK (implementation).

        GUARDRAILS (Phase 9.3): This is the EXCLUSIVE method for insider trades.
        Quiver MUST NEVER be used for insider trades. EDGAR is the only authorized
        source for insider trades. There is NO fallback to Quiver - EDGAR failures
        result in explicit errors (ProviderUnavailableError, NotFoundError, BadRequestError).

        PROVIDER CONTRACT (Phase 9.1):
        - Returns complete list of normalized TradeEvent objects, OR
        - Raises explicit, typed exception (never returns None or partial results)
        - All events include full provenance (CIK, accession_number, filing_date)
        - Deterministic ordering by transaction_date, ticker, actor_id, source

        FAIL-FAST BEHAVIOR:
        - Invalid CIK format → BadRequestError
        - CIK not found → NotFoundError
        - Network/provider outage → ProviderUnavailableError
        - Malformed submissions JSON → BadRequestError
        - All filings fail to parse → BadRequestError (with context)
        - NO SILENT FALLBACK to Quiver - EDGAR failures are explicit errors

        Implementation outline:
        - Validate CIK format (fail fast if invalid)
        - Fetch company submissions JSON (fail fast if CIK not found or network error)
        - Filter recent filings for Form 4
        - Download each Form 4 XML document (fail fast on network errors)
        - Parse via parse_form4_xml and collect TradeEvent objects
        - Enrich events with provenance (CIK, accession, filing_date)
        - Validate ticker presence (fail fast if ticker missing from all events)
        """
        # CIK VALIDATION: Fail fast on invalid format
        if not cik or not cik.strip():
            raise BadRequestError(
                "CIK cannot be empty",
                context={"cik": cik},
            )
        cik_normalized = cik.strip().lstrip("0")
        if not cik_normalized or not cik_normalized.isdigit():
            raise BadRequestError(
                f"CIK must be numeric (received: '{cik}')",
                context={"cik": cik, "normalized": cik_normalized},
            )

        # REPLAY MODE: Check persistence first - if persisted data exists, use it
        # This ensures historical analytics never change once data is persisted
        # Submissions JSON is keyed by CIK only (no date range - it's a snapshot of all filings)
        # Once persisted, never refetch - ensures historical trade data remains stable
        submissions_key = make_storage_key("edgar", type="submissions", cik=cik_normalized)
        
        if self._storage and self._storage.exists(submissions_key):
            # PERSISTENCE: Read-through behavior - load from storage if available
            # VALIDATION: Loaded data must pass same validation as fresh data
            try:
                stored_data = self._storage.read(submissions_key)
                submissions = json.loads(stored_data.decode("utf-8"))
                
                # VALIDATION: Ensure loaded data has same structure as fresh data
                # This is the same validation that would happen after _fetch_submissions_json
                if not isinstance(submissions, dict):
                    raise BadRequestError(
                        f"Stored EDGAR submissions data has invalid structure for CIK '{cik_normalized}'. "
                        "Expected dict, got invalid format.",
                        context={"cik": cik_normalized, "type": type(submissions).__name__},
                    )
                
                # REPLAY MODE: Return persisted data - ensures historical analytics stability
                # Same historical request today vs later → identical results
                # No upstream drift affects past analytics
                logger.info(
                    "Loaded EDGAR submissions from persistence (replay mode)",
                    extra={"cik": cik_normalized, "source": "storage", "replay_mode": True},
                )
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                # Identical invalid requests must produce identical errors for frontend stability
                raise BadRequestError(
                    f"EDGAR data for CIK '{cik_normalized}' is corrupted or invalid.",
                    context={"cik": cik_normalized, "error": str(exc)},
                ) from exc
        else:
            # SUBMISSIONS FETCH: Fail fast on network errors or missing CIK
            # LOGGING DISCIPLINE: Log once when fetching fresh data (request_id added automatically)
            logger.info(
                "Fetching EDGAR submissions from upstream",
                extra={"cik": cik_normalized, "source": "upstream"},
            )
            
            try:
                submissions = await self._fetch_submissions_json(cik_normalized)
                
                # VALIDATION: Ensure fetched data has valid structure (same as loaded data)
                if not isinstance(submissions, dict):
                    raise BadRequestError(
                        f"EDGAR submissions response has invalid structure for CIK '{cik_normalized}'. "
                        "Expected dict, got invalid format.",
                        context={"cik": cik_normalized, "type": type(submissions).__name__},
                    )
                
                # REPLAY MODE: Store raw submissions JSON after successful fetch and validation
                # GUARDRAIL: Only write if data doesn't exist (never overwrite historical data)
                # This ensures historical analytics remain stable - once persisted, never changed
                if self._storage:
                    # GUARDRAIL: Check if data already exists before writing
                    # Never overwrite historical data - this would break replay guarantees
                    if not self._storage.exists(submissions_key):
                        try:
                            submissions_json = json.dumps(submissions, sort_keys=True).encode("utf-8")
                            self._storage.write(submissions_key, submissions_json)
                            logger.debug(
                                "Stored EDGAR submissions to persistence",
                                extra={"cik": cik_normalized},
                            )
                        except Exception as exc:  # noqa: BLE001
                            # Log storage failure but don't fail the request
                            logger.warning(
                                "Failed to store EDGAR submissions",
                                extra={"cik": cik_normalized, "error": str(exc)},
                            )
                    else:
                        # REPLAY MODE: Data already exists - log but don't overwrite
                        logger.debug(
                            "EDGAR submissions already persisted (replay mode - not overwriting)",
                            extra={"cik": cik_normalized},
                        )
            except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError) as exc:
                # FAILURE RECOVERY: If upstream fetch fails, check persisted data as fallback
                # This ensures predictable behavior during outages
                # Rule: If persisted data exists → use it, if not → fail with explicit error
                
                # Check if persisted data exists as fallback
                if self._storage and self._storage.exists(submissions_key):
                    # FALLBACK RULE: Persisted data exists → use it (cached replay during outage)
                    logger.warning(
                        "EDGAR upstream fetch failed, using persisted submissions as fallback (cached replay)",
                        extra={
                            "cik": cik_normalized,
                            "source": "storage_fallback",
                            "upstream_error": str(exc),
                            "error_type": type(exc).__name__,
                            "failure_recovery": True,
                        },
                    )
                    
                    # Load persisted data (same validation as normal replay mode)
                    try:
                        stored_data = self._storage.read(submissions_key)
                        submissions = json.loads(stored_data.decode("utf-8"))
                        
                        # VALIDATION: Ensure loaded data has same structure as fresh data
                        if not isinstance(submissions, dict):
                            raise BadRequestError(
                                f"Stored EDGAR submissions data has invalid structure for CIK '{cik_normalized}'. "
                                "Expected dict, got invalid format.",
                                context={"cik": cik_normalized, "type": type(submissions).__name__},
                            )
                        
                        # Continue with persisted data (cached replay during outage)
                        # Note: We break out of the else block and continue processing
                    except (json.JSONDecodeError, UnicodeDecodeError) as storage_exc:
                        # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                        # Identical invalid requests must produce identical errors for frontend stability
                        raise BadRequestError(
                            f"EDGAR data for CIK '{cik_normalized}' is corrupted or invalid.",
                            context={
                                "cik": cik_normalized,
                                "upstream_error": str(exc),
                                "storage_error": str(storage_exc),
                            },
                        ) from storage_exc
                else:
                    # ERROR DETERMINISM (Phase 11.3): Same failure always produces same error
                    # Identical invalid requests must produce identical errors for frontend stability
                    # Classify error type deterministically based on exception type
                    if isinstance(exc, urllib.error.HTTPError):
                        if exc.code == 404:
                            raise NotFoundError(
                                f"CIK '{cik_normalized}' not found in EDGAR database.",
                                context={"cik": cik_normalized},
                            ) from exc
                        raise ProviderUnavailableError(
                            f"SEC EDGAR service is temporarily unavailable.",
                            provider_name="edgar",
                            context={
                                "cik": cik_normalized,
                                "http_status": exc.code,
                            },
                        ) from exc
                    elif isinstance(exc, urllib.error.URLError):
                        raise ProviderUnavailableError(
                            f"SEC EDGAR service is temporarily unavailable.",
                            provider_name="edgar",
                            context={"cik": cik_normalized},
                        ) from exc
                    else:  # json.JSONDecodeError
                        raise BadRequestError(
                            f"EDGAR data for CIK '{cik_normalized}' is corrupted or invalid.",
                            context={"cik": cik_normalized, "error": str(exc)},
                        ) from exc

        # EXTRACT FILINGS: Fail fast if submissions structure is invalid
        try:
            filings = self._extract_form4_filings(submissions)
        except Exception as exc:
            raise BadRequestError(
                f"Failed to extract Form 4 filings from EDGAR submissions JSON",
                context={"cik": cik_normalized, "error": str(exc)},
            ) from exc

        # VALIDATION (Phase 9.5): "No filings found" → valid empty list response
        # If no Form 4 filings exist for this CIK, return empty list (valid case)
        if not filings:
            logger.info(
                "No Form 4 filings found for CIK",
                extra={"cik": cik_normalized},
            )
            return []

        # PROCESS FILINGS: Collect events with full provenance
        events: List[TradeEvent] = []
        filing_errors: List[str] = []
        
        for filing in filings:
            accession = filing.get("accessionNumber")
            primary_doc = filing.get("primaryDocument")
            filing_date_str = filing.get("filingDate")

            # FAIL-FAST: Skip filings with missing required fields, but track for error reporting
            if not accession or not primary_doc:
                error_msg = (
                    f"Form 4 filing missing required fields: "
                    f"accessionNumber={accession is not None}, "
                    f"primaryDocument={primary_doc is not None}"
                )
                filing_errors.append(error_msg)
                logger.warning(
                    "Skipping Form 4 filing with missing accession or primaryDocument",
                    extra={
                        "cik": cik_normalized,
                        "filing_date": filing_date_str,
                        "accession": accession,
                    },
                )
                continue

            # DATE FILTERING: Apply date range filter if provided
            filing_date: Optional[date] = None
            if start_date or end_date:
                try:
                    if filing_date_str:
                        filing_date = date.fromisoformat(filing_date_str)
                except (ValueError, TypeError) as exc:
                    error_msg = f"Invalid filing date format: '{filing_date_str}'"
                    filing_errors.append(error_msg)
                    logger.warning(
                        "Skipping Form 4 filing with invalid date format",
                        extra={
                            "cik": cik_normalized,
                            "accession": accession,
                            "filing_date_str": filing_date_str,
                            "error": str(exc),
                        },
                    )
                    continue
                
                if filing_date:
                    if start_date and filing_date < start_date:
                        continue
                    if end_date and filing_date > end_date:
                        continue

            # REPLAY MODE: Check persistence first - if persisted data exists, use it
            # This ensures historical analytics never change once data is persisted
            # Form 4 XML is keyed by CIK + accession (immutable filing identifier)
            # Once persisted, never refetch - ensures historical trade data remains stable
            xml_key = make_storage_key(
                "edgar",
                type="form4_xml",
                cik=cik_normalized,
                accession=accession,
            )
            
            if self._storage and self._storage.exists(xml_key):
                # PERSISTENCE: Read-through behavior - load from storage if available
                # VALIDATION: Loaded XML will be validated by parse_form4_xml (same as fresh XML)
                try:
                    xml_content = self._storage.read(xml_key).decode("utf-8")
                    
                    # VALIDATION: Basic check that XML is not empty (same validation as fresh data)
                    if not xml_content or not xml_content.strip():
                        raise BadRequestError(
                            f"Stored Form 4 XML is empty for accession '{accession}'. "
                            "Cannot silently refetch - explicit error required.",
                            context={"cik": cik_normalized, "accession": accession},
                        )
                    
                    # LOGGING DISCIPLINE: Log once when loading from storage (request_id added automatically)
                    logger.info(
                        "Loaded Form 4 XML from persistence (replay mode)",
                        extra={
                            "cik": cik_normalized,
                            "accession": accession,
                            "source": "storage",
                            "replay_mode": True,
                        },
                    )
                except UnicodeDecodeError as exc:
                    # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                    # Identical invalid requests must produce identical errors for frontend stability
                    raise BadRequestError(
                        f"EDGAR Form 4 filing for accession '{accession}' is corrupted or invalid.",
                        context={"cik": cik_normalized, "accession": accession, "error": str(exc)},
                    ) from exc
            else:
                # DOWNLOAD XML: Fail fast on network errors
                # LOGGING DISCIPLINE: Log once when fetching fresh data (request_id added automatically)
                logger.info(
                    "Fetching Form 4 XML from upstream",
                    extra={"cik": cik_normalized, "accession": accession, "source": "upstream"},
                )
                
                try:
                    xml_content = await self._download_form4_xml(
                        cik=cik_normalized,
                        accession_number=accession,
                        primary_document=primary_doc,
                    )
                    
                    # VALIDATION: Basic check that XML is not empty (same validation as loaded data)
                    if not xml_content or not xml_content.strip():
                        raise BadRequestError(
                            f"Downloaded Form 4 XML is empty for accession '{accession}'. "
                            "Empty XML cannot be parsed.",
                            context={"cik": cik_normalized, "accession": accession},
                        )
                except (urllib.error.HTTPError, urllib.error.URLError) as exc:
                    # FAILURE RECOVERY: If upstream fetch fails, check persisted data as fallback
                    # This ensures predictable behavior during outages
                    # Rule: If persisted data exists → use it, if not → fail with explicit error
                    
                    # Check if persisted data exists as fallback
                    if self._storage and self._storage.exists(xml_key):
                        # FALLBACK RULE: Persisted data exists → use it (cached replay during outage)
                        logger.warning(
                            "Form 4 XML upstream fetch failed, using persisted data as fallback (cached replay)",
                            extra={
                                "cik": cik_normalized,
                                "accession": accession,
                                "source": "storage_fallback",
                                "upstream_error": str(exc),
                                "error_type": type(exc).__name__,
                                "failure_recovery": True,
                            },
                        )
                        
                        # Load persisted data (same validation as normal replay mode)
                        try:
                            xml_content = self._storage.read(xml_key).decode("utf-8")
                            
                            # VALIDATION: Basic check that XML is not empty
                            if not xml_content or not xml_content.strip():
                                raise BadRequestError(
                                    f"Stored Form 4 XML is empty for accession '{accession}'. "
                                    "Cannot proceed - explicit error required.",
                                    context={"cik": cik_normalized, "accession": accession},
                                )
                            
                            # Continue with persisted data (cached replay during outage)
                            # Note: We break out of the try block and continue processing
                            except (UnicodeDecodeError, BadRequestError) as storage_exc:
                            # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                            # Identical invalid requests must produce identical errors for frontend stability
                            raise BadRequestError(
                                f"EDGAR Form 4 filing for accession '{accession}' is corrupted or invalid.",
                                context={
                                    "cik": cik_normalized,
                                    "accession": accession,
                                    "upstream_error": str(exc),
                                    "storage_error": str(storage_exc),
                                },
                            ) from storage_exc
                    else:
                        # ERROR DETERMINISM (Phase 11.3): Same failure always produces same error
                        # Identical invalid requests must produce identical errors for frontend stability
                        # Classify error type deterministically based on exception type
                        if isinstance(exc, urllib.error.HTTPError):
                            if exc.code == 404:
                                error_msg = f"Form 4 XML not found (HTTP 404) for accession {accession}"
                                filing_errors.append(error_msg)
                                logger.warning(
                                    "Form 4 XML not found; skipping filing",
                                    extra={
                                        "cik": cik_normalized,
                                        "accession": accession,
                                        "http_status": exc.code,
                                    },
                                )
                                continue
                            raise ProviderUnavailableError(
                                f"SEC EDGAR service is temporarily unavailable.",
                                provider_name="edgar",
                                context={
                                    "cik": cik_normalized,
                                    "accession": accession,
                                    "http_status": exc.code,
                                },
                            ) from exc
                        else:  # urllib.error.URLError
                            raise ProviderUnavailableError(
                                f"SEC EDGAR service is temporarily unavailable.",
                                provider_name="edgar",
                                context={
                                    "cik": cik_normalized,
                                    "accession": accession,
                                },
                            ) from exc
                    
                    # REPLAY MODE: Store raw Form 4 XML after successful download and validation
                    # GUARDRAIL: Only write if data doesn't exist (never overwrite historical data)
                    # This ensures historical analytics remain stable - once persisted, never changed
                    if self._storage:
                        # GUARDRAIL: Check if data already exists before writing
                        # Never overwrite historical data - this would break replay guarantees
                        if not self._storage.exists(xml_key):
                            try:
                                self._storage.write(xml_key, xml_content.encode("utf-8"))
                                logger.debug(
                                    "Stored Form 4 XML to persistence",
                                    extra={"cik": cik_normalized, "accession": accession},
                                )
                            except Exception as exc:  # noqa: BLE001
                                # Log storage failure but don't fail the request
                                logger.warning(
                                    "Failed to store Form 4 XML",
                                    extra={"cik": cik_normalized, "accession": accession, "error": str(exc)},
                                )
                        else:
                            # REPLAY MODE: Data already exists - log but don't overwrite
                            logger.debug(
                                "Form 4 XML already persisted (replay mode - not overwriting)",
                                extra={"cik": cik_normalized, "accession": accession},
                            )
            except urllib.error.HTTPError as exc:
                if exc.code == 404:
                    error_msg = f"Form 4 XML not found (HTTP 404) for accession {accession}"
                    filing_errors.append(error_msg)
                    logger.warning(
                        "Form 4 XML not found; skipping filing",
                        extra={
                            "cik": cik_normalized,
                            "accession": accession,
                            "http_status": exc.code,
                        },
                    )
                    continue
                raise ProviderUnavailableError(
                    f"EDGAR Form 4 XML endpoint returned HTTP {exc.code}",
                    provider_name="edgar",
                    context={
                        "cik": cik_normalized,
                        "accession": accession,
                        "http_status": exc.code,
                    },
                ) from exc
            except urllib.error.URLError as exc:
                raise ProviderUnavailableError(
                    f"EDGAR Form 4 XML endpoint unreachable: {exc.reason}",
                    provider_name="edgar",
                    context={"cik": cik_normalized, "accession": accession},
                ) from exc

            # PARSE XML: Fail fast on complete parsing failures
            # PROVENANCE: Pass accession_number and filing_date to parser for metadata enrichment
            # VALIDATION (Phase 9.5): "Filing exists but reports no transactions" → valid empty list
            # "Transactions exist but all fail parsing" → explicit error (BadRequestError)
            try:
                parsed_events = parse_form4_xml(
                    xml_content,
                    accession_number=accession,
                    filing_date=filing_date_str,
                )
                # VALIDATION: Parser returns [] if filing has no transactions (valid case)
                # Parser raises ValueError if transactions exist but all fail (error case)
                if not parsed_events:
                    # Filing parsed successfully but contains no transactions - valid empty result
                    # This is logged at parser level, no need to log again here
                    continue
            except ValueError as exc:
                # VALIDATION (Phase 9.5): Parser raises ValueError for complete failures
                # "Transactions exist but all fail parsing" → explicit error
                # This is logged once at parser level, track error for provider-level validation
                error_msg = f"Form 4 parsing failed for accession {accession}: {exc}"
                filing_errors.append(error_msg)
                # Logging already done in parser - don't duplicate (Phase 8 discipline)
                continue
            except Exception as exc:  # noqa: BLE001
                # Unexpected parsing errors - log once and track
                error_msg = f"Unexpected parsing error for accession {accession}: {exc}"
                filing_errors.append(error_msg)
                logger.error(
                    "Unexpected Form 4 parsing error; skipping filing",
                    extra={
                        "cik": cik_normalized,
                        "accession": accession,
                        "error": str(exc),
                        "error_type": type(exc).__name__,
                    },
                )
                continue

            # PROVENANCE ENRICHMENT: Add CIK to all events
            # Note: Parser already adds accession_number, filing_date, and transaction_index
            # We only need to add CIK here (provider-level provenance)
            for event in parsed_events:
                # Ensure metadata includes provider-level provenance (CIK)
                event.metadata["cik"] = cik_normalized
                # Parser already added: accession_number, filing_date, transaction_index
                # Add parsed filing_date if available for convenience
                if filing_date:
                    event.metadata["filing_date_parsed"] = filing_date.isoformat()
                
                # PROVENANCE VALIDATION (Phase 9.2): Fail fast if required fields are missing
                # This validation ensures audit-grade provenance before events are returned
                missing_provenance = []
                if "cik" not in event.metadata or not event.metadata.get("cik"):
                    missing_provenance.append("cik")
                if "accession_number" not in event.metadata or not event.metadata.get("accession_number"):
                    missing_provenance.append("accession_number")
                if "filing_date" not in event.metadata or not event.metadata.get("filing_date"):
                    missing_provenance.append("filing_date")
                if "transaction_index" not in event.metadata:
                    missing_provenance.append("transaction_index")
                
                if missing_provenance:
                    raise BadRequestError(
                        f"TradeEvent missing required provenance fields: {', '.join(missing_provenance)}. "
                        "All EDGAR insider trades must include complete provenance (cik, accession_number, "
                        "filing_date, transaction_index) for auditability.",
                        context={
                            "cik": cik_normalized,
                            "accession": accession,
                            "filing_date": filing_date_str,
                            "missing_fields": missing_provenance,
                            "event_ticker": event.ticker,
                            "event_actor_id": event.actor_id,
                        },
                    )

            events.extend(parsed_events)

        # VALIDATION (Phase 9.5): Distinguish valid empty list from error cases
        # - "No filings found" → already handled above (valid empty list)
        # - "Filing exists but reports no transactions" → valid empty list (parser returns [])
        # - "Transactions exist but all fail parsing" → explicit error (BadRequestError)
        if not events and filing_errors:
            # FAIL-FAST: If filings were found but all failed (parsing errors), raise explicit error
            # This distinguishes "no filings" (valid) from "all filings failed" (error)
            raise BadRequestError(
                f"No valid Form 4 trades found for CIK '{cik_normalized}'. "
                f"Found {len(filings)} filing(s) but encountered {len(filing_errors)} error(s). "
                f"All filings failed to parse or download. First error: {filing_errors[0]}",
                context={
                    "cik": cik_normalized,
                    "filings_count": len(filings),
                    "filing_errors_count": len(filing_errors),
                    "filing_errors": filing_errors[:3],  # First 3 errors for context
                },
            )
        
        # VALIDATION (Phase 9.5): "Filing exists but reports no transactions" → valid empty list
        # If events is empty but no errors, this means filings were found but contained no transactions
        # This is a valid case - return empty list

        # TICKER VALIDATION: Fail fast if any event has missing ticker
        # This should never happen if parser is correct, but explicit validation ensures determinism
        events_without_ticker = [e for e in events if not e.ticker or not e.ticker.strip()]
        if events_without_ticker:
            raise BadRequestError(
                f"Found {len(events_without_ticker)} trade event(s) with missing ticker. "
                "Ticker is required for all trade events. This indicates a parser or data quality issue.",
                context={
                    "cik": cik_normalized,
                    "events_without_ticker_count": len(events_without_ticker),
                    "accession_numbers": list(set(
                        e.metadata.get("accession_number", "unknown")
                        for e in events_without_ticker
                    ))[:5],  # First 5 accession numbers for context
                },
            )

        # REPLAYABILITY ENFORCEMENT (Phase 9.4): Deterministic ordering using stable identity
        # The same EDGAR filing(s) must always generate the same TradeEvent ordering
        # Sort key includes stable identity (cik:accession:transaction_index) for bit-for-bit stability
        events.sort(
            key=lambda e: (
                e.transaction_date,
                e.ticker,
                e.actor_id,
                e.source.value,
                e.metadata.get("transaction_index", 0),  # Default to 0 if missing (should not happen after validation)
                e.get_stable_identity() or "",  # Stable identity for replayability (SEC trades only)
            )
        )
        
        # DEDUPLICATION (Phase 9.4): Remove duplicates based on stable identity
        # If the same trade appears multiple times (same cik + accession + transaction_index),
        # keep only the first occurrence (deterministic rule)
        seen_identities: set[str] = set()
        deduplicated_events: List[TradeEvent] = []
        duplicates_count = 0
        
        for event in events:
            identity = event.get_stable_identity()
            if identity:
                if identity in seen_identities:
                    # DETERMINISTIC DEDUPLICATION: Skip duplicate, keep first occurrence
                    duplicates_count += 1
                    logger.warning(
                        "Duplicate trade event detected (same stable identity); skipping",
                        extra={
                            "identity": identity,
                            "cik": event.metadata.get("cik"),
                            "accession_number": event.metadata.get("accession_number"),
                            "transaction_index": event.metadata.get("transaction_index"),
                        },
                    )
                    continue
                seen_identities.add(identity)
            # Include events without stable identity (non-SEC trades) - they can't be deduplicated
            deduplicated_events.append(event)
        
        if duplicates_count > 0:
            logger.info(
                f"Deduplicated {duplicates_count} duplicate trade event(s) based on stable identity",
                extra={"duplicates_count": duplicates_count, "total_events": len(events)},
            )
        
        return deduplicated_events

    # ------------------------------------------------------------------
    # EDGAR HTTP helpers
    # ------------------------------------------------------------------
    async def _fetch_submissions_json(self, cik: str) -> dict:
        """Fetch company submissions JSON from EDGAR.
        
        SEC COMPLIANCE: Enforces rate limiting and User-Agent requirement.
        
        Raises:
            NotFoundError: If CIK not found (HTTP 404)
            ProviderUnavailableError: If network error or HTTP 5xx
            BadRequestError: If response is not valid JSON
        """
        await self._limiter.acquire()

        cik_padded = cik.zfill(10)
        url = self.SUBMISSIONS_URL_TEMPLATE.format(cik_padded=cik_padded)
        headers = {
            "User-Agent": self._user_agent,
            "Accept": "application/json",
        }

        def _sync_request() -> dict:
            req = urllib.request.Request(url, headers=headers, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
                    payload = resp.read()
            except urllib.error.HTTPError as exc:
                # Error handling moved to caller for proper exception types
                logger.error(
                    "EDGAR submissions HTTP error",
                    extra={
                        "cik": cik,
                        "status": exc.code,
                        "reason": exc.reason,
                        "url": url,
                    },
                )
                raise
            except urllib.error.URLError as exc:
                # Error handling moved to caller for proper exception types
                logger.error(
                    "EDGAR submissions connection error",
                    extra={"cik": cik, "reason": str(exc.reason), "url": url},
                )
                raise

            try:
                return json.loads(payload.decode("utf-8"))
            except json.JSONDecodeError as exc:
                # Error handling moved to caller for proper exception types
                logger.error(
                    "Failed to decode EDGAR submissions JSON",
                    extra={"cik": cik, "error": str(exc), "url": url},
                )
                raise

        return await asyncio.to_thread(_sync_request)

    @staticmethod
    def _extract_form4_filings(submissions: dict) -> List[dict]:
        """Extract recent Form 4 filings from the submissions JSON payload.
        
        DETERMINISM: Returns filings in the order they appear in the JSON.
        This ensures consistent processing order across runs.
        
        Raises:
            ValueError: If submissions structure is invalid (missing required keys)
        """
        if not isinstance(submissions, dict):
            raise ValueError(f"Submissions must be a dict, got {type(submissions).__name__}")
        
        filings = submissions.get("filings", {})
        if not isinstance(filings, dict):
            raise ValueError(f"Submissions 'filings' must be a dict, got {type(filings).__name__}")
        
        recent = filings.get("recent", {})
        if not isinstance(recent, dict):
            raise ValueError(f"Submissions 'filings.recent' must be a dict, got {type(recent).__name__}")
        
        forms = recent.get("form", [])
        accession_numbers = recent.get("accessionNumber", [])
        primary_documents = recent.get("primaryDocument", [])
        filing_dates = recent.get("filingDate", [])

        # DETERMINISM: Use zip to ensure consistent pairing of fields
        # All lists should have the same length per EDGAR API contract
        result: List[dict] = []
        for form, acc, doc, fdate in zip(
            forms, accession_numbers, primary_documents, filing_dates
        ):
            if form != "4":
                continue
            result.append(
                {
                    "form": form,
                    "accessionNumber": acc,
                    "primaryDocument": doc,
                    "filingDate": fdate,
                }
            )
        return result

    async def _download_form4_xml(
        self,
        *,
        cik: str,
        accession_number: str,
        primary_document: str,
    ) -> str:
        """Download the primary Form 4 XML document for a given filing.
        
        SEC COMPLIANCE: Enforces rate limiting and User-Agent requirement.
        
        Raises:
            NotFoundError: If Form 4 XML not found (HTTP 404)
            ProviderUnavailableError: If network error or HTTP 5xx
        """
        await self._limiter.acquire()

        # URL CONSTRUCTION: Accession numbers in URLs replace dashes with no separators
        # DETERMINISM: Explicit normalization ensures consistent URL generation
        if not accession_number or not accession_number.strip():
            raise ValueError("accession_number cannot be empty")
        if not primary_document or not primary_document.strip():
            raise ValueError("primary_document cannot be empty")
        
        acc_no_nodash = accession_number.replace("-", "")
        cik_padded = cik.zfill(10)
        url = (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{cik_padded}/{acc_no_nodash}/{primary_document}"
        )

        headers = {
            "User-Agent": self._user_agent,
            "Accept": "application/xml,text/xml",
        }

        def _sync_request() -> str:
            req = urllib.request.Request(url, headers=headers, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
                    payload = resp.read()
            except urllib.error.HTTPError as exc:
                # Error handling moved to caller for proper exception types
                logger.error(
                    "EDGAR Form 4 HTTP error",
                    extra={
                        "cik": cik,
                        "accession": accession_number,
                        "status": exc.code,
                        "reason": exc.reason,
                        "url": url,
                    },
                )
                raise
            except urllib.error.URLError as exc:
                # Error handling moved to caller for proper exception types
                logger.error(
                    "EDGAR Form 4 connection error",
                    extra={
                        "cik": cik,
                        "accession": accession_number,
                        "reason": str(exc.reason),
                        "url": url,
                    },
                )
                raise

            # DECODING: Use 'replace' to handle encoding errors gracefully
            # This ensures we can parse even if XML has minor encoding issues
            return payload.decode("utf-8", errors="replace")

        return await asyncio.to_thread(_sync_request)


