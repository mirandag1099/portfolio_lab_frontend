# **This document is authoritative for all backend implementation**

# **PortfolioLab PRD v2.0**

**Status:** Authoritative replacement PRD (supersedes prior PRD.md)  
 **Last updated:** 2025-12-15  
 **Scope:** Backend-first platform for portfolio intelligence \+ observational trade tracking \+ safe AI interpretation  
 **Non-goal:** Predictions, trade instructions, “smart money” claims, or any implied causality

---

## **0\) Executive summary**

PortfolioLab is a retail-facing portfolio intelligence platform that:

1. Computes **trustworthy, deterministic** portfolio performance analytics from real market data.

2. Adds a second pillar: **observational trade & behavior tracking** from **public, time-delayed filings** (SEC EDGAR).

3. Adds an interpretation layer: **AI agents** that explain results **without inventing metrics, predicting returns, or giving advice**.

This PRD reflects **what is already implemented (Phases 1–7)** and **what remains (Phase 8 hardening \+ future improvements)**.

---

## **1\) Product principles and non-negotiables**

### **1.1 Non-negotiables (hard constraints)**

* **No predictions.**  
   Not in metrics, factor analysis, Monte Carlo, trade tracking, or AI output.

* **No trade instructions / recommendations.**  
   No “buy/sell/hold”, no “you should”, no portfolio changes suggested as advice.

* **No fabricated or mock financial data.**  
   If the data source is unavailable, we return explicit errors or empty datasets with coverage metadata.

* **All numbers must be explainable.**  
   Every output must trace back to a deterministic calculation and a cited data source.

* **Backend owns correctness.**  
   Frontend displays results; backend validates, normalizes, computes, and returns metadata \+ assumptions.

* **Explicit assumptions always.**  
   E.g., adjusted prices usage, trading days/year, risk-free assumption, Monte Carlo methodology.

### **1.2 “Truth hierarchy”**

1. Canonical models (Portfolio, PriceSeries, ReturnSeries, FactorSeries, TradeEvent)

2. Provider outputs (Yahoo, Fama-French, EDGAR)

3. Analytics transforms (returns alignment, aggregation, metrics, regression, Monte Carlo stats)

4. API response shaping (APIResponse \+ metadata)

5. AI agents (interpretation only; cannot compute or fetch)

---

## **2\) Where we are now (current implementation state)**

### **Implemented phases (as of now)**

* **Phase 1:** Backend skeleton \+ contracts ✅

* **Phase 2:** Market data ingestion (Yahoo provider) ✅

* **Phase 3:** Portfolio performance engine ✅ (core metrics implemented; some advanced/rolling metrics not yet)

* **Phase 4:** Monte Carlo stress testing ✅ (integrated as optional metadata)

* **Phase 5:** Fama–French factor analysis ✅ (official dataset ingestion \+ regression)

* **Phase 6:** Trade & behavior tracking ✅ (providers \+ models \+ endpoints)

* **Phase 7:** AI agents ✅ (library only; not exposed via API routes yet)

* **Phase 8:** Beta hardening ⏳ (next)

### **Key update to Phase 6 direction (important)**

**We will NOT use Quiver going forward.**  
 We will build trade ingestion on **SEC EDGAR** (and other public sources only if needed later), with **our own normalization layer** so the data is cleaned, enriched, and safe for frontend consumption.

If Quiver code exists, it should be treated as:

* **deprecated / removable**, not a dependency for “real data” going forward.

---

## **3\) Goals by pillar**

### **Pillar 1 — Portfolio analytics (Phases 1–5)**

**Goal:** Deterministic, auditable historical analytics from real market data.

Minimum credible output:

* Portfolio return series

* Benchmark return series (if provided)

* Metrics: cumulative return, CAGR, annualized volatility, max drawdown, Sharpe (rf=0 explicit)

* Monte Carlo stress test (optional): hypothetical distributions \+ disclaimers

* Fama–French factor regression: alpha \+ betas \+ stats \+ disclaimers

### **Pillar 2 — Trade & behavior tracking (Phase 6\)**

**Goal:** Observational intelligence from time-delayed public filings, clearly labeled, no causality claims.

Minimum credible output:

* Insider transactions from EDGAR Form 4 (and optionally 13F later, but not required)

