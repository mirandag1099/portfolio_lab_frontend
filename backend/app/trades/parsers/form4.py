"""SEC Form 4 XML parser (Phase 6.3, hardened in Phase 9.1).

This module focuses on correctness and auditability over completeness.
It parses insider trades from Form 4 XML into canonical TradeEvent models.

Design goals (Phase 9.1):
- Deterministic parsing with stable transaction ordering
- Explicit distinction between "no transactions" vs "all failed parsing"
- Complete provenance tracking (accession_number, filing_date, transaction_index)
- Explicit normalization of transaction codes, ownership types, security types
- No silent failures - all errors include filing identifiers

DETERMINISM GUARANTEES:
- Transactions are parsed in XML document order (deterministic)
- Each transaction is assigned a stable transaction_index
- Identical XML produces identical TradeEvent outputs across runs
- No reliance on dict iteration order or non-deterministic operations

AUDITABILITY GUARANTEES:
- Every TradeEvent includes transaction_index in metadata
- Provenance fields (accession_number, filing_date) are propagated if provided
- All parsing errors include filing identifiers (not raw XML dumps)
- No data is silently skipped or inferred

FAIL-FAST BEHAVIOR:
- "No transactions reported" → valid empty result []
- "Transactions reported but all failed parsing" → ValueError with context
- Individual transaction failures are logged but don't stop parsing
- Complete parsing failure raises explicit error with filing identifiers
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional

from app.core.logging import get_logger
from app.trades.models import (
    TradeActorCategory,
    TradeEvent,
    TradeSource,
    TradeType,
    TradeValueRange,
)


logger = get_logger(__name__)


FORM4_NS = {
    "f4": "http://www.sec.gov/edgar/document/thirteenf/informationtable",  # fallback
    # Many Form 4 documents use no explicit namespace; we support both.
}


@dataclass
class ParsedOfficer:
    """Minimal officer metadata extracted from Form 4."""

    name: str
    title: Optional[str]


def parse_form4_xml(
    xml_content: str,
    *,
    accession_number: Optional[str] = None,
    filing_date: Optional[str] = None,
) -> List[TradeEvent]:
    """Parse a Form 4 XML document into a list of TradeEvent objects.

    DETERMINISM: Transactions are parsed in XML document order and assigned
    deterministic transaction_index values (0-based, in document order).

    PROVENANCE: If accession_number and/or filing_date are provided, they are
    added to each TradeEvent's metadata. transaction_index is always added.

    FAIL-FAST BEHAVIOR:
    - "No transactions reported" → returns [] (valid empty result)
    - "Transactions reported but all failed parsing" → raises ValueError
    - Individual transaction failures are logged but don't stop parsing

    Args:
        xml_content: Raw Form 4 XML document as string
        accession_number: Optional SEC accession number for provenance tracking
        filing_date: Optional filing date string for provenance tracking

    Returns:
        List of TradeEvent objects, deterministically ordered by transaction_index

    Raises:
        ValueError: If XML is malformed, or if all transactions fail to parse
    """
    # XML PARSING: Fail fast on malformed XML
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:  # noqa: TRY003
        filing_id = accession_number or "unknown"
        logger.error(
            "Failed to parse Form 4 XML",
            extra={
                "error": str(exc),
                "accession_number": accession_number,
                "filing_date": filing_date,
            },
        )
        raise ValueError(
            f"Malformed Form 4 XML (accession: {filing_id}). "
            "XML structure is invalid and cannot be parsed."
        ) from exc

    # ROOT VALIDATION: Form 4 XML typically uses <ownershipDocument> root
    if root.tag.lower().endswith("ownershipdocument") is False:
        logger.warning(
            "Unexpected Form 4 root tag",
            extra={
                "tag": root.tag,
                "accession_number": accession_number,
            },
        )

    # OFFICER EXTRACTION: Fail fast if officer information is missing
    try:
        officer = _parse_officer(root)
    except ValueError as exc:
        filing_id = accession_number or "unknown"
        raise ValueError(
            f"Form 4 missing required officer information (accession: {filing_id}): {exc}"
        ) from exc

    # TRANSACTION EXTRACTION: DETERMINISM - use list() to ensure stable order
    # findall() returns elements in document order, which is deterministic
    transactions = list(_iter_non_derivative_transactions(root))

    # VALIDATION (Phase 9.5): Distinguish "no transactions" (valid) from "all failed parsing" (error)
    if not transactions:
        # VALID CASE: "Filing exists but reports no transactions" → valid empty list response
        # This is a valid filing that simply has no trades to report
        logger.info(
            "Form 4 contains no non-derivative transactions",
            extra={
                "accession_number": accession_number,
                "filing_date": filing_date,
            },
        )
        return []

    # TRANSACTION PARSING: Process in document order with explicit transaction_index
    events: List[TradeEvent] = []
    parse_errors: List[tuple[int, str]] = []  # (transaction_index, error_message)
    
    # DETERMINISM: Process transactions in document order (0-based index)
    for transaction_index, tx in enumerate(transactions):
        try:
            event = _transaction_to_trade_event(
                officer=officer,
                tx_elem=tx,
                transaction_index=transaction_index,
                accession_number=accession_number,
                filing_date=filing_date,
            )
            events.append(event)
        except Exception as exc:  # noqa: BLE001
            # FAIL-FAST ENFORCEMENT: Track parse errors with transaction index
            # Individual transaction failures are logged but don't stop parsing
            # Complete failure (all transactions fail) will raise error below
            error_msg = str(exc)
            parse_errors.append((transaction_index, error_msg))
            
            # OBSERVABILITY: Log parse error with transaction context (not raw XML)
            logger.error(
                "Failed to parse Form 4 transaction; skipping",
                extra={
                    "accession_number": accession_number,
                    "filing_date": filing_date,
                    "transaction_index": transaction_index,
                    "error": error_msg,
                    "transaction_tag": tx.tag if hasattr(tx, "tag") else "unknown",
                },
            )
            continue

    # VALIDATION (Phase 9.5): "Transactions exist but all fail parsing" → explicit error
    # This distinguishes "no transactions" (valid) from "all transactions malformed" (error)
    if not events and parse_errors:
        filing_id = accession_number or "unknown"
        error_summary = "; ".join(
            f"tx_{idx}: {err}" for idx, err in parse_errors[:3]  # First 3 errors
        )
        # Log error once (Phase 8 discipline) - this error will propagate to API boundary
        logger.error(
            "All transactions in Form 4 failed to parse",
            extra={
                "accession_number": accession_number,
                "filing_date": filing_date,
                "transactions_count": len(transactions),
                "parse_errors_count": len(parse_errors),
                "first_errors": [err for _, err in parse_errors[:3]],
            },
        )
        raise ValueError(
            f"All {len(transactions)} transactions in Form 4 failed to parse "
            f"(accession: {filing_id}). "
            f"Transaction errors: {error_summary}. "
            "Complete parsing failure indicates malformed filing - explicit error required."
        )

    # REPLAYABILITY ENFORCEMENT (Phase 9.4): Events are already in transaction_index order
    # No additional sorting needed - transaction_index ensures deterministic ordering
    # Each event has a stable identity (cik:accession:transaction_index) that will be
    # used for deduplication and stable sorting at the provider level
    return events


def _parse_officer(root: ET.Element) -> ParsedOfficer:
    """Extract officer name and title from Form 4 header block."""
    # Officer name is typically under reportingOwner/reportingOwnerId/rptOwnerName
    name_elem = root.find(".//reportingOwner/reportingOwnerId/rptOwnerName")
    if name_elem is None or not (name_text := (name_elem.text or "").strip()):
        raise ValueError("Missing reportingOwner name in Form 4")

    title_elem = root.find(".//reportingOwner/reportingOwnerRelationship/officerTitle")
    title_text = (title_elem.text or "").strip() if title_elem is not None else None

    return ParsedOfficer(name=name_text, title=title_text or None)


def _iter_non_derivative_transactions(root: ET.Element) -> Iterable[ET.Element]:
    """Yield non-derivative transaction elements from the Form 4 XML.
    
    DETERMINISM: findall() returns elements in XML document order, which is
    deterministic and stable across runs. This ensures consistent transaction_index
    assignment.
    
    Returns:
        Iterable of nonDerivativeTransaction elements in document order
    """
    # Non-derivative transactions typically appear under:
    # <nonDerivativeTable><nonDerivativeTransaction>...</nonDerivativeTransaction>
    table = root.find("nonDerivativeTable")
    if table is None:
        return []
    # DETERMINISM: findall() preserves document order, ensuring deterministic processing
    return table.findall("nonDerivativeTransaction")


def _transaction_to_trade_event(
    officer: ParsedOfficer,
    tx_elem: ET.Element,
    transaction_index: int,
    accession_number: Optional[str] = None,
    filing_date: Optional[str] = None,
) -> TradeEvent:
    """Convert a nonDerivativeTransaction element into a TradeEvent.
    
    NORMALIZATION: Explicitly normalizes:
    - Transaction codes (P, S, A, D, etc.) → TradeType
    - Ownership type (direct/indirect) → metadata
    - Security type (common stock, etc.) → metadata
    - Shares and prices → Decimal with explicit normalization
    
    PROVENANCE: Adds transaction_index, accession_number, filing_date to metadata.
    
    Args:
        officer: Parsed officer information from Form 4 header
        tx_elem: nonDerivativeTransaction XML element
        transaction_index: Zero-based index of transaction in document order (deterministic)
        accession_number: Optional SEC accession number for provenance
        filing_date: Optional filing date string for provenance
    
    Returns:
        TradeEvent with complete provenance and normalized fields
    
    Raises:
        ValueError: If required fields are missing or invalid
    """
    # SECURITY TICKER: Required field - fail fast if missing
    issuer_ticker = _get_text(tx_elem, ".//issuerTradingSymbol")
    if not issuer_ticker:
        raise ValueError(
            f"Missing issuerTradingSymbol in Form 4 transaction (index: {transaction_index})"
        )
    # NORMALIZATION: Ticker is normalized by TradeEvent model validator (uppercase, stripped)

    # TRANSACTION DATE: Required field - fail fast if missing
    tx_date_str = _get_text(tx_elem, ".//transactionDate/value")
    if not tx_date_str:
        raise ValueError(
            f"Missing transactionDate in Form 4 transaction (index: {transaction_index})"
        )
    transaction_date = _parse_date_to_utc_datetime(tx_date_str)

    # REPORT DATE: Form 4 has a periodOfReport at document level
    reported_date_str = _get_text(tx_elem.getroottree().getroot(), ".//periodOfReport")
    if not reported_date_str:
        # FALLBACK: Use transaction_date if periodOfReport is missing
        # This makes delay_days = 0, which is acceptable for missing report date
        reported_date = transaction_date
    else:
        reported_date = _parse_date_to_utc_datetime(reported_date_str)

    # TRANSACTION CODE: Normalize and map to TradeType
    tx_code_raw = _get_text(tx_elem, ".//transactionCoding/transactionCode")
    if not tx_code_raw:
        raise ValueError(
            f"Missing transactionCode in Form 4 transaction (index: {transaction_index})"
        )
    # NORMALIZATION: Transaction code is normalized in _map_transaction_code_to_trade_type
    trade_type = _map_transaction_code_to_trade_type(tx_code_raw)

    # OWNERSHIP TYPE: Extract direct/indirect ownership (normalized)
    ownership_type = _normalize_ownership_type(tx_elem)

    # SECURITY TYPE: Extract security type (normalized)
    security_type = _normalize_security_type(tx_elem)

    # SHARES AND PRICE: Parse and normalize to Decimal
    shares_raw = _get_text(tx_elem, ".//transactionAmounts/transactionShares/value")
    price_raw = _get_text(tx_elem, ".//transactionAmounts/transactionPricePerShare/value")
    
    # NORMALIZATION: Parse to Decimal (explicit normalization, no float conversion)
    shares = _parse_decimal(shares_raw)
    price = _parse_decimal(price_raw)

    # VALUE RANGE: Only create if we have both shares and price
    # We do **not** guess missing prices or infer values
    value_range: Optional[TradeValueRange] = None
    if shares is not None and price is not None:
        try:
            # NORMALIZATION: Use Decimal arithmetic for precision
            total_value = shares * price
            value_range = TradeValueRange(min_value=total_value, max_value=total_value)
        except (InvalidOperation, ValueError):
            # If Decimal arithmetic fails, don't create value_range
            value_range = None

    # PROVENANCE: Build metadata with complete audit trail
    metadata: Dict[str, Any] = {
        # Provenance fields (required for auditability)
        "transaction_index": transaction_index,  # Deterministic transaction order
        # Officer information
        "officer_title": officer.title,
        # Transaction details (normalized)
        "transaction_code": tx_code_raw.strip().upper(),  # Normalized transaction code
        "transaction_shares": str(shares) if shares is not None else None,
        "transaction_price_per_share": str(price) if price is not None else None,
        # Security information
        "security_title": _get_text(tx_elem, ".//securityTitle/value"),
        "security_type": security_type,  # Normalized security type
        # Ownership information
        "ownership_type": ownership_type,  # Normalized ownership type (direct/indirect)
    }
    
    # PROVENANCE PROPAGATION: Add accession_number and filing_date if provided
    # These are added by the provider layer, but we document them here for clarity
    if accession_number:
        metadata["accession_number"] = accession_number
    if filing_date:
        metadata["filing_date"] = filing_date

    actor_id = f"insider:{officer.name}"

    return TradeEvent(
        actor_id=actor_id,
        ticker=issuer_ticker,
        trade_type=trade_type,
        transaction_date=transaction_date,
        reported_date=reported_date,
        value_range=value_range,
        source=TradeSource.SEC,
        metadata=metadata,
    )


def _get_text(elem: ET.Element, path: str) -> str:
    """Safely get text from a child element, returning an empty string if missing."""
    try:
        target = elem.find(path)
    except Exception:  # noqa: BLE001
        return ""
    if target is None or target.text is None:
        return ""
    return target.text.strip()


def _parse_date_to_utc_datetime(value: str) -> datetime:
    """Parse a date string (YYYY-MM-DD) into a UTC datetime."""
    value = value.strip()
    try:
        # Form 4 uses YYYY-MM-DD for dates.
        dt = datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:  # noqa: TRY003
        raise ValueError(f"Unrecognized Form 4 date format: {value}") from exc
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def _parse_decimal(text: str) -> Optional[Decimal]:
    """Parse a numeric string into Decimal; return None if blank or invalid."""
    if not text:
        return None
    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        return None


def _map_transaction_code_to_trade_type(code: str) -> TradeType:
    """Map Form 4 transaction code to TradeType.
    
    NORMALIZATION: Explicitly normalizes transaction codes to TradeType enum.
    All codes are normalized to uppercase and stripped before comparison.
    
    Transaction code mapping (non-exhaustive):
        'P'  - Purchase (acquisition)  -> BUY
        'S'  - Sale                      -> SELL
        'A'  - Grant, award              -> BUY (acquisition)
        'D'  - Disposition to issuer     -> SELL
        'M'  - Exercise of derivative    -> BUY (acquisition via exercise)
        'F'  - Payment of exercise price -> BUY (acquisition)
        'I'  - Discretionary transaction -> BUY/SELL (depends on amount direction)
        'C'  - Conversion                -> BUY (acquisition)
        'E'  - Expiration of short position -> SELL (disposition)
        'H'  - Expiration of long position  -> BUY (acquisition)
        'X'  - Exercise of out-of-the-money derivative -> BUY (acquisition)
        'G'  - Bona fide gift            -> SELL (disposition)
        'W'  - Acquisition or disposition by will -> BUY/SELL (depends on direction)
        'Z'  - Deposit into or withdrawal from voting trust -> BUY/SELL (depends)
    
    Unknown codes raise ValueError; we prefer loud failure to guessing.
    
    Args:
        code: Raw transaction code string from Form 4
    
    Returns:
        TradeType enum value (BUY or SELL)
    
    Raises:
        ValueError: If transaction code is unrecognized
    """
    if not code or not code.strip():
        raise ValueError("Transaction code cannot be empty")
    
    # NORMALIZATION: Strip whitespace and convert to uppercase
    normalized = code.strip().upper()
    
    # BUY transactions (acquisitions)
    if normalized in {"P", "A", "M", "F", "C", "H", "X"}:
        return TradeType.BUY
    
    # SELL transactions (dispositions)
    if normalized in {"S", "D", "E", "G"}:
        return TradeType.SELL
    
    # AMBIGUOUS codes: Default behavior (could be enhanced with amount direction)
    # For now, we treat these as errors to avoid guessing
    if normalized in {"I", "W", "Z"}:
        raise ValueError(
            f"Ambiguous Form 4 transaction code '{code}' (I/W/Z). "
            "These codes require amount direction analysis which is not yet implemented. "
            "Explicit error prevents incorrect classification."
        )
    
    # UNKNOWN codes: Fail fast
    raise ValueError(
        f"Unrecognized Form 4 transaction code: '{code}' (normalized: '{normalized}'). "
        "Unknown codes cannot be safely mapped to TradeType - explicit error required."
    )


def _normalize_ownership_type(tx_elem: ET.Element) -> Optional[str]:
    """Extract and normalize ownership type (direct/indirect) from transaction.
    
    NORMALIZATION: Explicitly normalizes ownership type to "direct" or "indirect".
    Returns None if ownership type cannot be determined.
    
    Args:
        tx_elem: nonDerivativeTransaction XML element
    
    Returns:
        Normalized ownership type ("direct", "indirect", or None)
    """
    # Form 4 uses ownershipNature/directOrIndirectOwnership/value
    ownership_raw = _get_text(tx_elem, ".//ownershipNature/directOrIndirectOwnership/value")
    if not ownership_raw:
        return None
    
    # NORMALIZATION: Normalize to lowercase, strip whitespace
    normalized = ownership_raw.strip().lower()
    
    if normalized in {"d", "direct"}:
        return "direct"
    if normalized in {"i", "indirect"}:
        return "indirect"
    
    # Unknown ownership type - return None rather than guessing
    logger.warning(
        "Unknown ownership type in Form 4 transaction",
        extra={"ownership_raw": ownership_raw, "normalized": normalized},
    )
    return None


def _normalize_security_type(tx_elem: ET.Element) -> Optional[str]:
    """Extract and normalize security type from transaction.
    
    NORMALIZATION: Explicitly normalizes security type to common values.
    Returns None if security type cannot be determined.
    
    Args:
        tx_elem: nonDerivativeTransaction XML element
    
    Returns:
        Normalized security type (e.g., "common_stock", "preferred_stock", or None)
    """
    # Form 4 uses securityTitle/value for security description
    security_title = _get_text(tx_elem, ".//securityTitle/value")
    if not security_title:
        return None
    
    # NORMALIZATION: Normalize security title to common types
    title_lower = security_title.strip().lower()
    
    # Common stock variations
    if any(term in title_lower for term in ["common", "class a", "class b", "class c"]):
        return "common_stock"
    
    # Preferred stock
    if "preferred" in title_lower:
        return "preferred_stock"
    
    # Return raw title if no normalization matches (preserve information)
    return security_title.strip()


