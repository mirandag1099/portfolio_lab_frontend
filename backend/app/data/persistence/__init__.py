"""Persistence layer for raw upstream data (Phase 10.1).

This module provides file-based storage for raw data to avoid refetching
identical data on every request. Storage is internal only and does not
change API outputs.

REPLAY MODE (Historical Analytics Stability):
- Once persisted data exists for a date range, it is ALWAYS used
- Never overwrites existing data (ensures historical analytics remain stable)
- Same historical request today vs later → identical results
- No upstream drift affects past analytics

REPLAYABILITY: Storage keys are deterministic (CIK, accession, ticker, date range)
to ensure the same inputs always map to the same storage location.

NO SILENT FALLBACK: If stored data is corrupted, an explicit error is raised.
Never silently refetch over bad data.

NOTE: Current implementation uses exact date range matching. If a user requests
a range that partially overlaps with stored data, the entire range will be
fetched (not just missing segments). This ensures simplicity and correctness
at the cost of potentially redundant fetches for partial overlaps.
"""

from app.data.persistence.storage import FileStorage, StorageInterface

__all__ = ["FileStorage", "StorageInterface"]

