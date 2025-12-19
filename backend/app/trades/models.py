"""Canonical trade and behavior models (Phase 6.1).

These models provide a single source of truth for all trade-like events used
by analytics, UI, and AI agents. They are:

- Explicit: all fields are named and documented
- Normalized: separate actor and event entities
- Auditable: include source, raw metadata, and explicit delay fields
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, computed_field, field_validator


class TradeActorCategory(str, Enum):
    """Type of actor associated with a trade event."""

    POLITICIAN = "politician"
    INSIDER = "insider"


class TradeSource(str, Enum):
    """Origin system for trade disclosures."""

    QUIVER = "quiver"
    SEC = "sec"


class TradeType(str, Enum):
    """Direction of the reported trade."""

    BUY = "buy"
    SELL = "sell"


class TradeValueRange(BaseModel):
    """Reported monetary value range for a trade.

    NOTE: Money values use Decimal and represent *ranges*, not point estimates.
    """

    min_value: Optional[Decimal] = Field(
        default=None,
        description="Lower bound of reported trade value (inclusive). "
        "Uses Decimal; no floating point.",
        ge=0,
    )
    max_value: Optional[Decimal] = Field(
        default=None,
        description="Upper bound of reported trade value (inclusive). "
        "Uses Decimal; no floating point.",
        ge=0,
    )

    @field_validator("max_value")
    @classmethod
    def validate_range(
        cls, v: Optional[Decimal], info: field_validator.ValidationInfo
    ) -> Optional[Decimal]:
        """Ensure max_value is not below min_value when both are present."""
        min_value: Optional[Decimal] = info.data.get("min_value")
        if v is not None and min_value is not None and v < min_value:
            raise ValueError("max_value cannot be less than min_value")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "min_value": "1000",
                "max_value": "15000",
            }
        }


class TradeActor(BaseModel):
    """Entity that initiates or is associated with trade events."""

    id: str = Field(
        ...,
        description=(
            "Stable actor identifier (e.g., canonical politician or insider id)."
        ),
        min_length=1,
    )
    name: str = Field(
        ...,
        description="Human-readable actor name (e.g., 'Nancy Pelosi', 'Jane Doe').",
        min_length=1,
    )
    category: TradeActorCategory = Field(
        ...,
        description="Actor category (politician | insider).",
    )
    affiliation: Optional[str] = Field(
        default=None,
        description=(
            "Actor affiliation. For politicians: e.g., 'D-CA', 'R-TX'. "
            "For insiders: e.g., 'CEO', 'CFO', 'Director'."
        ),
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "politician:us-house:1234",
                "name": "Jane Doe",
                "category": "politician",
                "affiliation": "D-CA",
            }
        }


class TradeEvent(BaseModel):
    """Canonical representation of a single trade-like disclosure event."""

    actor_id: str = Field(
        ...,
        description="Foreign key to TradeActor.id for the actor associated with the trade.",
        min_length=1,
    )
    ticker: str = Field(
        ...,
        description="Security ticker symbol (e.g., 'AAPL', 'MSFT').",
        min_length=1,
    )
    trade_type: TradeType = Field(
        ...,
        description="Trade direction (buy | sell).",
    )
    transaction_date: datetime = Field(
        ...,
        description=(
            "Date/time when the transaction occurred, timezone-aware (UTC recommended)."
        ),
    )
    reported_date: datetime = Field(
        ...,
        description=(
            "Date/time when the trade was reported/Filed, timezone-aware (UTC recommended)."
        ),
    )
    value_range: Optional[TradeValueRange] = Field(
        default=None,
        description=(
            "Reported monetary value range for the trade, using Decimal and ranges "
            "instead of point estimates."
        ),
    )
    source: TradeSource = Field(
        ...,
        description="Origin system for this trade event (quiver | sec).",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Raw reference identifiers and source-specific fields "
            "(e.g., filing ids, URLs). No derived meaning."
        ),
    )

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        """Normalize ticker symbols to uppercase without surrounding whitespace."""
        return v.upper().strip()

    @field_validator("transaction_date", "reported_date")
    @classmethod
    def ensure_timezone_aware(cls, v: datetime) -> datetime:
        """Require timezone-aware datetimes to avoid ambiguous timestamps."""
        if v.tzinfo is None or v.tzinfo.utcoffset(v) is None:
            raise ValueError(
                "Datetime must be timezone-aware (e.g., UTC); naive datetimes are not allowed"
            )
        return v

    @field_validator("metadata")
    @classmethod
    def validate_sec_provenance(cls, v: Dict[str, Any], info: field_validator.ValidationInfo) -> Dict[str, Any]:
        """Enforce required provenance fields for SEC/EDGAR-sourced trades (Phase 9.2).
        
        PROVENANCE ENFORCEMENT: For SEC-sourced trades, the following fields are REQUIRED:
        - cik: Company CIK (Central Index Key)
        - accession_number: SEC filing accession number
        - filing_date: Filing date string
        - transaction_index: Deterministic transaction index within the filing
        
        This ensures audit-grade provenance for all EDGAR insider trades.
        Missing provenance fields indicate a data quality or parsing issue.
        
        Args:
            v: Metadata dictionary
            info: Validation context (includes 'source' field)
        
        Returns:
            Metadata dictionary (unchanged if valid)
        
        Raises:
            ValueError: If SEC-sourced trade is missing required provenance fields
        """
        # Get source from validation context
        source = info.data.get("source")
        
        # PROVENANCE ENFORCEMENT: Only apply to SEC-sourced trades
        if source == TradeSource.SEC:
            missing_fields = []
            
            # Required provenance fields for SEC trades
            if "cik" not in v or not v.get("cik"):
                missing_fields.append("cik")
            if "accession_number" not in v or not v.get("accession_number"):
                missing_fields.append("accession_number")
            if "filing_date" not in v or not v.get("filing_date"):
                missing_fields.append("filing_date")
            if "transaction_index" not in v:
                # transaction_index can be 0, so check for presence, not truthiness
                missing_fields.append("transaction_index")
            
            if missing_fields:
                # Build context for error message
                context_info = {
                    "cik": v.get("cik", "missing"),
                    "accession_number": v.get("accession_number", "missing"),
                }
                raise ValueError(
                    f"SEC-sourced TradeEvent missing required provenance fields: {', '.join(missing_fields)}. "
                    f"Context: {context_info}. "
                    "All EDGAR insider trades must include complete provenance for auditability."
                )
        
        return v

    @computed_field(
        description=(
            "Reporting delay in whole days between transaction_date and reported_date, "
            "based on calendar days. Non-negative by construction."
        )
    )
    @property
    def delay_days(self) -> int:
        """Computed calendar-day delay between transaction and reporting."""
        # Use date component only to avoid partial-day timezone edge cases.
        delta = self.reported_date.date() - self.transaction_date.date()
        days = delta.days
        # Guard against negative values due to bad upstream data.
        if days < 0:
            raise ValueError(
                "reported_date occurs before transaction_date; delay_days would be negative"
            )
        return days

    def get_stable_identity(self) -> Optional[str]:
        """
        Generate a stable, deterministic identity for this trade event (Phase 9.4).
        
        REPLAYABILITY: The same EDGAR filing must always generate the same identity
        for the same trade. This identity is derived ONLY from immutable provenance
        fields that are guaranteed to be present for SEC-sourced trades:
        - cik: Company CIK (immutable)
        - accession_number: SEC filing accession number (immutable)
        - transaction_index: Transaction index within filing (immutable, deterministic)
        
        This identity can be used for:
        - Deduplication (same identity = same trade)
        - Stable sorting (identity is deterministic and sortable)
        - Replayability verification (same inputs → same identities)
        
        Returns:
            Stable identity string in format: "{cik}:{accession_number}:{transaction_index}"
            Returns None if required provenance fields are missing (non-SEC trades or invalid state)
        
        Example:
            "0000320193:0000320193-24-000001:0"
        """
        # Only SEC-sourced trades have the required provenance fields
        if self.source != TradeSource.SEC:
            return None
        
        # Extract required provenance fields from metadata
        cik = self.metadata.get("cik")
        accession_number = self.metadata.get("accession_number")
        transaction_index = self.metadata.get("transaction_index")
        
        # All three fields are required for stable identity
        if not cik or not accession_number or transaction_index is None:
            return None
        
        # DETERMINISM: Use explicit string formatting to ensure consistent format
        # Format: "{cik}:{accession_number}:{transaction_index}"
        # This format is stable, sortable, and human-readable
        return f"{cik}:{accession_number}:{transaction_index}"

    class Config:
        json_schema_extra = {
            "example": {
                "actor_id": "politician:us-house:1234",
                "ticker": "AAPL",
                "trade_type": "buy",
                "transaction_date": "2024-05-10T14:30:00Z",
                "reported_date": "2024-05-15T12:00:00Z",
                "value_range": {
                    "min_value": "1000",
                    "max_value": "15000",
                },
                "source": "quiver",
                "metadata": {
                    "quiver_trade_id": "qv_abc123",
                    "filing_url": "https://example.com/filing/abc123",
                },
            }
        }