* Normalized trade events (ticker, transaction date, reported date, value ranges)

* Descriptive aggregations (counts, ranges, recent activity)

* Strong disclaimers: time delay, amendments, incomplete coverage, no inference

### **Pillar 3 — AI interpretation (Phase 7\)**

**Goal:** Make outputs understandable without becoming magical.

Minimum credible output:

* Analyst: explains past performance \+ factors using existing computed fields only

* Auditor: flags risks/data quality issues only

* Planner: scenario framing with conditional language only

* Coach: questions-only reflection prompts

No AI endpoints are required yet; this can remain library code until Phase 8+.

---

## **4\) Canonical contracts (backend is source of truth)**

### **4.1 API envelope (mandatory)**

All v1 endpoints return:

`{`  
  `"data": { },`  
  `"metadata": { }`  
`}`

Errors return:

`{`  
  `"error": { "code": "…", "message": "…" }`  
`}`

### **4.2 Canonical portfolio schema (already implemented)**

**Portfolio**

* holdings\[\]: { ticker, weight }

* currency: string (default USD)

* benchmark?: ticker

* start\_date, end\_date (ISO dates)

**Validation**

* weights sum to 1.0 (± tolerance), normalized to exactly 1.0

* no duplicate tickers

* tickers must be available in provider for date range

* dates valid, start ≤ end, not future

* tickers/currency uppercased

### **4.3 Canonical trade schema (already implemented)**

**TradeEvent** is the single normalized representation of “trade-like events”.

Hard constraints:

* dates are timezone-aware

* money uses Decimal (no floats)

* includes computed `delay_days`

* includes `source`, `source_attribution`, and `time_delay_disclaimer` in metadata at the API layer

---

## **5\) Data sources and data policies**

### **5.1 Market prices (Phase 2\)**

**Source:** Yahoo Finance via `yfinance` (MVP).  
 **Policy:** Use adjusted close when available; document it.

Required metadata:

* adjusted vs unadjusted usage

* any limitations (missing days, alignment drops)

* provider name and timestamp

### **5.2 Factors (Phase 5\)**

**Source:** Official Kenneth French Data Library (daily factors).  
 **Policy:** No unofficial factor sources.

Required metadata:

* dataset name \+ frequency

* percent vs decimal normalization

* RF usage

### **5.3 Trade data (Phase 6, updated direction)**

**Primary (required): SEC EDGAR (free, public).**

We will build:

* a **robust EDGAR ingestion layer**

* a **normalization & enrichment layer**

* a **safe frontend-facing API** that only emits normalized TradeEvents \+ disclaimers

**No Quiver required. No paid dependency assumed.**

#### **EDGAR-specific requirements (must)**

* Respect SEC rate limits (User-Agent required, throttle, backoff)

* Caching layer strongly recommended (Phase 8\)

* Parse amendments (Form 4/A) and label them

* Handle missing price/value fields without inventing them

* Deterministic ordering and stable output shapes

---

## **6\) Phase-by-phase plan (v2)**

### **Phase 1 — Backend Skeleton \+ Contracts ✅**

Exit criteria:

* /api/v1/health works

* structured envelopes standardized

* config/logging/middleware stable

* router registration stable

### **Phase 2 — Market Data Ingestion ✅ (Yahoo)**

Exit criteria:

* get\_price\_series works for tickers/date ranges

* adjusted close preference documented

* deterministic result shapes

### **Phase 3 — Portfolio Performance ✅ (with noted gaps)**

Implemented:

* return series construction \+ alignment

* weighted aggregation

* metrics: cumulative, CAGR, vol, max DD, Sharpe (rf=0)

**Still missing (PRD gap):**

* rolling metrics (rolling return, rolling Sharpe)

* additional risk metrics (Sortino, Calmar, VaR/CVaR, Ulcer, Omega)  
   These are explicitly deferred; do not claim complete Phase 3 until added.

### **Phase 4 — Monte Carlo ✅**

Implemented:

* optional simulations in performance endpoint

* fixed seed for stability (where configured)

* strong disclaimers: hypothetical / stress test / not prediction

### **Phase 5 — Fama–French ✅**

Implemented:

* factor dataset ingestion (official)

