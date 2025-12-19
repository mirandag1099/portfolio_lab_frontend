import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricTooltipProps {
  metric: string;
  children?: React.ReactNode;
}

const metricDefinitions: Record<string, string> = {
  // Return Metrics
  "Final Value": "The ending portfolio value after all gains/losses over the analysis period.",
  "Cumulative Return": "Total percentage return from start to end of the period, including reinvested dividends.",
  "CAGR": "Compound Annual Growth Rate - the annualized rate of return that smooths out volatility.",
  "Annual Return": "Average yearly return over the investment period.",
  "Monthly Return": "Average monthly return, useful for comparing shorter-term performance.",
  "Daily Return": "Average daily return, typically very small due to the short time frame.",
  
  // Risk-Adjusted Metrics
  "Sharpe Ratio": "Risk-adjusted return: excess return per unit of total volatility. Higher is better, >1 is good.",
  "Sortino Ratio": "Like Sharpe, but only penalizes downside volatility. Better for asymmetric returns.",
  "Omega Ratio": "Probability-weighted ratio of gains vs losses. >1 means more upside than downside.",
  "Calmar Ratio": "CAGR divided by max drawdown. Measures return relative to worst-case loss.",
  "Recovery Factor": "Cumulative return divided by max drawdown. How well the portfolio recovers from losses.",
  "Ulcer Performance": "Return adjusted for 'ulcer index' - considers depth and duration of drawdowns.",
  "Serenity Ratio": "Risk-adjusted measure that accounts for both volatility and drawdown severity.",
  "Treynor Ratio": "Excess return per unit of systematic (market) risk (beta).",
  "Information Ratio": "Alpha divided by tracking error. Measures active return consistency.",
  
  // Risk Metrics
  "Annualized Volatility": "Standard deviation of returns, annualized. Measures total price variability.",
  "Max Drawdown": "Largest peak-to-trough decline. The worst loss you would have experienced.",
  "Longest Drawdown": "Maximum number of days spent below a previous high.",
  "Ulcer Index": "Measures depth and duration of drawdowns. Lower is better.",
  "Value at Risk (95%)": "The maximum expected loss over a day with 95% confidence.",
  "CVaR": "Conditional VaR - expected loss when losses exceed VaR. The 'tail risk'.",
  "Risk of Ruin": "Probability of losing a significant portion of the portfolio.",
  "Kelly Criterion": "Optimal position sizing based on win rate and payoff ratio.",
  
  // Benchmark Metrics
  "Alpha": "Excess return vs benchmark after adjusting for risk. Positive = outperformance.",
  "Beta": "Sensitivity to market movements. <1 means less volatile than market.",
  "Correlation": "How closely returns move with the benchmark. 1 = perfect correlation.",
  
  // Returns
  "Best Day": "Highest single-day return in the period.",
  "Worst Day": "Lowest single-day return (largest single-day loss).",
  "Best Month": "Highest single-month return.",
  "Worst Month": "Lowest single-month return.",
  "Best Year": "Highest calendar year return.",
  "Worst Year": "Lowest calendar year return.",
  "MTD Return": "Month-to-date return from the first of the current month.",
  "3M Return": "Return over the last 3 months.",
  "6M Return": "Return over the last 6 months.",
  "YTD Return": "Year-to-date return from January 1st.",
  "1Y Return": "Return over the last 12 months.",
  "3Y Return (ann.)": "Annualized return over the last 3 years.",
  "5Y Return (ann.)": "Annualized return over the last 5 years.",
  "10Y Return (ann.)": "Annualized return over the last 10 years.",
  
  // Monte Carlo
  "Expected Return": "Mean projected return from simulation runs.",
  "Volatility": "Standard deviation of simulated outcomes.",
  "Final (25th)": "25th percentile of final portfolio values - pessimistic scenario.",
  "Final (Median)": "50th percentile (median) of final values - base case scenario.",
  "Final (75th)": "75th percentile of final values - optimistic scenario.",
  "P(Positive)": "Probability of achieving a positive return over the projection period.",

  // Factor Analysis (Fama-French)
  "R-Squared": "Proportion of variance explained by the factor model. Higher = better fit (0-1).",
  "Adjusted R²": "R-Squared adjusted for the number of factors used. More reliable for comparisons.",
  "Alpha (Annualized)": "Annualized excess return after accounting for factor exposures. Positive = skill.",
  "Alpha t-stat": "Statistical significance of alpha. Values >2 indicate significant outperformance.",
  "Tracking Error": "Standard deviation of the difference between portfolio and predicted returns.",
  "Market (Mkt-RF)": "Exposure to overall market risk. β=1 means same volatility as market.",
  "Size (SMB)": "Small Minus Big - exposure to small-cap stocks. Positive = small-cap tilt.",
  "Value (HML)": "High Minus Low - exposure to value stocks. Positive = value tilt.",
  "Momentum": "Exposure to momentum factor. Positive = tendency to hold recent winners.",
  
  // Optimization
  "Min Volatility": "Portfolio with lowest possible volatility on the efficient frontier.",
  "Max Sharpe": "Portfolio with highest risk-adjusted return (Sharpe ratio).",
  "Max Sortino": "Portfolio optimized for best downside risk-adjusted return.",
  "Min cVaR": "Portfolio that minimizes expected tail losses (Conditional Value at Risk).",
  "Max Omega": "Portfolio that maximizes probability-weighted gains vs losses.",
};

export function MetricTooltip({ metric, children }: MetricTooltipProps) {
  const definition = metricDefinitions[metric];
  
  if (!definition) {
    return <>{children || metric}</>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children || metric}
            <Info className="w-3 h-3 text-muted-foreground/60" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs">
          <p>{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { metricDefinitions };
