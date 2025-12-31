# Portfolio Analysis Integration

The `portfoliolab` frontend now uses the **Portfolio Analysis** Python backend for real portfolio analytics instead of mock data.

## Setup

### 1. Start the Portfolio Analysis API Server

In a terminal, run:

```bash
cd "/Users/edmundo/Desktop/Projects/Portfolio Analysis"
python api_server.py
```

The API will be available at `http://localhost:8001`

### 2. Start the portfoliolab Frontend

In another terminal, run:

```bash
cd "/Users/edmundo/Desktop/Projects/portfoliolab"
npm run dev
```

### 3. Configure API URL (Optional)

If you need to change the API URL, create a `.env` file in the `portfoliolab` directory:

```bash
VITE_PORTFOLIO_ANALYSIS_API_URL=http://localhost:8001
```

## How It Works

1. **User uploads portfolio CSV** → Stored in `sessionStorage` as `portfolioHoldings`
2. **PortfolioResults page loads** → Reads holdings from `sessionStorage`
3. **Converts holdings to CSV format** → `ticker,weight` format
4. **Calls Portfolio Analysis API** → `POST http://localhost:8001/analyze`
5. **Maps API response** → Transforms data to match portfoliolab's UI components
6. **Displays real analytics** → All charts and metrics use actual market data

## Data Mapping

The API response from Portfolio Analysis is mapped to portfoliolab's data structures:

- **Growth of $100** → `charts.growthOf100`
- **Period Returns** → `periodReturns.portfolio` and `periodReturns.benchmark`
- **Risk Metrics** → `riskMetrics` (volatility, Sharpe, beta, max drawdown)
- **Efficient Frontier** → `charts.efficientFrontier.points`
- **Risk-Return Scatter** → `charts.riskReturnScatter`
- **Correlation Matrix** → `charts.correlationMatrix`
- **Monthly Returns Heatmap** → `charts.monthlyReturnsHeatmap`

## Error Handling

If the Portfolio Analysis API is not running, the frontend will:
- Show an error message with instructions
- Fall back to mock data (for development)
- Display loading state while fetching

## Testing

1. Upload `robinhood_portfolio.csv` via the portfoliolab frontend
2. Navigate to `/dashboard/results`
3. Verify that the numbers match what you get from running `main.py` directly

## Notes

- The API uses the same market data and analytics functions as `main.py`
- All calculations use real market data (via Yahoo Finance)
- Results will match exactly what you get when running `main.py` directly
- The frontend automatically handles portfolio CSV parsing and normalization











