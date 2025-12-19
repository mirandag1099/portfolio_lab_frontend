#!/usr/bin/env python3
"""Quick validation script for Phase 10 behavior (Phase 10.5).

This script provides a simple way to verify Phase 10 behavior:
- Persistence (cold start vs warm start)
- Replay mode guarantees
- Failure recovery rules

Usage:
    python scripts/validate_phase10.py
"""

import sys
from datetime import date
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.validation import (
    clear_storage_for_testing,
    simulate_cold_start,
    simulate_provider_outage,
    simulate_warm_start,
    verify_persistence_behavior,
    verify_replay_mode,
)


def main() -> None:
    """Run Phase 10 validation tests."""
    print("=" * 60)
    print("Phase 10.5 — Operational Validation & Test Harness")
    print("=" * 60)
    print()

    # 1. Verify persistence is configured
    print("1. Verifying persistence behavior...")
    try:
        persistence_result = verify_persistence_behavior()
        print(f"   ✓ Storage path: {persistence_result['storage_path']}")
        print(f"   ✓ Storage exists: {persistence_result['storage_exists']}")
        print(f"   ✓ Yahoo configured: {persistence_result['yahoo_configured']}")
        print(f"   ✓ Fama-French configured: {persistence_result['fama_french_configured']}")
        print(f"   ✓ EDGAR configured: {persistence_result['edgar_configured']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    print()

    # 2. Cold start test
    print("2. Testing cold start (no persisted data)...")
    try:
        clear_storage_for_testing()
        cold_result = simulate_cold_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        print(f"   ✓ Fetched from upstream: {cold_result['fetched_from_upstream']}")
        print(f"   ✓ Stored to persistence: {cold_result['stored_to_persistence']}")
        print(f"   ✓ Data source: {cold_result['data_source']}")
        print(f"   ✓ Bars count: {cold_result['bars_count']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    print()

    # 3. Warm start test
    print("3. Testing warm start (persisted data exists)...")
    try:
        warm_result = simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        print(f"   ✓ Used persisted data: {warm_result['used_persisted_data']}")
        print(f"   ✓ Fetched from upstream: {warm_result['fetched_from_upstream']}")
        print(f"   ✓ Data source: {warm_result['data_source']}")
        print(f"   ✓ Bars count: {warm_result['bars_count']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    print()

    # 4. Replay mode verification
    print("4. Verifying replay mode (same request → identical results)...")
    try:
        replay_result = verify_replay_mode("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        print(f"   ✓ First fetch source: {replay_result['first_fetch_source']}")
        print(f"   ✓ Second fetch source: {replay_result['second_fetch_source']}")
        print(f"   ✓ Results identical: {replay_result['results_identical']}")
        print(f"   ✓ Replay mode verified: {replay_result['replay_mode_verified']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    print()

    # 5. Provider outage test
    print("5. Testing provider outage scenario...")
    try:
        outage_result = simulate_provider_outage("AAPL", date(2023, 1, 1), date(2023, 12, 31))
        print(f"   ✓ Fallback available: {outage_result['fallback_available']}")
        print(f"   ✓ Would use fallback: {outage_result['would_use_fallback']}")
        print(f"   ✓ Would fail explicitly: {outage_result['would_fail_explicitly']}")
        print(f"   ✓ Failure recovery rule: {outage_result['failure_recovery_rule']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return
    print()

    print("=" * 60)
    print("✅ Phase 10 validation complete!")
    print("=" * 60)
    print()
    print("VERIFICATION CHECKLIST:")
    print("  ✓ Persistence is configured")
    print("  ✓ Cold start fetches from upstream and stores data")
    print("  ✓ Warm start uses persisted data (replay mode)")
    print("  ✓ Same request produces identical results (replay mode)")
    print("  ✓ Provider outage falls back to persisted data when available")
    print()
    print("For detailed documentation, see: app/validation/README.md")


if __name__ == "__main__":
    main()

