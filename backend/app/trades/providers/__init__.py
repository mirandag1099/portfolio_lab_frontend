"""Trade data providers package (Phase 6).

This module defines provider interfaces and concrete implementations for
ingesting trade and behavior data from external sources (e.g., Quiver).

Providers are responsible for:
- Fetching raw data from external APIs
- Enforcing basic operational contracts (auth, rate limiting)
- Normalizing records into canonical TradeEvent models
"""

from .base import TradeDataProvider  # noqa: F401
from .quiver import QuiverTradeProvider  # noqa: F401


