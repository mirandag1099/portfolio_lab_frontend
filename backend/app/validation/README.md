# Phase 10.5 — Operational Validation & Test Harness

This module provides simple validation hooks to verify Phase 10 behavior:
- **Persistence** (cold start vs warm start)
- **Replay mode** guarantees
- **Failure recovery** rules
- **Rate discipline**

## Manual Verification Path

### 1. Cold Start Test

Simulates a scenario where no persisted data exists.

```python
from app.validation import simulate_cold_start
from datetime import date

# Clear storage and test cold start
result = simulate_cold_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))

# Verify:
# - fetched_from_upstream == True
# - stored_to_persistence == True
# - data_source == "upstream"
```

**Expected Behavior:**
- Provider fetches from upstream (Yahoo Finance)
- Data is stored to persistence
- Logs show `source: "upstream"`

### 2. Warm Start Test

Simulates a scenario where persisted data exists.

```python
from app.validation import simulate_warm_start
from datetime import date

# Test warm start (data should already be persisted from cold start test)
result = simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))

# Verify:
# - used_persisted_data == True
# - fetched_from_upstream == False
# - data_source == "storage"
```

**Expected Behavior:**
- Provider uses persisted data (replay mode)
- No upstream fetch occurs
- Logs show `source: "storage"` and `replay_mode: True`

### 3. Replay Mode Verification

Verifies that same historical request produces identical results.

```python
from app.validation import verify_replay_mode
from datetime import date

# Verify replay mode guarantees
result = verify_replay_mode("AAPL", date(2023, 1, 1), date(2023, 12, 31))

# Verify:
# - first_fetch_source == "upstream" or "storage"
# - second_fetch_source == "storage"
# - results_identical == True
# - replay_mode_verified == True
```

**Expected Behavior:**
- First fetch may use upstream or storage
- Second fetch always uses storage (replay mode)
- Results are bit-for-bit identical
- Same historical request → identical results

### 4. Provider Outage Test

Simulates provider outage scenario.

```python
from app.validation import simulate_provider_outage, simulate_warm_start
from datetime import date

# First ensure data is persisted
simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))

# Then test outage scenario
result = simulate_provider_outage("AAPL", date(2023, 1, 1), date(2023, 12, 31))

# Verify:
# - fallback_available == True
# - would_use_fallback == True
# - failure_recovery_rule == "Use persisted data (cached replay during outage)"
```

**Expected Behavior:**
- If persisted data exists → use it (cached replay during outage)
- If persisted data doesn't exist → fail with explicit error
- Logs show `source: "storage_fallback"` and `failure_recovery: True`

### 5. Persistence Behavior Verification

Verifies persistence is configured for all providers.

```python
from app.validation import verify_persistence_behavior

result = verify_persistence_behavior()

# Verify:
# - yahoo_configured == True
# - fama_french_configured == True
# - edgar_configured == True
# - storage_exists == True
```

## How to Verify Replay & Persistence

### Replay Mode Verification

1. **First Request (Cold Start):**
   ```python
   result = simulate_cold_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```
   - Should fetch from upstream
   - Should store to persistence
   - Logs: `source: "upstream"`

2. **Second Request (Warm Start):**
   ```python
   result = simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```
   - Should use persisted data
   - Should NOT fetch from upstream
   - Logs: `source: "storage"`, `replay_mode: True`

3. **Replay Mode Verification:**
   ```python
   result = verify_replay_mode("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```
   - Should produce identical results
   - Second fetch should use storage
   - `replay_mode_verified == True`

### Persistence Verification

1. **Check Storage Directory:**
   ```bash
   ls -la .data/yahoo/
   ls -la .data/fama_french/
   ls -la .data/edgar/
   ```

2. **Verify Storage Keys:**
   - Keys are deterministic (same inputs → same key)
   - Keys are hashed (SHA256) for safe filenames
   - Data is stored as-is (raw bytes)

3. **Verify No Overwriting:**
   - First fetch stores data
   - Second fetch uses stored data (doesn't overwrite)
   - Logs show: "already persisted (replay mode - not overwriting)"

## Failure Recovery Verification

### Scenario 1: Persisted Data Exists, Upstream Fails

1. Ensure data is persisted:
   ```python
   simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```

2. Simulate outage:
   ```python
   result = simulate_provider_outage("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```

3. Verify:
   - `fallback_available == True`
   - `would_use_fallback == True`
   - Logs show: `source: "storage_fallback"`, `failure_recovery: True`

### Scenario 2: No Persisted Data, Upstream Fails

1. Clear storage:
   ```python
   from app.validation import clear_storage_for_testing
   clear_storage_for_testing()
   ```

2. Simulate outage:
   ```python
   result = simulate_provider_outage("AAPL", date(2023, 1, 1), date(2023, 12, 31))
   ```

3. Verify:
   - `fallback_available == False`
   - `would_fail_explicitly == True`
   - Error message includes: "No persisted data available as fallback"

## Rate Discipline Verification

Rate discipline is automatically logged when delays are applied:

- **EDGAR:** Logs `"EDGAR rate limit enforced - applying delay"` with `rate_discipline: True`
- **Yahoo Finance:** Logs `"Yahoo Finance rate limit enforced - applying delay"` with `rate_discipline: True`

Check logs for:
- `rate_discipline: True`
- `delay_seconds: <value>`
- `max_calls` or `max_requests_per_second`

## Within-Request Memoization Verification

Within-request memoization prevents duplicate provider calls:

1. Make same provider call twice in same request
2. Check logs for: `"Using memoized result (within-request cache hit)"`
3. Verify only one upstream fetch occurs

## Quick Test Script

```python
#!/usr/bin/env python3
"""Quick validation script for Phase 10 behavior."""

from datetime import date
from app.validation import (
    clear_storage_for_testing,
    simulate_cold_start,
    simulate_warm_start,
    verify_replay_mode,
    verify_persistence_behavior,
)

# 1. Verify persistence is configured
print("1. Verifying persistence behavior...")
persistence_result = verify_persistence_behavior()
print(f"   Storage path: {persistence_result['storage_path']}")
print(f"   Storage exists: {persistence_result['storage_exists']}")

# 2. Cold start test
print("\n2. Testing cold start...")
cold_result = simulate_cold_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
print(f"   Fetched from upstream: {cold_result['fetched_from_upstream']}")
print(f"   Stored to persistence: {cold_result['stored_to_persistence']}")

# 3. Warm start test
print("\n3. Testing warm start...")
warm_result = simulate_warm_start("AAPL", date(2023, 1, 1), date(2023, 12, 31))
print(f"   Used persisted data: {warm_result['used_persisted_data']}")
print(f"   Data source: {warm_result['data_source']}")

# 4. Replay mode verification
print("\n4. Verifying replay mode...")
replay_result = verify_replay_mode("AAPL", date(2023, 1, 1), date(2023, 12, 31))
print(f"   First fetch source: {replay_result['first_fetch_source']}")
print(f"   Second fetch source: {replay_result['second_fetch_source']}")
print(f"   Results identical: {replay_result['results_identical']}")
print(f"   Replay mode verified: {replay_result['replay_mode_verified']}")

print("\n✅ Phase 10 validation complete!")
```

## Notes

- **No Test Framework Required:** These are simple functions for manual verification
- **Storage Path:** Configured via `DATA_STORAGE_PATH` (default: `.data`)
- **Logs:** All validation functions log results with request_id context
- **Deterministic:** Same inputs always produce same storage keys and results

