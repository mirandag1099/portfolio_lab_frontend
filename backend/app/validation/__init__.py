"""Operational validation and test harness for Phase 10 behavior (Phase 10.5).

This module provides simple validation hooks to verify:
- Persistence behavior (cold start vs warm start)
- Replay mode guarantees
- Failure recovery rules
- Rate discipline

NO TEST FRAMEWORK REQUIRED: Simple functions/flags for manual verification.
"""

from app.validation.phase10 import (
    clear_storage_for_testing,
    simulate_cold_start,
    simulate_provider_outage,
    simulate_warm_start,
    verify_persistence_behavior,
    verify_replay_mode,
)

__all__ = [
    "clear_storage_for_testing",
    "simulate_cold_start",
    "simulate_warm_start",
    "simulate_provider_outage",
    "verify_persistence_behavior",
    "verify_replay_mode",
]

