import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentHeader } from "@/components/ai/AgentHeader";
import { InsightCard } from "@/components/ai/InsightCard";
import { DataPoint } from "@/components/ai/DataPoint";
import { BarChart3, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

const attributionData = [
  { name: "VTI", contribution: 2.8, weight: 40 },
  { name: "VXUS", contribution: -0.4, weight: 15 },
  { name: "BND", contribution: 0.2, weight: 20 },
  { name: "QQQ", contribution: 1.8, weight: 15 },
  { name: "GLD", contribution: -0.3, weight: 5 },
  { name: "ARKK", contribution: -1.2, weight: 5 },
];

const factorContributions = [
  { factor: "Market (Beta)", exposure: 1.12, contribution: "+3.2%", status: "positive" },
  { factor: "Size (SMB)", exposure: -0.08, contribution: "-0.1%", status: "neutral" },
  { factor: "Value (HML)", exposure: 0.34, contribution: "+0.8%", status: "positive" },
  { factor: "Momentum", exposure: -0.15, contribution: "-0.4%", status: "negative" },
];

const weeklyEvents = [
  {
    date: "Dec 11",
    event: "Fed rate decision announcement",
    impact: "Markets rallied on dovish tone, VTI +1.2%",
  },
  {
    date: "Dec 12",
    event: "Semiconductor sector selloff",
    impact: "QQQ declined -0.8%, affecting tech exposure",
  },
  {
    date: "Dec 13",
    event: "Treasury yields drop",
    impact: "BND gained +0.3%, offsetting equity weakness",
  },
];

const AIAnalyst = () => {
  return (
    <DashboardLayout
      title="Analyst"
      description="Performance attribution and factor analysis"
    >
      <div className="space-y-6">
        {/* Agent Header */}
        <AgentHeader
          icon={BarChart3}
          title="Analyst"
          description="Explains what happened to your portfolio and why. Provides factual, data-driven attribution without recommendations."
          capabilities={[
            "Break down returns by holding contribution",
            "Explain factor exposure impacts",
            "Attribute performance to market events",
            "Compare against benchmark decomposition",
          ]}
          limitations={[
            "Make buy/sell recommendations",
            "Predict future performance",
            "Provide financial advice",
            "Guarantee accuracy of attributions",
          ]}
          lastUpdated="December 13, 2024, 2:00 PM EST"
        />

        {/* Performance Summary */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Period Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <DataPoint
              label="Portfolio Return"
              value="+2.9%"
              subValue="This week"
              tooltip="Total return for the analysis period"
              trend="up"
            />
            <DataPoint
              label="Benchmark (SPY)"
              value="+3.4%"
              subValue="This week"
              tooltip="S&P 500 return for comparison"
              trend="up"
            />
            <DataPoint
              label="Active Return"
              value="-0.5%"
              subValue="Underperformed"
              tooltip="Portfolio return minus benchmark return"
              trend="down"
            />
            <DataPoint
              label="Tracking Error"
              value="2.1%"
              tooltip="Standard deviation of active returns"
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Summary:</span> Your portfolio
              returned +2.9% this week, underperforming the S&P 500 by 0.5 percentage
              points. The underperformance was primarily driven by ARKK (-1.2% contribution)
              and international equities weakness. Bond allocation provided stability during
              the period.
            </p>
          </div>
        </div>

        {/* Attribution Chart */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Holding Attribution</h2>
            <Link to="/dashboard/results" className="text-sm text-primary hover:underline">
              View holdings
            </Link>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attributionData} layout="vertical" margin={{ left: 40, right: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `${v}%`} domain={[-2, 4]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)}%`, "Contribution"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <ReferenceLine x={0} stroke="hsl(var(--border))" />
                <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                  {attributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.contribution >= 0
                          ? "hsl(var(--success))"
                          : "hsl(var(--destructive))"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Contribution = Holding weight × Holding return. Positive values added to portfolio
            return; negative values detracted.
          </p>
        </div>

        {/* Factor Attribution */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Factor Contribution</h2>
            <Link
              to="/dashboard/factor-analysis"
              className="text-sm text-primary hover:underline"
            >
              Full factor analysis
            </Link>
          </div>
          <div className="space-y-3">
            {factorContributions.map((factor, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{factor.factor}</p>
                  <p className="text-xs text-muted-foreground">
                    Exposure: {factor.exposure > 0 ? "+" : ""}
                    {factor.exposure}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-mono font-medium ${
                      factor.status === "positive"
                        ? "text-success"
                        : factor.status === "negative"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {factor.contribution}
                  </span>
                  {factor.status === "positive" ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : factor.status === "negative" ? (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ) : (
                    <Minus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Based on Fama-French 3-Factor model with momentum extension. Factor
            contributions are estimates based on regression analysis.
          </p>
        </div>

        {/* Market Events */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Key Market Events</h2>
          <div className="space-y-4">
            {weeklyEvents.map((event, idx) => (
              <div key={idx} className="flex gap-4 p-3 rounded-lg bg-muted/30">
                <div className="text-sm font-mono text-muted-foreground shrink-0 w-16">
                  {event.date}
                </div>
                <div>
                  <p className="text-sm font-medium">{event.event}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Analysis Insights</h2>
          <div className="space-y-4">
            <InsightCard
              title="ARKK Position Drag"
              summary="ARKK contributed -1.2% to portfolio performance, the largest single detractor this period."
              severity="warning"
              metric={{ label: "Impact", value: "-1.2%", change: "-$1,495", isPositive: false }}
              assumptions={[
                "Based on closing prices for the period",
                "Does not include any intraday trading activity",
              ]}
              source="Market data as of Dec 13, 2024"
            />
            <InsightCard
              title="Bond Allocation Stability"
              summary="BND provided positive contribution (+0.2%) while limiting downside during equity volatility."
              severity="success"
              metric={{ label: "Contribution", value: "+0.2%", change: "+$249", isPositive: true }}
              source="Market data as of Dec 13, 2024"
            />
            <InsightCard
              title="Low Momentum Exposure"
              summary="Negative momentum factor loading (-0.15) resulted in missed gains from trending sectors."
              severity="info"
              details={
                <p>
                  Momentum factor was positive this period as technology leaders continued
                  their advance. Your portfolio's underweight to momentum-driven names
                  resulted in a -0.4% contribution from this factor.
                </p>
              }
              source="Factor model regression"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/dashboard/ai" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to AI Hub
          </Link>
          <Button variant="outline" asChild>
            <Link to="/dashboard/ai/auditor">
              Check for risks with Auditor
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAnalyst;
