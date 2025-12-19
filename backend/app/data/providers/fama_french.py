"""Fama-French factor data provider.

This module downloads and parses official Fama-French factor datasets from
Kenneth French's Data Library at Dartmouth.

IMPORTANT: This uses official academic datasets. All factor definitions follow
Fama-French methodology exactly as published.

PERSISTENCE (Phase 10.1): If storage is provided, raw factor data is stored and
reused to avoid refetching identical data on every request.
"""

import io
import json
import re
from datetime import date
from typing import Optional
from urllib.request import urlopen
from zipfile import ZipFile

from app.core.exceptions import BadRequestError, ProviderUnavailableError
from app.core.logging import get_logger
from app.data.models.factors import FactorBar, FactorSeries, FactorSeriesMetadata
from app.data.persistence import FileStorage, make_storage_key

logger = get_logger(__name__)

# Official Fama-French data URLs
FAMA_FRENCH_DAILY_FACTORS_URL = "http://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_Factors_daily.zip"
FAMA_FRENCH_DAILY_FACTORS_DATASET_NAME = "F-F_Research_Data_Factors_daily"


def _parse_fama_french_daily_file(content: str) -> list[FactorBar]:
    """
    Parse Fama-French daily factors text file.
    
    Format:
    - Header lines (skip until we find date-like lines)
    - Data lines: YYYYMMDD Mkt-RF SMB HML RF (space or tab separated)
    - Returns are in percentage format (e.g., 0.05 = 5%), convert to decimal
    
    Args:
        content: Raw text content of the factors file
        
    Returns:
        List of FactorBar objects
    """
    lines = content.strip().split("\n")
    bars: list[FactorBar] = []
    
    # Skip header lines - look for first line that starts with a date (8 digits)
    data_started = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if this is a data line (starts with 8 digits = YYYYMMDD)
        if re.match(r"^\d{8}", line):
            data_started = True
            
            # Parse the line - can be space or tab separated
            parts = re.split(r"\s+", line)
            if len(parts) < 5:
                continue  # Skip malformed lines
            
            try:
                date_str = parts[0]
                year = int(date_str[:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                trading_date = date(year, month, day)
                
                # Parse factor returns (in percentage, convert to decimal)
                market_excess_return = float(parts[1]) / 100.0
                smb = float(parts[2]) / 100.0
                hml = float(parts[3]) / 100.0
                risk_free_rate = float(parts[4]) / 100.0
                
                bars.append(
                    FactorBar(
                        trading_date=trading_date,
                        market_excess_return=market_excess_return,
                        smb=smb,
                        hml=hml,
                        risk_free_rate=risk_free_rate,
                    )
                )
            except (ValueError, IndexError) as e:
                logger.warning(f"Skipping malformed line in Fama-French data: {line[:50]}... Error: {str(e)}")
                continue
        elif data_started:
            # If we've started parsing data and hit a non-data line, might be end of data
            # But continue in case there are comments/notes
            continue
    
    return bars


def _download_fama_french_daily() -> str:
    """
    Download Fama-French daily factors ZIP file and extract the text file.
    
    Returns:
        Content of the factors text file as string
        
    Raises:
        BadRequestError: If download or extraction fails
    """
    try:
        logger.info("Downloading Fama-French daily factors from official source")
        
        # Download ZIP file
        with urlopen(FAMA_FRENCH_DAILY_FACTORS_URL, timeout=30) as response:
            zip_content = response.read()
        
        # Extract text file from ZIP
        with ZipFile(io.BytesIO(zip_content)) as zip_file:
            # Find the .txt file in the ZIP
            txt_files = [f for f in zip_file.namelist() if f.endswith(".txt")]
            if not txt_files:
                raise BadRequestError("Fama-French ZIP file does not contain a .txt file")
            
            # Read the first .txt file (should be the factors file)
            with zip_file.open(txt_files[0]) as txt_file:
                content = txt_file.read().decode("utf-8", errors="ignore")
        
        logger.info(f"Successfully downloaded and extracted Fama-French factors file ({len(content)} bytes)")
        return content
        
    except Exception as e:
        # PROVIDER CONTRACT: Distinguish network errors (provider outage) from other errors
        error_msg = str(e).lower()
        error_type = type(e).__name__
        
        # Network/connection errors indicate provider outage
        if any(pattern in error_msg for pattern in ["connection", "timeout", "network", "unreachable", "dns", "urlerror"]):
            raise ProviderUnavailableError(
                f"Fama-French data source is unreachable: {str(e)}",
                provider_name="fama_french",
                context={"error_type": error_type, "url": FAMA_FRENCH_DAILY_FACTORS_URL},
            )
        
        # Other errors (parsing, invalid response, etc.) become BadRequestError
        raise BadRequestError(
            f"Failed to download Fama-French factor data: {str(e)}",
            context={"error_type": error_type, "url": FAMA_FRENCH_DAILY_FACTORS_URL},
        )


def get_fama_french_daily_factors(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    cache_content: Optional[str] = None,
    storage: Optional[FileStorage] = None,
) -> FactorSeries:
    """
    Get Fama-French daily factor returns.
    
    Downloads official 3-factor model data from Ken French Data Library:
    - Market excess return (MKT-RF)
    - Small Minus Big (SMB)
    - High Minus Low (HML)
    - Risk-free rate (RF)
    
    REPLAY MODE (Historical Analytics Stability):
    - Once persisted data exists for a date range, it is ALWAYS used
    - Never refetches upstream data for past dates that are already stored
    - Same historical request today vs later → identical results
    - No upstream drift affects past analytics
    
    PERSISTENCE (Phase 10.1): If storage is provided, raw factor data is stored and
    reused to avoid refetching identical data on every request.
    
    Args:
        start_date: Optional start date filter (inclusive)
        end_date: Optional end date filter (inclusive)
        cache_content: Optional cached file content (for testing/performance)
        storage: Optional file storage for persisting raw factor data
        
    Returns:
        FactorSeries with all factor bars and metadata
        
    Raises:
        BadRequestError: If download, parsing, or filtering fails
    """
    # REPLAY MODE: Check storage first - if persisted data exists, use it
    # This ensures historical analytics never change once data is persisted
    # Storage key is deterministic: dataset name + date range (same inputs → same key)
    storage_key = make_storage_key(
        "fama_french",
        dataset="daily_factors",
        start=start_date.isoformat() if start_date else "all",
        end=end_date.isoformat() if end_date else "all",
    )
    
    if storage and storage.exists(storage_key):
        # PERSISTENCE: Read-through behavior - load from storage if available
        # VALIDATION: Loaded data must pass same validation as fresh data
        try:
            stored_data = storage.read(storage_key)
            factor_data = json.loads(stored_data.decode("utf-8"))
            
            # VALIDATION: Ensure stored data has required structure (same as fresh data)
            if not isinstance(factor_data, dict) or "bars" not in factor_data or "metadata" not in factor_data:
                raise BadRequestError(
                    "Stored Fama-French factor data has invalid structure. "
                    "Expected dict with 'bars' and 'metadata' keys.",
                    context={"start": str(start_date), "end": str(end_date)},
                )
            
            # Reconstruct FactorSeries from stored data (Pydantic validation happens here)
            bars = [FactorBar(**bar) for bar in factor_data["bars"]]
            metadata = FactorSeriesMetadata(**factor_data["metadata"])
            
            # VALIDATION: Ensure bars list is not empty (same validation as fresh data)
            if not bars:
                raise BadRequestError("Stored Fama-French factor data contains no bars.")
            
            # Filter by date range if specified (same as fresh data)
            if start_date is not None:
                bars = [b for b in bars if b.trading_date >= start_date]
            
            if end_date is not None:
                bars = [b for b in bars if b.trading_date <= end_date]
            
            if not bars:
                raise BadRequestError(
                    f"No factor data available for date range {start_date} to {end_date}"
                )
            
            # Sort by date to ensure chronological order (same as fresh data)
            bars.sort(key=lambda b: b.trading_date)
            
            # REPLAY MODE: Return persisted data - ensures historical analytics stability
            # Same historical request today vs later → identical results
            # No upstream drift affects past analytics
            logger.info(
                "Loaded Fama-French factors from persistence (replay mode)",
                extra={
                    "start": str(start_date),
                    "end": str(end_date),
                    "source": "storage",
                    "bars_count": len(bars),
                    "replay_mode": True,
                },
            )
            return FactorSeries(bars=bars, metadata=metadata)
        except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError) as exc:
            # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
            # Identical invalid requests must produce identical errors for frontend stability
            raise BadRequestError(
                "Fama-French factor data is corrupted or invalid.",
                context={"start": str(start_date), "end": str(end_date), "error": str(exc)},
            ) from exc
    
    # FAILURE RECOVERY: If persisted data doesn't exist, attempt fresh fetch
    # If fresh fetch fails, check persisted data again as fallback
    # This ensures predictable behavior during outages
    
    # LOGGING DISCIPLINE: Log once when fetching fresh data (request_id added automatically)
    logger.info(
        "Fetching Fama-French factors from upstream",
        extra={"start": str(start_date), "end": str(end_date), "source": "upstream"},
    )
    
    # Download or use cached content
    try:
        if cache_content is None:
            content = _download_fama_french_daily()
        else:
            content = cache_content
    except (ProviderUnavailableError, BadRequestError) as exc:
        # FAILURE RECOVERY: If upstream fetch fails, check persisted data as fallback
        # This ensures predictable behavior during outages
        # Rule: If persisted data exists → use it, if not → fail with explicit error
        
        # Check if persisted data exists as fallback
        if storage and storage.exists(storage_key):
            # FALLBACK RULE: Persisted data exists → use it (cached replay during outage)
            logger.warning(
                "Fama-French upstream fetch failed, using persisted data as fallback (cached replay)",
                extra={
                    "start": str(start_date),
                    "end": str(end_date),
                    "source": "storage_fallback",
                    "upstream_error": str(exc),
                    "error_type": type(exc).__name__,
                    "failure_recovery": True,
                },
            )
            
            # Load persisted data (same validation as normal replay mode)
            try:
                stored_data = storage.read(storage_key)
                factor_data = json.loads(stored_data.decode("utf-8"))
                
                # VALIDATION: Ensure stored data has required structure
                if not isinstance(factor_data, dict) or "bars" not in factor_data or "metadata" not in factor_data:
                    raise BadRequestError(
                        "Stored Fama-French factor data has invalid structure. "
                        "Expected dict with 'bars' and 'metadata' keys.",
                        context={"start": str(start_date), "end": str(end_date)},
                    )
                
                # Reconstruct FactorSeries from stored data
                bars = [FactorBar(**bar) for bar in factor_data["bars"]]
                metadata = FactorSeriesMetadata(**factor_data["metadata"])
                
                # VALIDATION: Ensure bars list is not empty
                if not bars:
                    raise BadRequestError("Stored Fama-French factor data contains no bars.")
                
                # Filter by date range if specified
                if start_date is not None:
                    bars = [b for b in bars if b.trading_date >= start_date]
                
                if end_date is not None:
                    bars = [b for b in bars if b.trading_date <= end_date]
                
                if not bars:
                    raise BadRequestError(
                        f"No factor data available for date range {start_date} to {end_date}"
                    )
                
                # Sort by date to ensure chronological order
                bars.sort(key=lambda b: b.trading_date)
                
                # Return persisted data (cached replay during outage)
                return FactorSeries(bars=bars, metadata=metadata)
            except (json.JSONDecodeError, UnicodeDecodeError, KeyError, TypeError) as storage_exc:
                # ERROR DETERMINISM (Phase 11.3): Same corrupted data always produces same error
                # Identical invalid requests must produce identical errors for frontend stability
                raise BadRequestError(
                    "Fama-French factor data is corrupted or invalid.",
                    context={
                        "start": str(start_date),
                        "end": str(end_date),
                        "upstream_error": str(exc),
                        "storage_error": str(storage_exc),
                    },
                ) from storage_exc
        else:
            # ERROR DETERMINISM (Phase 11.3): Same failure always produces same error
            # Identical invalid requests must produce identical errors for frontend stability
            # Re-raise original error with consistent context (no fallback messaging)
            if isinstance(exc, ProviderUnavailableError):
                raise ProviderUnavailableError(
                    exc.message,
                    provider_name=exc.context.get("provider_name", "fama_french") if exc.context else "fama_french",
                    context=exc.context or {},
                ) from exc
            else:  # BadRequestError
                raise BadRequestError(
                    exc.message,
                    context=exc.context or {},
                ) from exc
    
    # Parse factor bars
    bars = _parse_fama_french_daily_file(content)
    
    if not bars:
        raise BadRequestError("No factor data found in Fama-French dataset")
    
    # Filter by date range if specified
    if start_date is not None:
        bars = [b for b in bars if b.trading_date >= start_date]
    
    if end_date is not None:
        bars = [b for b in bars if b.trading_date <= end_date]
    
    if not bars:
        raise BadRequestError(
            f"No factor data available for date range {start_date} to {end_date}"
        )
    
    # Sort by date to ensure chronological order
    bars.sort(key=lambda b: b.trading_date)
    
    # Build metadata
    metadata = FactorSeriesMetadata(
        source="fama_french",
        dataset_name=FAMA_FRENCH_DAILY_FACTORS_DATASET_NAME,
        frequency="daily",
        factors_included=["MKT-RF", "SMB", "HML", "RF"],
        start_date=bars[0].trading_date,
        end_date=bars[-1].trading_date,
    )
    
    factor_series = FactorSeries(bars=bars, metadata=metadata)
    
    # REPLAY MODE: Store raw factor data after successful download/parse
    # GUARDRAIL: Only write if data doesn't exist (never overwrite historical data)
    # This ensures historical analytics remain stable - once persisted, never changed
    if storage:
        # GUARDRAIL: Check if data already exists before writing
        # Never overwrite historical data - this would break replay guarantees
        if not storage.exists(storage_key):
            try:
                # Store as JSON for easy reconstruction
                factor_data = {
                    "bars": [bar.model_dump() for bar in bars],
                    "metadata": metadata.model_dump(),
                }
                stored_data = json.dumps(factor_data, sort_keys=True, default=str).encode("utf-8")
                storage.write(storage_key, stored_data)
                logger.debug(
                    "Stored Fama-French factors to persistence",
                    extra={"start": str(start_date), "end": str(end_date)},
                )
            except Exception as exc:  # noqa: BLE001
                # Log storage failure but don't fail the request
                logger.warning(
                    "Failed to store Fama-French factors",
                    extra={"start": str(start_date), "end": str(end_date), "error": str(exc)},
                )
        else:
            # REPLAY MODE: Data already exists - log but don't overwrite
            logger.debug(
                "Fama-French factors already persisted (replay mode - not overwriting)",
                extra={"start": str(start_date), "end": str(end_date)},
            )
    
    logger.info(
        f"Loaded Fama-French factors",
        extra={
            "num_bars": len(bars),
            "start_date": str(metadata.start_date),
            "end_date": str(metadata.end_date),
        },
    )
    
    return factor_series


def get_factor_series(
    start_date: date,
    end_date: date,
    storage: Optional[FileStorage] = None,
) -> FactorSeries:
    """
    Get factor return series for a specific date range.
    
    WITHIN-REQUEST MEMOIZATION: Same provider call within a request → single execution.
    This prevents accidental abuse of upstream providers.
    
    This is the main entry point for factor data retrieval.
    It ensures dates align with portfolio return series requirements.
    
    PERSISTENCE (Phase 10.1): If storage is provided, raw factor data is stored and
    reused to avoid refetching identical data on every request.
    
    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        storage: Optional file storage for persisting raw factor data
        
    Returns:
        FactorSeries filtered to the specified date range
        
    Raises:
        BadRequestError: If data unavailable or date range invalid
    """
    if start_date >= end_date:
        raise BadRequestError("start_date must be before end_date")
    
    # WITHIN-REQUEST MEMOIZATION: Check if this exact call was already made in this request
    # This prevents duplicate provider calls within the same request
    from app.core.memoization import get_request_cache
    
    cache_key = f"fama_french:factor_series:{start_date.isoformat()}:{end_date.isoformat()}"
    cache = get_request_cache()
    
    if cache_key in cache:
        logger.debug(
            "Using memoized factor series (within-request cache hit)",
            extra={"start_date": str(start_date), "end_date": str(end_date)},
        )
        return cache[cache_key]
    
    # Continue with normal execution (will cache result at end)
    result = get_fama_french_daily_factors(
        start_date=start_date,
        end_date=end_date,
        storage=storage,
    )
    
    # Cache result for within-request memoization
    cache[cache_key] = result
    
    return result

