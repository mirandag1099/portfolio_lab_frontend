"""Application configuration."""

import logging
from enum import Enum
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Application environment types."""

    LOCAL = "local"
    DEVELOPMENT = "development"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment Configuration
    env: Environment = Field(
        default=Environment.LOCAL,
        description="Application environment (local, development, production)",
    )
    log_level: str = Field(
        default="INFO",
        description="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    )

    # API Configuration
    api_v1_prefix: str = Field(
        default="/api/v1",
        description="API v1 route prefix",
    )

    # Server Configuration
    host: str = Field(
        default="127.0.0.1",
        description="Server host address",
    )
    port: int = Field(
        default=8000,
        description="Server port number",
    )

    # Application Metadata
    service_name: str = Field(
        default="portfoliolab-backend",
        description="Service name identifier",
    )
    version: str = Field(
        default="1.0.0",
        description="Application version",
    )

    # Cache Configuration
    cache_ttl_seconds: int = Field(
        default=86400,  # 24 hours
        description="Cache TTL in seconds for market data (default: 24 hours)",
    )
    cache_enabled: bool = Field(
        default=True,
        description="Enable market data caching",
    )

    # Data Provider API Keys (placeholders for future integration)
    # Market Data Providers
    polygon_api_key: Optional[str] = Field(
        default=None,
        description="Polygon.io API key for market data",
    )
    tiingo_api_key: Optional[str] = Field(
        default=None,
        description="Tiingo API key for market data and fundamentals",
    )
    alpha_vantage_api_key: Optional[str] = Field(
        default=None,
        description="Alpha Vantage API key (MVP fallback)",
    )

    # Economic Data Providers
    fred_api_key: Optional[str] = Field(
        default=None,
        description="FRED (Federal Reserve) API key for risk-free rates",
    )

    # Trade & Behavior Tracking Providers
    quiver_api_key: Optional[str] = Field(
        default=None,
        description=(
            "Quiver Quantitative API key for politician trades ONLY. "
            "GUARDRAIL (Phase 9.3): Quiver MUST NEVER be used for insider trades. "
            "EDGAR is the exclusive source for insider trades."
        ),
    )
    
    # Feature Flags (Phase 8: Quiver Deprecation)
    quiver_enabled: bool = Field(
        default=False,
        description=(
            "Enable Quiver integration (default: False). "
            "Quiver is deprecated and non-strategic per PRD v2.0. "
            "Set to True only if explicitly required for migration/legacy support."
        ),
    )
    
    trades_endpoints_enabled: bool = Field(
        default=True,
        description=(
            "Enable trade ingestion endpoints (default: True). "
            "Set to False to disable all trade endpoints without affecting portfolio analytics."
        ),
    )
    
    # Persistence Configuration (Phase 10.1)
    data_storage_path: str = Field(
        default=".data",
        description=(
            "Base directory for file-based data persistence (default: .data). "
            "Stores raw upstream data (EDGAR filings, market prices, factor data) "
            "to avoid refetching identical data on every request. "
            "Path is relative to backend directory or absolute."
        ),
    )
    
    # CORS Configuration (Phase 11.4: Production Hardening)
    cors_origins: str = Field(
        default="http://localhost:8080,http://127.0.0.1:8080",
        description=(
            "Comma-separated list of allowed CORS origins. "
            "In production, must be explicitly set (no wildcards allowed). "
            "Example: 'https://app.example.com,https://www.example.com'"
        ),
    )
    
    cors_allow_credentials: bool = Field(
        default=True,
        description="Allow credentials in CORS requests (cookies, authorization headers).",
    )
    
    cors_allow_methods: list[str] = Field(
        default=["GET", "POST", "OPTIONS"],
        description="Allowed HTTP methods for CORS requests.",
    )
    
    cors_allow_headers: list[str] = Field(
        default=["*"],
        description="Allowed HTTP headers for CORS requests. Use ['*'] for all headers.",
    )

    # Computed Properties
    @property
    def debug(self) -> bool:
        """Determine if debug mode is enabled based on environment."""
        return self.env in (Environment.LOCAL, Environment.DEVELOPMENT)

    @property
    def environment(self) -> str:
        """Alias for env for backward compatibility."""
        return self.env.value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Global settings instance - safe to import anywhere
settings = Settings()


def get_log_level() -> int:
    """Convert log level string to logging constant."""
    level_map = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL,
    }
    return level_map.get(settings.log_level.upper(), logging.INFO)

