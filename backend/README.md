# PortfolioLab Backend

Backend API for PortfolioLab portfolio analytics platform.

## Requirements

**Python 3.11 is the required runtime for backend development.**

Python 3.10 and 3.12 are also supported, but 3.11 is recommended for best compatibility.

## Setup

1. **Check Python version:**
   ```bash
   python --version
   # Should be 3.10, 3.11, or 3.12
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv .venv
   ```

3. **Activate virtual environment:**
   ```bash
   # Windows
   .venv\Scripts\activate
   
   # Linux/Mac
   source .venv/bin/activate
   ```

4. **Verify Python version (optional but recommended):**
   ```bash
   python scripts/check_python.py
   ```

5. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Backend

**Run from backend directory:**

```bash
cd backend
python -m uvicorn main:app --reload
```

The API will be available at:
- API: http://127.0.0.1:8000
- Docs: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/api/v1/health

## Configuration

Copy `env.example` to `.env` and configure as needed:

```bash
cp env.example .env
```

Key configuration options:
- `ENV`: Environment (local, development, production)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `CACHE_TTL_SECONDS`: Cache TTL for market data (default: 86400)
- `CACHE_ENABLED`: Enable/disable caching (default: true)

## API Endpoints

- `GET /api/v1/health` - Health check
- `GET /healthz` - Simple infrastructure health check
- `POST /api/v1/portfolio/performance` - Portfolio performance metrics and Monte Carlo simulations
- `POST /api/v1/portfolio/factors` - Fama-French factor analysis and regression

## Project Structure

```
backend/
├── app/
│   ├── api/          # API routes and schemas
│   ├── core/         # Core functionality (config, logging, exceptions)
│   └── ...
├── scripts/          # Utility scripts
├── main.py           # Application entry point
└── requirements.txt  # Python dependencies
```

## Factor Analysis (Fama-French)

The backend implements Fama-French 3-factor regression analysis for portfolio attribution.

### Methodology

- **Model:** `R_portfolio - RF = alpha + β_mkt * (MKT - RF) + β_smb * SMB + β_hml * HML + error`
- **Data Source:** Official Fama-French daily factors from Ken French Data Library (Dartmouth)
- **Method:** Ordinary Least Squares (OLS) regression
- **Alignment:** Date intersection only (no forward filling or interpolation)

### Important Limitations

**Alpha ≠ Skill:**
- Alpha represents unexplained excess return, not necessarily skill
- Positive alpha may result from omitted factors, luck, measurement error, or skill
- Statistical significance does not establish causation

**Descriptive Attribution Only:**
- Factor analysis explains historical relationships, not future performance
- Factor loadings describe what happened, not what will happen
- Results are not investment advice or predictions

**Statistical Uncertainty:**
- All coefficients are point estimates with uncertainty
- t-statistics and p-values quantify statistical significance
- Statistical significance ≠ economic significance or predictive power

**Model Assumptions:**
- Linear relationships between returns and factors
- Stationary factors (mean and variance constant over time)
- Homoscedastic residuals (constant variance)
- No autocorrelation in residuals
- These assumptions may not hold in real markets

### Developer Notes

- Factor data is downloaded from official Fama-French FTP server on-demand
- Minimum 30 observations required for regression
- Date alignment uses intersection only (explicit data loss reporting)
- Regression uses `numpy.linalg.lstsq` for OLS estimation
- Standard errors computed via covariance matrix: `(X'X)^(-1) * MSE`

## Development Notes

- All dependencies use flexible version constraints (>=) to allow pip to resolve compatible versions
- No transitive dependencies are pinned (e.g., pydantic-core)
- Python 3.11 is the canonical version (see `.python-version` at project root)
- Always use `python -m uvicorn main:app --reload` from the backend directory

