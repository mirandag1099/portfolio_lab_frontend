import { LucideIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolIntroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefits: string[];
  className?: string;
}

export function ToolIntro({
  icon: Icon,
  title,
  description,
  benefits,
  className,
}: ToolIntroProps) {
  return (
    <div className={cn("glass rounded-xl p-5", className)}>
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-foreground">{title}</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[280px]">
                <div className="space-y-2">
                  <p className="text-xs font-medium">What you can do:</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {benefits.map((b, i) => (
                      <li key={i}>• {b}</li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Pre-defined tool intros for each analysis page
export const toolIntros = {
  backtest: {
    title: "Portfolio Backtesting",
    description:
      "Test how your portfolio would have performed historically. Upload your holdings, set a time range, and see returns, volatility, and drawdowns compared to benchmarks.",
    benefits: [
      "See historical performance of your asset allocation",
      "Compare against benchmarks like S&P 500",
      "Test different rebalancing strategies",
      "Understand risk metrics like max drawdown",
    ],
  },
  optimization: {
    title: "Portfolio Optimization",
    description:
      "Find the optimal asset allocation based on Modern Portfolio Theory. Visualize the efficient frontier and see how to improve your risk-adjusted returns.",
    benefits: [
      "Visualize the efficient frontier",
      "Optimize for Sharpe ratio or min volatility",
      "Get specific rebalancing suggestions",
      "Understand risk/return tradeoffs",
    ],
  },
  "factor-analysis": {
    title: "Factor Analysis (FF3)",
    description:
      "Decompose your portfolio returns using the Fama-French 3-Factor model. Understand your exposure to market, size, and value factors.",
    benefits: [
      "Identify factor exposures in your portfolio",
      "Measure alpha vs systematic risk",
      "Understand where returns come from",
      "Compare factor loadings to benchmarks",
    ],
  },
  "monte-carlo": {
    title: "Monte Carlo Simulation",
    description:
      "Run thousands of randomized scenarios to understand the range of possible outcomes. See probabilities of reaching your financial goals.",
    benefits: [
      "Understand probability of goal success",
      "See best and worst case scenarios",
      "Model different time horizons",
      "Account for market uncertainty",
    ],
  },
  benchmark: {
    title: "Benchmark Comparison",
    description:
      "Compare your portfolio's performance side-by-side with major indices and ETFs. See how you stack up on returns, volatility, and risk-adjusted metrics.",
    benefits: [
      "Compare against S&P 500, NASDAQ, bonds",
      "See relative performance metrics",
      "Identify strengths and weaknesses",
      "Track outperformance over time",
    ],
  },
};