* regression outputs \+ stats \+ disclaimers

### **Phase 6 — Trade & Behavior Tracking ✅ (but direction updated)**

Implemented now:

* trade models \+ ingestion \+ endpoints exist

**PRD v2 direction:**

* Deprecate/remove Quiver dependency

* Make EDGAR the primary trade source

* Build a “PortfolioLab EDGAR normalization API” layer: clean, enriched, reliable

### **Phase 7 — AI Agents ✅ (library only)**

Implemented:

* four agent classes \+ prompts \+ safety rules doc

PRD v2 rule:

* remain library code until Phase 8 decides how to expose it safely

### **Phase 8 — Beta Hardening (Next)**

Must include:

* rate limiting, caching, retries/backoff

* kill switches for broken providers

* consistent logging/monitoring

* stricter request validation \+ timeouts

* improved docs \+ “how to test” flows

* remove temporary diagnostics

---

## **7\) Required endpoints (current and target)**

### **Already implemented**

* GET `/api/v1/health`

* POST `/api/v1/portfolio/performance`

* POST `/api/v1/portfolio/factors`

* GET `/api/v1/trades/politicians` *(to be deprecated if Quiver-based)*

* GET `/api/v1/trades/insiders` *(EDGAR-based, keep)*

* GET `/api/v1/trades/ticker/{ticker}` *(should be EDGAR-based in v2)*

### **PRD v2 required changes (trade APIs)**

* `/api/v1/trades/insiders` remains core

* `/api/v1/trades/ticker/{ticker}` must support EDGAR-based filtering

* Remove or replace `/trades/politicians` unless we find a **public** equivalent source

---

## **8\) EDGAR normalization and enrichment requirements (new, high priority)**

This is the “build our own Quiver-quality layer” requirement.

### **8.1 Normalization**

Transform raw EDGAR Form 4 filing data into:

* TradeActor (issuer/insider)

* TradeEvent with:

  * ticker (resolved via CIK→ticker mapping where possible)

  * transaction\_date

  * reported\_date

  * trade\_type (buy/sell/other)

  * share count (if present)

  * price (if present)

  * value\_range (if price and shares present; otherwise null/unknown)

  * source metadata including filing accession number and document link

### **8.2 Enrichment (allowed, but must be explicit)**

Allowed enrichment:

* mapping CIK → ticker

* issuer name normalization

* officer title extraction

* amendment detection

* deterministic classification logic (based on transaction codes)

Not allowed:

* inferring missing prices

* inventing dollar values

* “scoring” insiders or predicting impact

### **8.3 Safety labeling**

Every trade response must include:

* source attribution (SEC EDGAR)

* time delay disclaimer (filings are delayed and may be amended)

* observational-only label

* coverage notes (not all trades captured, possible missing tickers)

---

## **9\) Prompt format standard for Cursor (must remain consistent)**

All future Cursor prompts follow the same structure:

* Phase X.Y title

* RUN THIS FIRST/SECOND/etc

* ROLE

* OPENING CONTEXT (MANDATORY)

* PROJECT CONTEXT

* TASK

* CURRENT BEHAVIOR

* DESIRED BEHAVIOR

* FILES TO INSPECT

* FILES TO CREATE/MODIFY

* CONSTRAINTS

* STEP-BY-STEP PLAN

* IMPLEMENTATION REQUIREMENTS

* TESTING & VERIFICATION

* OUTPUT FORMAT (summary \+ examples)

This is a hard process requirement for predictable iteration.

---

## **10\) Definition of done (global)**

A feature is “done” only when:

* It is testable via `/docs` (or a documented manual test flow)

* It returns deterministic outputs (or explicitly labels stochastic outputs like Monte Carlo)

* It includes metadata and disclaimers

* Failures are loud, structured, and explainable

* No silent fallbacks, no “best guess” adjustments, no invented data

---

## **11\) Immediate next work (recommended priority order)**

1. **Phase 8 hardening** (stability first): caching \+ retries \+ kill switches

2. **EDGAR-first trade pipeline** (remove Quiver dependency)

3. Fill **Phase 3 metric gaps** (rolling \+ Sortino/Calmar/VaR/CVaR)

4. Decide if/when to expose AI agent endpoints safely (or keep internal)

