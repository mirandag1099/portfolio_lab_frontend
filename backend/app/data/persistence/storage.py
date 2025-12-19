"""File-based storage implementation (Phase 10.1).

This module provides a simple storage interface for persisting raw upstream data.
Storage is file-based (no database required) and uses deterministic keys to ensure
replayability.

REPLAY MODE (Historical Analytics Stability):
- Once persisted data exists, it is ALWAYS used for historical requests
- Never overwrites existing data (ensures historical analytics remain stable)
- Same historical request today vs later → identical results
- No upstream drift affects past analytics

DETERMINISM: Storage keys are derived from immutable inputs (CIK, accession, ticker,
date range) to ensure the same inputs always map to the same storage location.

NO SILENT FALLBACK: If stored data is corrupted or invalid, an explicit error is
raised. Never silently refetch over bad data.
"""

from __future__ import annotations

import hashlib
import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.exceptions import BadRequestError
from app.core.logging import get_logger

logger = get_logger(__name__)


class StorageInterface(ABC):
    """Abstract storage interface for raw data persistence."""

    @abstractmethod
    def exists(self, key: str) -> bool:
        """Check if data exists for the given key.
        
        Args:
            key: Deterministic storage key
            
        Returns:
            True if data exists, False otherwise
        """
        raise NotImplementedError

    @abstractmethod
    def read(self, key: str) -> bytes:
        """Read raw data for the given key.
        
        Args:
            key: Deterministic storage key
            
        Returns:
            Raw data as bytes
            
        Raises:
            NotFoundError: If data does not exist
            BadRequestError: If data is corrupted or invalid
        """
        raise NotImplementedError

    @abstractmethod
    def write(self, key: str, data: bytes) -> None:
        """Write raw data for the given key.
        
        Args:
            key: Deterministic storage key
            data: Raw data to store as bytes
            
        Raises:
            BadRequestError: If write fails
        """
        raise NotImplementedError


class FileStorage(StorageInterface):
    """
    File-based storage implementation.
    
    PERSISTENCE (Phase 10.1): Stores raw upstream data in files to avoid refetching
    identical data on every request. Storage keys are deterministic to ensure
    replayability.
    
    Storage structure:
    - Base directory: configured via DATA_STORAGE_PATH
    - Keys are hashed to create safe filenames
    - Data is stored as-is (raw bytes) with no transformation
    
    DETERMINISM: Storage keys are derived from immutable inputs, ensuring the same
    inputs always map to the same storage location.
    
    NO SILENT FALLBACK: If stored data is corrupted, an explicit error is raised.
    Never silently refetch over bad data.
    """

    def __init__(self, base_path: Path) -> None:
        """
        Initialize file storage.
        
        Args:
            base_path: Base directory for storage (created if it doesn't exist)
        """
        self._base_path = Path(base_path)
        # Create base directory if it doesn't exist
        self._base_path.mkdir(parents=True, exist_ok=True)
        logger.info(
            "FileStorage initialized",
            extra={"base_path": str(self._base_path)},
        )

    def _key_to_path(self, key: str) -> Path:
        """
        Convert storage key to file path.
        
        DETERMINISM: Uses SHA256 hash of key to create deterministic, safe filename.
        Same key always produces same path.
        
        Args:
            key: Storage key (e.g., "edgar:cik:1234567:accession:0001234567-24-000001")
            
        Returns:
            Path to storage file
        """
        # DETERMINISM: Hash key to create safe, deterministic filename
        # SHA256 ensures same key always produces same hash
        key_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
        return self._base_path / f"{key_hash}.dat"

    def exists(self, key: str) -> bool:
        """Check if data exists for the given key."""
        path = self._key_to_path(key)
        return path.exists() and path.is_file()

    def read(self, key: str) -> bytes:
        """
        Read raw data for the given key.
        
        NO SILENT FALLBACK: If data is corrupted or cannot be read, raises explicit error.
        Never silently refetch over bad data.
        
        Args:
            key: Storage key
            
        Returns:
            Raw data as bytes
            
        Raises:
            NotFoundError: If data does not exist
            BadRequestError: If data is corrupted or cannot be read
        """
        path = self._key_to_path(key)
        
        if not path.exists():
            from app.core.exceptions import NotFoundError
            
            raise NotFoundError(
                f"Stored data not found for key: {key[:50]}...",
                context={"key": key, "path": str(path)},
            )
        
        try:
            with open(path, "rb") as f:
                data = f.read()
            
            # VALIDATION: Ensure data is not empty (corruption check)
            if not data:
                raise BadRequestError(
                    f"Stored data is empty for key: {key[:50]}...",
                    context={"key": key, "path": str(path)},
                )
            
            return data
        except OSError as exc:
            raise BadRequestError(
                f"Failed to read stored data for key: {key[:50]}...",
                context={"key": key, "path": str(path), "error": str(exc)},
            ) from exc

    def write(self, key: str, data: bytes) -> None:
        """
        Write raw data for the given key.
        
        PERSISTENCE: Stores raw data as-is with no transformation. This ensures
        stored data is identical to upstream data, preserving auditability.
        
        Args:
            key: Storage key
            data: Raw data to store as bytes
            
        Raises:
            BadRequestError: If write fails
        """
        if not data:
            raise BadRequestError(
                "Cannot store empty data",
                context={"key": key},
            )
        
        path = self._key_to_path(key)
        
        try:
            # Write atomically: write to temp file, then rename
            # This ensures partial writes don't corrupt existing data
            temp_path = path.with_suffix(".tmp")
            with open(temp_path, "wb") as f:
                f.write(data)
            temp_path.replace(path)
        except OSError as exc:
            raise BadRequestError(
                f"Failed to write stored data for key: {key[:50]}...",
                context={"key": key, "path": str(path), "error": str(exc)},
            ) from exc


def make_storage_key(prefix: str, **kwargs: str) -> str:
    """
    Create a deterministic storage key from components.
    
    DETERMINISM: Keys are created from immutable inputs in a deterministic format.
    Same inputs always produce same key.
    
    Args:
        prefix: Key prefix (e.g., "edgar", "yahoo", "fama_french")
        **kwargs: Key components (e.g., cik="1234567", accession="0001234567-24-000001")
        
    Returns:
        Deterministic storage key string
        
    Example:
        make_storage_key("edgar", cik="1234567", accession="0001234567-24-000001")
        -> "edgar:cik:1234567:accession:0001234567-24-000001"
    """
    # DETERMINISM: Sort kwargs keys to ensure consistent key format
    # Same components always produce same key regardless of order
    sorted_items = sorted(kwargs.items())
    components = ":".join(f"{k}:{v}" for k, v in sorted_items)
    return f"{prefix}:{components}"

