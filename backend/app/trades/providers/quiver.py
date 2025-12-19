"""Quiver provider for US politician trade disclosures (Phase 6.2).

DEPRECATED (Phase 8): Quiver is deprecated and non-strategic per PRD v2.0.
This provider is maintained for migration/legacy support only and should be
disabled by default in production via the quiver_enabled feature flag.

GUARDRAILS (Phase 9.3): This provider is STRICTLY LIMITED to politician trades only.
Quiver MUST NEVER be used for insider trades. EDGAR is the exclusive, authoritative
source for insider trades. Any attempt to use Quiver for insiders will fail fast
with an explicit error.

This provider:
- Calls Quiver's public API for US congress trading data (POLITICIANS ONLY)
- Enforces explicit rate limiting for outbound HTTP requests
- Normalizes responses into canonical TradeEvent models

All outputs are:
- Observational
- Time-delayed (as reported by Quiver / underlying filings)
- Non-predictive
- POLITICIAN TRADES ONLY (not insider trades)
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Deque, Dict, List, Optional
from collections import deque

from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.core.logging import get_logger
from app.trades.models import (
    TradeActorCategory,
    TradeEvent,
    TradeSource,
    TradeType,
    TradeValueRange,
)
from app.trades.providers.base import TradeDataProvider


logger = get_logger(__name__)


@dataclass
class SimpleRateLimiter:
    """In-process async rate limiter (no external dependencies).

    Maintains a sliding window of recent call timestamps and sleeps as needed
    to respect the max_calls / period_seconds budget.
    """

    max_calls: int
    period_seconds: float
    _call_times: Deque[float] = field(default_factory=deque)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def acquire(self) -> None:
        """Wait until a call slot is available."""
        async with self._lock:
            now = time.monotonic()

            # Drop timestamps that are outside the window.
            window_start = now - self.period_seconds
            while self._call_times and self._call_times[0] < window_start:
                self._call_times.popleft()

            if len(self._call_times) >= self.max_calls:
                # Need to wait until the oldest call exits the window.
                oldest = self._call_times[0]
                sleep_for = self.period_seconds - (now - oldest)
                if sleep_for > 0:
                    await asyncio.sleep(sleep_for)

                # Recompute window after sleeping.
                now = time.monotonic()
                window_start = now - self.period_seconds
                while self._call_times and self._call_times[0] < window_start:
                    self._call_times.popleft()

            self._call_times.append(time.monotonic())


class QuiverTradeProvider(TradeDataProvider):
    """
    Quiver-based trade data provider for US politician trades.
    
    GUARDRAILS (Phase 9.3):
    - STRICTLY LIMITED to politician trades only
    - MUST NEVER be used for insider trades
    - EDGAR is the exclusive source for insider trades
    - Any attempt to use Quiver for insiders will fail fast
    
    This provider does NOT implement get_insider_trades_for_cik or any insider
    trade methods. Insider trades must use EdgarForm4Provider exclusively.
    """

    BASE_URL = "https://api.quiverquant.com/beta/historical/congresstrading"

    def __init__(self, *, api_key_env: str = "QUIVER_API_KEY") -> None:
        self._api_key_env = api_key_env
        self._api_key: Optional[str] = os.getenv(api_key_env)

        # Explicit, conservative default: 10 calls per 60 seconds.
        self._limiter = SimpleRateLimiter(max_calls=10, period_seconds=60.0)

        if not self._api_key:
            logger.warning(
                "QuiverTradeProvider initialized without API key; "
                "set %s to enable this provider.",
                api_key_env,
            )

    # ------------------------------------------------------------------
    # TradeDataProvider interface
    # ------------------------------------------------------------------
    @property
    def name(self) -> str:
        return "quiver"

    async def is_available(self) -> bool:
        """
        Check if Quiver provider is available and enabled.
        
        DEPRECATED (Phase 8): Quiver is deprecated. This method checks both
        the feature flag and API key configuration.
        
        Returns:
            True if Quiver is enabled AND API key is configured, False otherwise
        """
        # FEATURE FLAG: Quiver must be explicitly enabled
        if not settings.quiver_enabled:
            return False
        return bool(self._api_key)

    async def get_politician_trades(
        self,
        *,
        politician: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[TradeEvent]:
        """
        Fetch and normalize US politician trades from Quiver.

        GUARDRAILS (Phase 9.3): This method is STRICTLY LIMITED to politician trades.
        Quiver MUST NEVER be used for insider trades. EDGAR is the exclusive source
        for insider trades. This method will only return politician trades.

        DEPRECATED (Phase 8): Quiver is deprecated and non-strategic per PRD v2.0.
        This method fails fast if Quiver is disabled via feature flag.

        Implementation notes:
        - Uses the generic congress trading endpoint and filters client-side
          by politician and date range to keep behavior deterministic.
        - Preserves Quiver's reported value range and reporting lag.
        - Returns ONLY politician trades (not insider trades).

        Raises:
            BadRequestError: If Quiver is disabled via feature flag or API key is missing
        """
        # FEATURE FLAG ENFORCEMENT: Fail fast if Quiver is disabled
        if not settings.quiver_enabled:
            raise BadRequestError(
                "Quiver integration is disabled. "
                "Quiver is deprecated and non-strategic per PRD v2.0. "
                "Set QUIVER_ENABLED=true to enable (not recommended for production).",
                context={"provider": "quiver", "feature_flag": "quiver_enabled"},
            )
        
        if not self._api_key:
            raise BadRequestError(
                f"QuiverTradeProvider is not configured: missing API key "
                f"in environment variable {self._api_key_env}. "
                "Quiver is deprecated and non-strategic per PRD v2.0.",
                context={"provider": "quiver", "api_key_env": self._api_key_env},
            )

        raw_records = await self._fetch_congress_trading_all()

        # Deterministic filtering: do not mutate input; build a new list.
        events: List[TradeEvent] = []
        for record in raw_records:
            try:
                event = self._normalize_record_to_trade_event(record)
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to normalize Quiver record; skipping",
                    extra={"error": str(exc), "record": record},
                )
                continue

            if politician:
                rep = str(record.get("Representative", "")).strip().lower()
                if rep != politician.strip().lower():
                    continue

            tx_date = event.transaction_date.date()
            if start_date and tx_date < start_date:
                continue
            if end_date and tx_date > end_date:
                continue

            events.append(event)

        # Make output order deterministic: sort by transaction_date, ticker, source.
        events.sort(
            key=lambda e: (e.transaction_date, e.ticker, e.source.value, e.actor_id)
        )
        return events

    # ------------------------------------------------------------------
    # HTTP + normalization helpers
    # ------------------------------------------------------------------
    async def _fetch_congress_trading_all(self) -> List[Dict[str, Any]]:
        """Call Quiver's congress trading endpoint and return parsed JSON."""
        await self._limiter.acquire()

        url = f"{self.BASE_URL}/all"
        headers = {
            "Authorization": f"Token {self._api_key}",
            "Accept": "application/json",
        }

        def _sync_request() -> List[Dict[str, Any]]:
            req = urllib.request.Request(url, headers=headers, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
                    payload = resp.read()
            except urllib.error.HTTPError as exc:
                logger.error(
                    "Quiver API HTTP error",
                    extra={"status": exc.code, "reason": exc.reason},
                )
                raise
            except urllib.error.URLError as exc:
                logger.error(
                    "Quiver API connection error",
                    extra={"reason": str(exc.reason)},
                )
                raise

            try:
                data = json.loads(payload.decode("utf-8"))
            except json.JSONDecodeError as exc:
                logger.error(
                    "Failed to decode Quiver API response as JSON",
                    extra={"error": str(exc)},
                )
                raise

            if not isinstance(data, list):
                logger.error(
                    "Unexpected Quiver API response shape; expected list",
                    extra={"type": type(data).__name__},
                )
                raise ValueError("Unexpected Quiver API response shape; expected list")

            return data

        return await asyncio.to_thread(_sync_request)

    def _normalize_record_to_trade_event(self, record: Dict[str, Any]) -> TradeEvent:
        """Convert a single Quiver congress trading record into TradeEvent.

        Field mapping is intentionally conservative and aims to be robust to
        minor schema changes by falling back to metadata when parsing fails.
        """
        # Representative / actor
        representative = str(record.get("Representative") or "").strip()
        if not representative:
            raise ValueError("Missing Representative field in Quiver record")

        party = str(record.get("Party") or "").strip()
        chamber = str(record.get("Chamber") or record.get("House") or "").strip()

        actor_id = f"politician:{representative}"

        # Ticker
        ticker = str(record.get("Ticker") or "").strip()
        if not ticker:
            raise ValueError("Missing Ticker field in Quiver record")

        # Trade type: map Quiver's Transaction string into TradeType enum.
        raw_transaction = str(record.get("Transaction") or "").strip().lower()
        if "purchase" in raw_transaction or raw_transaction == "buy":
            trade_type = TradeType.BUY
        elif "sale" in raw_transaction or raw_transaction == "sell":
            trade_type = TradeType.SELL
        else:
            # Unknown direction: fail loudly rather than guessing.
            raise ValueError(f"Unrecognized Transaction value: {raw_transaction}")

        # Dates: Quiver typically uses YYYY-MM-DD strings.
        tx_date_str = (
            record.get("TransactionDate")
            or record.get("Date")
            or record.get("Transaction Date")
        )
        if not tx_date_str:
            raise ValueError("Missing TransactionDate/Date field in Quiver record")

        transaction_date = self._parse_date_to_utc_datetime(str(tx_date_str))

        reported_date_str = (
            record.get("ReportDate")
            or record.get("FilingDate")
            or record.get("Filing Date")
        )
        if not reported_date_str:
            # As a last resort, treat transaction_date as reported_date;
            # delay_days will be zero and still auditable via metadata.
            reported_date = transaction_date
        else:
            reported_date = self._parse_date_to_utc_datetime(str(reported_date_str))

        # Value range parsing.
        value_range = self._parse_value_range(record.get("Range"))

        # Metadata: keep original identifiers and raw fields for audit.
        metadata: Dict[str, Any] = {}
        for key in (
            "Representative",
            "Party",
            "Chamber",
            "House",
            "Transaction",
            "Range",
            "ReportDate",
            "FilingDate",
            "FilingUrl",
            "TransactionID",
            "TransactionId",
        ):
            if key in record:
                metadata[key] = record[key]

        # Include raw record id if present under any common key.
        for id_key in ("id", "ID", "Id", "QuiverID", "QuiverId"):
            if id_key in record:
                metadata[id_key] = record[id_key]

        # Encode actor affiliation in a descriptive but non-derivative way.
        affiliation_parts = []
        if party:
            affiliation_parts.append(party)
        if chamber:
            affiliation_parts.append(chamber)
        affiliation = " ".join(affiliation_parts) if affiliation_parts else None

        return TradeEvent(
            actor_id=actor_id,
            ticker=ticker,
            trade_type=trade_type,
            transaction_date=transaction_date,
            reported_date=reported_date,
            value_range=value_range,
            source=TradeSource.QUIVER,
            metadata=metadata,
        )

    @staticmethod
    def _parse_date_to_utc_datetime(value: str) -> datetime:
        """Parse a date or datetime string and normalize to UTC."""
        value = value.strip()
        # Try full ISO datetime first.
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            # Fallback: treat as date-only.
            try:
                d = datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError as exc:  # noqa: TRY003
                raise ValueError(f"Unrecognized date format: {value}") from exc
            dt = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
        if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt

    @staticmethod
    def _parse_value_range(raw_range: Any) -> Optional[TradeValueRange]:
        """Parse Quiver's Range string into a TradeValueRange, if possible.

        Examples:
            "$1,001 - $15,000"
            "$1 - $1,000"
            ">$5,000,000"

        When parsing fails, returns None but preserves the raw string in metadata
        via the caller.
        """
        if raw_range is None:
            return None

        text = str(raw_range).strip()
        if not text:
            return None

        # Handle ">$5,000,000" style ranges: treat lower bound only.
        if text.startswith(">"):
            cleaned = text.lstrip(">$ ").replace(",", "")
            try:
                min_val = Decimal(cleaned)
            except (InvalidOperation, ValueError):
                return None
            return TradeValueRange(min_value=min_val, max_value=None)

        # Handle "min - max" style ranges.
        if "-" in text:
            left, right = text.split("-", 1)
            left_clean = left.replace("$", "").replace(",", "").strip()
            right_clean = right.replace("$", "").replace(",", "").strip()
            try:
                min_val = Decimal(left_clean)
                max_val = Decimal(right_clean)
            except (InvalidOperation, ValueError):
                return None
            return TradeValueRange(min_value=min_val, max_value=max_val)

        # Fallback: try to parse as a single numeric value and treat as both bounds.
        cleaned_single = text.replace("$", "").replace(",", "").strip()
        try:
            value = Decimal(cleaned_single)
        except (InvalidOperation, ValueError):
            return None
        return TradeValueRange(min_value=value, max_value=value)


