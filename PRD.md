## **The Core Product: Portfolio Analytics (Pillar 1\)**

The first and non-negotiable pillar is portfolio analytics.

A user must define a portfolio explicitly: tickers, weights, benchmark, currency, and date range. There is no browsing analytics without a portfolio. This is deliberate. Analytics without ownership lead to misleading conclusions.

Once defined, the system must compute and display:

* Historical performance (cumulative return, CAGR, annualized return)

* Risk metrics (volatility, drawdowns, VaR, CVaR, ulcer index, Sharpe, Sortino, Calmar, Omega, etc.)

* Rolling metrics (rolling returns, rolling Sharpe/Sortino)

* Allocation views (by asset, sector, region where data allows)

* Efficient frontier / optimization outputs (with explicit assumptions)

* Monte Carlo simulation as a **stress-testing tool**, not a forecast

* Exportable, professional-grade reports

These metrics must be computed using **adjusted price data** (splits \+ dividends when applicable) and must clearly state assumptions (rebalancing, reinvestment, frequency).

### **Academic Requirement: Fama-French Factor Analysis**

This is not optional. PortfolioLab explicitly incorporates academic factor testing.

The platform must support:

* Fama-French 3-factor model at minimum

* Regression outputs: factor loadings, t-stats, R², alpha

* Clear explanation of what alpha means (and does not mean)

* Time-period configurability

The factor analysis must be based on **official factor datasets**, not approximations scraped from blogs.

**Data source requirement:**

* Fama-French data library (Kenneth French’s official datasets, via Dartmouth)

  * [https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data\_library.html](https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html)

This data must be ingested server-side, versioned, cached, and normalized. The frontend never touches it directly.

---

## **Market Data Requirements (Non-Negotiable)**

If this data layer is weak, the entire product collapses.

### **Historical Prices & Benchmarks**

You need:

* Daily historical prices

* Corporate actions (splits, dividends)

* Broad benchmark coverage (SPY, S\&P 500 TR, MSCI indexes if possible)

**Realistic options (ranked):**

1. **Polygon.io** – good coverage, paid, clean API, serious product

2. **Tiingo** – strong fundamentals \+ prices, reasonable pricing

3. **Yahoo Finance** – acceptable for MVP, but fragile and unofficial

4. **Stooq / Alpha Vantage** – limited, acceptable only for early prototyping

If you choose Yahoo for MVP, the PRD must acknowledge it is a temporary compromise.

### **Risk-Free Rate**

Risk-free rate must be explicit and configurable.

* Source: US Treasury yields

* Data source: FRED (Federal Reserve Economic Data)

  * [https://fred.stlouisfed.org](https://fred.stlouisfed.org)

  ---

  ## **The Second Pillar: Trade & Behavior Tracking**

PortfolioLab also tracks **observable behavior of influential market participants**. This is not sentiment guessing. This is about **publicly disclosed actions**.

### **Politician Trades**

This is mandatory.

**Primary data source:**

* Quiver Quantitative (paid, clean API)

* Alternative: raw congressional disclosure parsing (high effort, high maintenance)

The system must show:

* Who traded

* What was traded

* Buy/sell

* Approximate timing

* Aggregated trends

No claims about intent. No predictive language.

### **Insider Trades (Executives / Directors)**

Data must come from:

* SEC Form 4 filings

* Source options:

  * SEC EDGAR (raw, painful, but canonical)

  * Paid aggregators (e.g. Intrinio, Polygon, Quiver)

Again: descriptive, not predictive.

### **Famous Investors / Fund Managers**

This is the hardest category and must be handled honestly.

**What is acceptable:**

* 13F filings (quarterly holdings)

* Public disclosures

* Known fund holdings with delay

**What is not acceptable:**

* Pretending to know real-time trades when you don’t

* Guessing allocations

If a data source has delay, the UI must say so.

### **Retail / Social Investors**

This must be framed carefully.

* Reddit/Twitter data is noisy and legally sensitive

* At most: aggregation of publicly posted trades or sentiment

* Strong disclaimers required

This is an **augmentation**, not a core truth layer.

---

## **The Third Pillar: AI Agents (Interpretation Layer)**

AI is not the product. AI is the interpreter.

PortfolioLab includes **four AI agents**, each with a constrained role:

* **Analyst**: explains performance and attribution factually

* **Planner**: explores scenarios and tradeoffs (no recommendations)

* **Auditor**: highlights risks, concentration, blind spots

* **Coach**: translates analysis into possible considerations, never commands

AI must:

* Only reference data already computed

* Never fabricate numbers

* Never predict returns

* Never recommend trades directly

If the AI cannot answer from available data, it must say so.

---

## **Backend Reality Check (Harsh but Necessary)**

This product **cannot** be frontend-driven.

You will need:

* A real backend

* Data ingestion jobs

* Caching

* Normalization

* Deterministic analytics

* Explicit assumptions stored with results

If analytics differ run-to-run without explanation, trust is gone.

The frontend is a lens. The backend is the authority.

---

## **Monetization Reality (Implicit Requirement)**

Because this targets retail users:

* Core analytics must be free or very cheap

* Premium can exist for:

  * More history

  * More simulations

  * More tracked entities

  * More reports

If the product feels like a bait-and-switch, it fails.

---

## **The Non-Negotiable Product Standard**

If a finance student, CFA candidate, or skeptical retail investor asks:

“Where does this number come from?”

You must be able to answer:

* The data source

* The formula

* The assumptions

* The limitations

If you cannot, that feature does not belong in PortfolioLab.

---

## **Final Reality Statement**

PortfolioLab is ambitious, but it is not vague.

It is a **retail-accessible financial analysis platform** built on:

* real data

* real benchmarks

* real academic models

* real disclosures

* restrained AI interpretation

Anything less turns it into just another pretty app.

