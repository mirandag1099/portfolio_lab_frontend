# **PHASE 8 — BETA HARDENING (ENGINEERING REALITY CHECK)**

**Purpose:**  
 Make the existing system *correct, reliable, auditable, and safe* — not more powerful.

This phase does **not** add new analytics or UX.

---

## **8.1 Determinism & Correctness Lock**

**What this phase guarantees**

* Every result shown on the frontend is:

  * Deterministically computed

  * Reproducible

  * Explainable

* No hidden randomness

* No silent assumptions

**Backend Engineering (Cursor-safe)**

* Lock Monte Carlo seed handling

* Enforce strict input validation

* Enforce strict output schemas

* Fail hard on:

  * Missing prices

  * Missing factor data

  * Partial time ranges

* Remove any “best-effort” logic

**Checkpoint**

* Same inputs → identical outputs across runs

* Snapshot tests for:

  * Performance

  * Factor attribution

  * Stress tests

---

## **8.2 Error Visibility & Observability**

**What this phase guarantees**

* The system never lies by omission

* Errors are visible, structured, and traceable

**Backend Engineering (Cursor-safe)**

* Structured error taxonomy

* Mandatory `ErrorResponse` envelopes

* Request IDs propagated through stack

* No try/catch swallowing

**Outside Cursor**

* Logging infrastructure

* Error tracking (Sentry-class)

**Checkpoint**

* Induced failures show up:

  * In logs

  * In error dashboards

  * On frontend (using existing UI)

---

## **8.3 Data Source Hardening (Pre-EDGAR Expansion)**

**What this phase guarantees**

* Current data sources behave predictably

* Quiver is explicitly non-authoritative

**Backend Engineering**

* Feature-flag Quiver

* Mark Quiver outputs with provenance

* Add guards so Quiver cannot be required

**Checkpoint**

* System still functions with Quiver disabled (where EDGAR exists)

* Provenance visible in internal objects

---

# **PHASE 9 — EDGAR FIRST-CLASS INGESTION (QUIVER REPLACEMENT TRACK)**

**Purpose:**  
 Replace dependency on Quiver-style abstraction with **transparent, auditable EDGAR ingestion**.

This is *infrastructure*, not a new feature.

---

## **9.1 EDGAR Ingestion Layer**

**Backend Engineering**

* Pull from SEC `data.sec.gov`

* Respect rate limits and headers

* Persist:

  * Raw filings

  * Metadata

* Maintain ingestion logs

**Outside Cursor**

* SEC compliance review (rate limits, headers)

* Infra for scheduled ingestion

**Checkpoint**

* Raw Form 4 retrievable for any normalized trade

* No data without source reference

---

## **9.2 Form 4 Parsing & Normalization**

**Backend Engineering**

* Parse:

  * XML filings

  * Legacy text filings

* Extract:

  * Transaction codes

  * Prices, shares

  * Derivative vs common

  * Direct vs indirect ownership

**Constraints**

* No inference beyond filing text

* No sentiment or “intent”

**Checkpoint**

* Parsed output matches filing line-by-line

* Edge cases flagged, not patched

---

## **9.3 Amendments, Deduplication, Versioning**

**Backend Engineering**

* Detect Form 4/A

* Version filings instead of overwriting

* Expose only latest version to analytics

**Checkpoint**

* Amendment does not erase history

* Audit trail preserved

---

## **9.4 Internal Trade Schema Finalization**

**Backend Engineering**

* Finalize normalized schema:

  * Insider

  * Company

  * Transaction

  * Filing

  * Provenance

* Schema versioning

**Checkpoint**

* Schema frozen

* Backward compatibility guaranteed

---

# **PHASE 10 — PERSISTENCE & REPRODUCIBILITY**

**Purpose:**  
 Make the platform *stateful, durable, and replayable*.

---

## **10.1 Persistence Layer**

**Backend Engineering**

* Persist:

  * User portfolio inputs

  * Cached prices

  * Cached factors

  * Normalized trades

  * Computed outputs (immutable)

**Outside Cursor**

* Database selection & provisioning

* Backups & retention policies

**Checkpoint**

* Historical results never mutate

* Re-running analytics yields same outputs

---

## **10.2 Result Versioning**

**Backend Engineering**

* Tag outputs with:

  * Data versions

  * Computation versions

* Expose metadata to frontend (already-designed slots only)

**Checkpoint**

* Old results remain interpretable after backend updates

---

# **PHASE 11 — FRONTEND OPERATIONAL READINESS (NO UX CHANGES)**

**Purpose:**  
 Make the existing Lovable frontend safe to run publicly.

---

## **11.1 Deployment & Environment Wiring**

**Engineering**

* Deterministic builds

* Environment separation (dev / staging / prod)

* Backend URL configuration

**Outside Cursor**

* Hosting (Vercel / equivalent)

* CDN

* TLS / domain

**Checkpoint**

* Clean deploy from scratch

* No hardcoded endpoints

---

## **11.2 Stability & Abuse Controls**

**Outside Cursor**

* Rate limiting

* WAF / bot protection

* Auth provider (if required by existing UX)

**Checkpoint**

* Load tests

* Graceful degradation

---

# **PHASE 12 — AI INTERPRETATION LOCKDOWN**

**Purpose:**  
 Ensure AI never exceeds its mandate.

---

## **12.1 AI Safety Hardening**

**Backend Engineering**

* AI agents consume **only** backend dicts

* Template-driven explanations

* Mandatory uncertainty & limitation sections

**Checkpoint**

* Adversarial prompts produce no predictions

* No action language leaks

---

# **PHASE 13 — PRE-LAUNCH AUDIT & GO-LIVE**

**Purpose:**  
 Decide “yes, this can be public.”

---

## **13.1 Final Audits**

**Engineering**

* Determinism audit

* Error audit

* Data provenance audit

**Outside Cursor**

* Legal / disclaimer review

* Security review

---

## **13.2 Launch**

**Definition of Done**

* Public URL

* Stable backend

* Frozen UX

* Transparent data

* Honest failures

* No forbidden language

* No roadmap smuggled in

---

## **FINAL STATE**

At the end of Phase 13:

* PortfolioLab is **live**

* It is an **analytics platform**, not a trading tool

* Every number is defensible

* Every limitation is explicit

* Every dependency is intentional

