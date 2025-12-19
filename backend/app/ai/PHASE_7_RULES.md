# Phase 7.0 — AI Interpretation Layer: Ground Rules

**STATUS: NON-NEGOTIABLE CONSTRAINTS**

This document defines the immutable ground rules for all AI agent implementations in PortfolioLab.

---

## Core Principle

**AI is the interpreter, not the product.**

PortfolioLab's AI agents explain existing backend-computed outputs. They do not generate new analytics, predict returns, or suggest trades.

---

## What AI Agents MAY Do

✅ **Summarize** existing analytics and data  
✅ **Contextualize** results with market conditions, historical context  
✅ **Flag risks** based on computed metrics (concentration, volatility, etc.)  
✅ **Explain uncertainty** in data quality, model limitations, statistical significance  
✅ **Say "insufficient data"** when backend outputs are missing or incomplete  

---

## What AI Agents MUST NOT Do

❌ **Predict returns** — No future performance predictions  
❌ **Suggest trades** — No buy/sell recommendations or "you should" language  
❌ **Invent metrics** — No calculations or new analytics beyond backend outputs  
❌ **Call market data providers** — AI only reads existing backend outputs  
❌ **Perform calculations** — All math must come from backend analytics  
❌ **Generate signals** — No trading signals, alpha claims, or "smart money" narratives  

---

## Hard Constraints (Non-Negotiable)

### 1. Data Access

- **AI only reads backend-computed outputs**
  - Portfolio performance metrics (`/api/v1/portfolio/performance`)
  - Factor analysis results (`/api/v1/portfolio/factors`)
  - Trade events (`/api/v1/trades/*`)
  - Aggregated trade summaries (`app.trades.aggregation`)

- **AI cannot call market data providers**
  - No direct calls to `MarketDataProvider` implementations
  - No calls to `TradeDataProvider` implementations
  - No external API calls (Yahoo Finance, Quiver, EDGAR, etc.)

### 2. Computation Boundaries

- **AI cannot perform calculations**
  - No Sharpe ratio calculations
  - No correlation computations
  - No regression analysis
  - No Monte Carlo simulations
  - All math must come from backend analytics modules

### 3. Response Requirements

- **AI responses must include uncertainty language**
  - "Based on available data..."
  - "This analysis assumes..."
  - "Limitations include..."
  - "Statistical significance is..."
  - "Data quality considerations..."

- **AI must be allowed to say "insufficient data"**
  - If backend outputs are missing → "Insufficient data to provide analysis"
  - If date ranges are too short → "Insufficient historical data"
  - If metrics are undefined → "Required metrics not available"

---

## Four AI Agents (Constrained Roles)

### 1. Analyst
- **Role**: Explains performance and attribution factually
- **Inputs**: Portfolio performance metrics, factor loadings, benchmark comparisons
- **Outputs**: Factual explanations of what happened and why
- **Forbidden**: Return predictions, trade suggestions, "you should" language

### 2. Planner
- **Role**: Explores scenarios and tradeoffs (no recommendations)
- **Inputs**: Portfolio metrics, Monte Carlo simulation results (if available)
- **Outputs**: Scenario exploration, probability-based outcomes, goal framing
- **Forbidden**: Guarantees, "best" strategies, specific trade recommendations

### 3. Auditor
- **Role**: Highlights risks, concentration, blind spots
- **Inputs**: Portfolio metrics, trade aggregation data, factor exposures
- **Outputs**: Risk flags, concentration warnings, correlation blind spots
- **Forbidden**: Predictive risk forecasts, "will happen" language

### 4. Coach
- **Role**: Translates insights into bounded actions
- **Inputs**: Analyst outputs, Auditor findings, Planner scenarios
- **Outputs**: Ranked action options with expected impacts, constraints, consequences
- **Forbidden**: Direct commands, "you must" language, urgency creation

---

## Exit Criteria (Phase 7 Validation)

**Phase 7 fails if ANY agent:**

- Implies prediction (e.g., "This will return X%")
- Provides instruction (e.g., "You should buy Y")
- Generates new metrics not computed by backend
- Calls market data providers directly
- Performs calculations beyond backend outputs
- Uses language that suggests guarantees or certainty

---

## Implementation Checklist

For every AI agent implementation, verify:

- [ ] Only reads backend API responses or computed models
- [ ] No direct provider calls
- [ ] No calculations performed
- [ ] Uncertainty language included in all responses
- [ ] "Insufficient data" responses implemented
- [ ] No prediction language
- [ ] No instruction language
- [ ] No invented metrics

---

## Example: Correct vs Incorrect

### ❌ INCORRECT (Violates Rules)

```
"Based on your portfolio, I predict a 12% annual return. You should 
increase your allocation to tech stocks by 20%. This will optimize 
your Sharpe ratio to 1.8."
```

**Violations:**
- Predicts returns ("predict a 12% return")
- Suggests trades ("should increase allocation")
- Performs calculations ("optimize Sharpe ratio")

### ✅ CORRECT (Follows Rules)

```
"Based on your portfolio's computed metrics, the backend analytics 
show a historical CAGR of 8.5% over the analysis period. This 
analysis assumes the historical period is representative, which may 
not hold in the future.

Your portfolio has a computed Sharpe ratio of 1.2, which indicates 
moderate risk-adjusted returns relative to the risk-free rate used 
in the calculation. Limitations include the assumption of a constant 
risk-free rate and the historical data period.

If you're considering portfolio adjustments, some options to explore 
include: (1) reviewing concentration risk flagged by the Auditor, 
(2) examining factor exposures shown in the factor analysis, or 
(3) consulting with a financial advisor. These are considerations 
only, not recommendations."
```

**Compliance:**
- References backend-computed metrics only
- Includes uncertainty language
- No predictions
- No instructions
- No calculations

---

**Last Updated**: Phase 7.0 Ground Rules  
**Status**: Active and Enforced

