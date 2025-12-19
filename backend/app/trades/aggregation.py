"""Read-only trade aggregation utilities (Phase 6.4, hardened in Phase 9.4).

This module provides **descriptive** aggregations over canonical TradeEvent
objects for browsing and pattern recognition. It intentionally avoids any
notion of scoring, ranking "best" actors/tickers, or performance comparison.

PROVENANCE PRESERVATION (Phase 8, 9.2): All aggregation functions preserve the
`source` field from individual TradeEvent records. When aggregating, each
event retains its source (quiver | sec), ensuring full auditability of
data origin even after aggregation.

REPLAYABILITY (Phase 9.4): All aggregation functions process events in deterministic
order using stable identity (cik:accession:transaction_index for SEC trades). This
ensures the same EDGAR filing(s) always generate the same aggregation results
bit-for-bit. Events are sorted by stable identity before processing, and aggregation
results are returned with sorted keys for deterministic iteration.

NOTE: Aggregation functions return summary objects (ActorAggregation, TickerAggregation,
TimeWindowSummary) which aggregate counts and values. Individual TradeEvent objects
are not returned, so per-event provenance (cik, accession_number, filing_date,
transaction_index) is not preserved in aggregated views. This is acceptable as
aggregated views are summaries, not individual trade records. Individual events
retain full provenance when accessed directly.

Key capabilities:
- Aggregate by actor (who traded)
- Aggregate by ticker (what was traded)
- Aggregate by time window (when trades occurred)
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Dict, Iterable, List, Literal, Optional

from app.trades.models import TradeEvent, TradeType


@dataclass
class ValueRangeAggregate:
    """Aggregated monetary value range across multiple trades.

    Values are sums of min/max bounds where available. If some trades
    have missing value ranges, those are simply excluded from the sums.
    """

    min_total: Optional[Decimal] = None
    max_total: Optional[Decimal] = None

    def add(self, other_min: Optional[Decimal], other_max: Optional[Decimal]) -> None:
        """Accumulate another value range into this aggregate."""
        if other_min is None and other_max is None:
            return

        if other_min is not None:
            self.min_total = (
                other_min
                if self.min_total is None
                else self.min_total + other_min
            )
        if other_max is not None:
            self.max_total = (
                other_max
                if self.max_total is None
                else self.max_total + other_max
            )


@dataclass
class BuySellCounts:
    """Simple count of buy vs sell events."""

    buys: int = 0
    sells: int = 0

    def add(self, trade_type: TradeType) -> None:
        if trade_type == TradeType.BUY:
            self.buys += 1
        elif trade_type == TradeType.SELL:
            self.sells += 1


@dataclass
class ActorAggregation:
    """Aggregated view of trades for a single actor."""

    actor_id: str
    trade_counts: BuySellCounts
    value_range: ValueRangeAggregate
    tickers: Counter  # ticker -> number of trades


@dataclass
class TickerAggregation:
    """Aggregated view of trades for a single ticker."""

    ticker: str
    trade_counts: BuySellCounts
    value_range: ValueRangeAggregate
    actors: Counter  # actor_id -> number of trades


@dataclass
class TimeWindowSummary:
    """Aggregated view of trades within a time window."""

    window_start: date
    window_end: date
    trade_counts: BuySellCounts
    value_range: ValueRangeAggregate
    tickers: Counter
    actors: Counter


def aggregate_by_actor(events: Iterable[TradeEvent]) -> Dict[str, ActorAggregation]:
    """
    Aggregate trade events by actor_id.
    
    REPLAYABILITY (Phase 9.4): This function processes events in deterministic order.
    Events are sorted by stable identity before aggregation to ensure bit-for-bit
    stable outputs given the same inputs.

    Returns:
        Mapping of actor_id -> ActorAggregation
    """
    # REPLAYABILITY: Convert to list and sort by stable identity for deterministic processing
    # This ensures the same events always produce the same aggregation results
    events_list = list(events)
    events_list.sort(
        key=lambda e: (
            e.get_stable_identity() or "",  # Stable identity for SEC trades
            e.transaction_date,
            e.ticker,
            e.actor_id,
            e.source.value,
        )
    )
    
    # REPLAYABILITY (Phase 9.4): Use OrderedDict-like behavior by sorting keys
    # Python 3.7+ dicts preserve insertion order, but explicit sorting ensures determinism
    aggregates: Dict[str, ActorAggregation] = {}

    for event in events_list:
        agg = aggregates.get(event.actor_id)
        if agg is None:
            agg = ActorAggregation(
                actor_id=event.actor_id,
                trade_counts=BuySellCounts(),
                value_range=ValueRangeAggregate(),
                tickers=Counter(),
            )
            aggregates[event.actor_id] = agg

        # Count buys vs sells
        agg.trade_counts.add(event.trade_type)

        # Aggregate value ranges (if present)
        vr = event.value_range
        if vr is not None:
            agg.value_range.add(vr.min_value, vr.max_value)

        # Count ticker activity
        agg.tickers[event.ticker] += 1

    # REPLAYABILITY (Phase 9.4): Return aggregates with sorted keys for deterministic iteration
    # This ensures the same events always produce the same dict key order
    return dict(sorted(aggregates.items()))


def aggregate_by_ticker(events: Iterable[TradeEvent]) -> Dict[str, TickerAggregation]:
    """
    Aggregate trade events by ticker symbol.
    
    REPLAYABILITY (Phase 9.4): This function processes events in deterministic order.
    Events are sorted by stable identity before aggregation to ensure bit-for-bit
    stable outputs given the same inputs.

    Returns:
        Mapping of ticker -> TickerAggregation
    """
    # REPLAYABILITY: Convert to list and sort by stable identity for deterministic processing
    # This ensures the same events always produce the same aggregation results
    events_list = list(events)
    events_list.sort(
        key=lambda e: (
            e.get_stable_identity() or "",  # Stable identity for SEC trades
            e.transaction_date,
            e.ticker,
            e.actor_id,
            e.source.value,
        )
    )
    
    # REPLAYABILITY (Phase 9.4): Use OrderedDict-like behavior by sorting keys
    # Python 3.7+ dicts preserve insertion order, but explicit sorting ensures determinism
    aggregates: Dict[str, TickerAggregation] = {}

    for event in events_list:
        agg = aggregates.get(event.ticker)
        if agg is None:
            agg = TickerAggregation(
                ticker=event.ticker,
                trade_counts=BuySellCounts(),
                value_range=ValueRangeAggregate(),
                actors=Counter(),
            )
            aggregates[event.ticker] = agg

        # Count buys vs sells
        agg.trade_counts.add(event.trade_type)

        # Aggregate value ranges (if present)
        vr = event.value_range
        if vr is not None:
            agg.value_range.add(vr.min_value, vr.max_value)

        # Count actor activity
        agg.actors[event.actor_id] += 1

    # REPLAYABILITY (Phase 9.4): Return aggregates with sorted keys for deterministic iteration
    # This ensures the same events always produce the same dict key order
    return dict(sorted(aggregates.items()))


def summarize_time_windows(
    events: Iterable[TradeEvent],
    *,
    window: Literal["day", "month"] = "day",
) -> List[TimeWindowSummary]:
    """Create time-window summaries over trade events.

    Args:
        events:
            Iterable of TradeEvent instances.
        window:
            Aggregation window:
            - "day": group by calendar date (YYYY-MM-DD)
            - "month": group by calendar month (YYYY-MM)

    Returns:
        List of TimeWindowSummary objects, sorted by window_start.
    """
    # REPLAYABILITY (Phase 9.4): Convert to list and sort by stable identity for deterministic processing
    # This ensures the same events always produce the same time window summaries
    events_list = list(events)
    events_list.sort(
        key=lambda e: (
            e.get_stable_identity() or "",  # Stable identity for SEC trades
            e.transaction_date,
            e.ticker,
            e.actor_id,
            e.source.value,
        )
    )
    
    buckets: Dict[str, List[TradeEvent]] = defaultdict(list)

    for event in events_list:
        d = event.transaction_date.date()
        if window == "day":
            key = d.isoformat()
        elif window == "month":
            key = f"{d.year:04d}-{d.month:02d}"
        else:
            raise ValueError(f"Unsupported window type: {window}")
        buckets[key].append(event)

    summaries: List[TimeWindowSummary] = []

    # DETERMINISM ENFORCEMENT: Sort bucket keys to ensure deterministic iteration order
    # defaultdict preserves insertion order, but explicit sorting guarantees consistency
    sorted_bucket_keys = sorted(buckets.keys())
    
    for key in sorted_bucket_keys:
        bucket_events = buckets[key]
        
        # REPLAYABILITY (Phase 9.4): Sort bucket events by stable identity for deterministic processing
        # This ensures events within each time window are processed in a stable order
        bucket_events.sort(
            key=lambda e: (
                e.get_stable_identity() or "",  # Stable identity for SEC trades
                e.transaction_date,
                e.ticker,
                e.actor_id,
                e.source.value,
            )
        )
        
        # Determine window boundaries
        if window == "day":
            start = end = bucket_events[0].transaction_date.date()
        else:  # month
            first_date = min(e.transaction_date.date() for e in bucket_events)
            last_date = max(e.transaction_date.date() for e in bucket_events)
            start, end = first_date, last_date

        counts = BuySellCounts()
        value_agg = ValueRangeAggregate()
        ticker_counter: Counter = Counter()
        actor_counter: Counter = Counter()

        for event in bucket_events:
            counts.add(event.trade_type)

            if event.value_range is not None:
                value_agg.add(event.value_range.min_value, event.value_range.max_value)

            ticker_counter[event.ticker] += 1
            actor_counter[event.actor_id] += 1

        summaries.append(
            TimeWindowSummary(
                window_start=start,
                window_end=end,
                trade_counts=counts,
                value_range=value_agg,
                tickers=ticker_counter,
                actors=actor_counter,
            )
        )

    # Sort summaries chronologically by window_start
    summaries.sort(key=lambda s: s.window_start)
    return summaries


