import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentHeader } from "@/components/ai/AgentHeader";
import { InsightCard } from "@/components/ai/InsightCard";
import { DataPoint } from "@/components/ai/DataPoint";
import { Target, ArrowRight, Sliders, Calendar, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Generate projection data
const generateProjection = (years: number, monthlyContrib: number, returnRate: number) => {
  const data = [];
  let balance = 124580; // Current portfolio value
  const scenarios = {
    optimistic: returnRate * 1.3,
    expected: returnRate,
    conservative: returnRate * 0.6,
  };

  for (let year = 0; year <= years; year++) {
    const yearData: any = { year: 2024 + year };
    
    for (const [scenario, rate] of Object.entries(scenarios)) {
      let scenarioBalance = 124580;
      for (let y = 0; y < year; y++) {
        scenarioBalance = scenarioBalance * (1 + rate) + monthlyContrib * 12;
      }
      yearData[scenario] = Math.round(scenarioBalance);
    }
    data.push(yearData);
  }
  return data;
};

const goalPresets = [
  { label: "Retirement", target: 1500000, years: 25, icon: Calendar },
  { label: "FIRE", target: 1000000, years: 15, icon: DollarSign },
  { label: "House Down Payment", target: 100000, years: 5, icon: DollarSign },
];

const AIPlanner = () => {
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [timeHorizon, setTimeHorizon] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [expectedReturn, setExpectedReturn] = useState(0.07);

  const projectionData = generateProjection(timeHorizon, monthlyContribution, expectedReturn);
  const finalExpected = projectionData[projectionData.length - 1]?.expected || 0;
  const successProbability = finalExpected >= targetAmount ? 85 : 
    (finalExpected / targetAmount) * 100 * 0.9;

  return (
    <DashboardLayout
      title="Planner"
      description="Goal modeling and scenario analysis"
    >
      <div className="space-y-6">
        {/* Agent Header */}
        <AgentHeader
          icon={Target}
          title="Planner"
          description="Helps you explore future scenarios and understand probability-based outcomes for your financial goals."
          capabilities={[
            "Model goal projections with multiple scenarios",
            "Calculate required savings rates",
            "Show probability distributions of outcomes",
            "Compare tradeoffs between different paths",
          ]}
          limitations={[
            "Guarantee any specific outcome",
            "Predict actual market returns",
            "Account for all life events or taxes",
            "Replace comprehensive financial planning",
          ]}
          lastUpdated="Based on current portfolio value of $124,580"
        />

        {/* Goal Presets */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Goal Templates</h2>
          <div className="grid md:grid-cols-3 gap-3">
            {goalPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTargetAmount(preset.target);
                  setTimeHorizon(preset.years);
                }}
                className={`p-4 rounded-lg border transition-all text-left ${
                  targetAmount === preset.target
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <preset.icon className="w-5 h-5 text-primary mb-2" />
                <p className="font-medium">{preset.label}</p>
                <p className="text-sm text-muted-foreground">
                  ${(preset.target / 1000000).toFixed(1)}M in {preset.years} years
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Controls */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Scenario Parameters</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Target Amount: ${targetAmount.toLocaleString()}
              </label>
              <Slider
                value={[targetAmount]}
                onValueChange={(v) => setTargetAmount(v[0])}
                min={100000}
                max={5000000}
                step={50000}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Time Horizon: {timeHorizon} years
              </label>
              <Slider
                value={[timeHorizon]}
                onValueChange={(v) => setTimeHorizon(v[0])}
                min={5}
                max={40}
                step={1}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Monthly Contribution: ${monthlyContribution.toLocaleString()}
              </label>
              <Slider
                value={[monthlyContribution]}
                onValueChange={(v) => setMonthlyContribution(v[0])}
                min={0}
                max={10000}
                step={100}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Expected Annual Return: {(expectedReturn * 100).toFixed(1)}%
              </label>
              <Slider
                value={[expectedReturn * 100]}
                onValueChange={(v) => setExpectedReturn(v[0] / 100)}
                min={3}
                max={12}
                step={0.5}
              />
            </div>
          </div>
        </div>

        {/* Projection Chart */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Projection Scenarios</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-success/60" /> Optimistic
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary" /> Expected
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-muted-foreground/60" /> Conservative
              </span>
            </div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="optimistic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stroke="hsl(var(--success))"
                  strokeWidth={1.5}
                  fill="url(#optimistic)"
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#expected)"
                />
                <Area
                  type="monotone"
                  dataKey="conservative"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Projections assume consistent monthly contributions and reinvested returns.
            Actual results will vary. This is not a guarantee of future performance.
          </p>
        </div>

        {/* Outcome Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <DataPoint
              label="Expected End Value"
              value={`$${(finalExpected / 1000000).toFixed(2)}M`}
              tooltip="Median projected value at end of time horizon"
            />
          </div>
          <div className="glass rounded-xl p-4">
            <DataPoint
              label="Goal Achievement"
              value={`${Math.min(100, Math.round(successProbability))}%`}
              subValue="Probability"
              tooltip="Estimated probability of reaching target"
              trend={successProbability >= 70 ? "up" : successProbability >= 50 ? "neutral" : "down"}
            />
          </div>
          <div className="glass rounded-xl p-4">
            <DataPoint
              label="Total Contributions"
              value={`$${((monthlyContribution * 12 * timeHorizon) / 1000).toFixed(0)}K`}
              tooltip="Total amount you'll contribute over the period"
            />
          </div>
          <div className="glass rounded-xl p-4">
            <DataPoint
              label="Growth from Returns"
              value={`$${((finalExpected - 124580 - monthlyContribution * 12 * timeHorizon) / 1000000).toFixed(2)}M`}
              tooltip="Expected growth from investment returns"
            />
          </div>
        </div>

        {/* Tradeoff Analysis */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Tradeoff Analysis</h2>
          <div className="space-y-4">
            <InsightCard
              title="To reach 90% success probability"
              summary="You would need to increase monthly contributions by $400 or extend your timeline by 3 years."
              severity="info"
              details={
                <div className="space-y-2">
                  <p>Option A: Increase monthly contribution to $1,900 (+$400)</p>
                  <p>Option B: Extend timeline to {timeHorizon + 3} years</p>
                  <p>Option C: Accept higher portfolio risk (not modeled)</p>
                </div>
              }
              assumptions={[
                "Assumes historical average returns continue",
                "Does not account for inflation",
                "Ignores taxes and fees",
              ]}
            />
            <InsightCard
              title="Sequence of Returns Risk"
              summary="In the first 5 years, a market downturn would have outsized impact on your final outcome."
              severity="warning"
              details={
                <p>
                  Early losses reduce the base amount that compounds over time. Consider
                  maintaining an emergency fund separate from invested assets to avoid
                  withdrawing during downturns.
                </p>
              }
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/dashboard/ai" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to AI Hub
          </Link>
          <Button variant="outline" asChild>
            <Link to="/dashboard/ai/coach">
              See action options with Coach
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIPlanner;
