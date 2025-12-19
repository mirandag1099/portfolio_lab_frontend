"""Market data provider interface."""

from abc import ABC, abstractmethod
from datetime import date

from app.data.models.prices import PriceSeries


class MarketDataProvider(ABC):
    """
    Abstract base class for market data providers.
    
    PROVIDER CONTRACT (Phase 8):
    - Providers must NEVER return None or partial data
    - Providers must return valid PriceSeries OR raise explicit typed exception
    - Missing/empty data → NotFoundError
    - Provider outage/misconfiguration → ProviderUnavailableError
    - Invalid input → BadRequestError
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        pass

    @abstractmethod
    async def get_price_series(self, ticker: str, start: date, end: date) -> PriceSeries:
        """
        Fetch historical price series for a ticker.
        
        PROVIDER CONTRACT: Must return valid PriceSeries or raise exception.
        Never returns None or partial data.
        
        Args:
            ticker: Ticker symbol
            start: Start date (inclusive)
            end: End date (inclusive)
            
        Returns:
            PriceSeries with valid data
            
        Raises:
            NotFoundError: If ticker doesn't exist or has no data for date range
            ProviderUnavailableError: If provider is unreachable or misconfigured
            BadRequestError: If input is invalid or provider returns malformed data
        """
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """
        Check if provider is available.
        
        PROVIDER CONTRACT: Must be lightweight and side-effect free.
        Should not perform actual data fetches, only check configuration/reachability.
        """
        pass

