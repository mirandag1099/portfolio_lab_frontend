"""Abstract base classes for trade data providers (Phase 6.2).

These providers fetch raw trade-like disclosures from external systems and
normalize them into canonical TradeEvent models defined in
`app.trades.models`. They do **not** perform analytics or interpretation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional

from app.trades.models import TradeEvent


class TradeDataProvider(ABC):
    """Abstract base class for trade data providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier (e.g., 'quiver')."""
        raise NotImplementedError

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True if the provider is configured and reachable."""
        raise NotImplementedError

    @abstractmethod
    async def get_politician_trades(
        self,
        *,
        politician: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[TradeEvent]:
        """Fetch normalized trade events for US politicians.

        Args:
            politician:
                Optional human-readable politician name (e.g. 'Nancy Pelosi').
                If omitted, returns trades for all available politicians.
            start_date:
                Optional start date (inclusive) for transaction_date filter.
            end_date:
                Optional end date (inclusive) for transaction_date filter.

        Returns:
            List of canonical TradeEvent instances.
        """
        raise NotImplementedError


