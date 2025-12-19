import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "./ProfessionalChart";

interface MonteCarloEmbedProps {
  initialValue?: number;
  expectedReturn?: number;
  volatility?: number;
  className?: string;
}

// Generate Monte Carlo simulation paths
function generateSimulation(
  initial: number,
  years: number,
  simCount: number,
  expectedReturn: number,
  volatility: number
) {
  const paths: number[][] = [];
  const monthlyReturn = expectedReturn / 12;
  const monthlyVol = volatility / Math.sqrt(12);
  const months = years * 12;

  for (let sim = 0; sim < simCount; sim++) {
    const path = [initial];
    let value = initial;
    for (let month = 0; month < months; month++) {
      const z = gaussianRandom();
      const monthReturn = monthlyReturn + monthlyVol * z;
      value = value * (1 + monthReturn);
      path.push(value);
    }
    paths.push(path);
  }

  return paths;
}

function gaussianRandom() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function getPercentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * p);
  return sorted[index];
}

export function MonteCarloEmbed({
  initialValue = 10000,
  expectedReturn = 0.07,
  volatility = 0.15,
  className,
}: MonteCarloEmbedProps) {
  const [years, setYears] = useState(10);
  const [simCount, setSimCount] = useState(500);
  const [returnRate, setReturnRate] = useState(expectedReturn * 100);
  const [vol, setVol] = useState(volatility * 100);

  const { chartData, metrics } = useMemo(() => {
    const paths = generateSimulation(
      initialValue,
      years,
      simCount,
      returnRate / 100,
      vol / 100
    );
    
    const months = years * 12;
    const data = [];
    
    for (let month = 0; month <= months; month++) {
      const values = paths.map((p) => p[month]);
      const date = new Date();
      date.setMonth(date.getMonth() + month);
      
      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        month,
        p5: getPercentile(values, 0.05),
        p25: getPercentile(values, 0.25),
        median: getPercentile(values, 0.5),
        p75: getPercentile(values, 0.75),
        p95: getPercentile(values, 0.95),
      });
    }

    const finalValues = paths.map((p) => p[p.length - 1]);
    const positiveOutcomes = finalValues.filter((v) => v > initialValue).length;
    
    return {
      chartData: data,
      metrics: {
        finalMedian: getPercentile(finalValues, 0.5),
        final25: getPercentile(finalValues, 0.25),
        final75: getPercentile(finalValues, 0.75),
        final5: getPercentile(finalValues, 0.05),
        final95: getPercentile(finalValues, 0.95),
        positiveProb: (positiveOutcomes / simCount) * 100,
      },
    };
  }, [initialValue, years, simCount, returnRate, vol]);

  return (
    <div className={cn("", className)}>
      {/* Controls */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Time Horizon
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[years]}
              onValueChange={([v]) => setYears(v)}
              min={1}
              max={30}
              step={1}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12 text-right">{years}y</span>
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Simulations
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[simCount]}
              onValueChange={([v]) => setSimCount(v)}
              min={100}
              max={2000}
              step={100}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12 text-right">{simCount}</span>
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Expected Return
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[returnRate]}
              onValueChange={([v]) => setReturnRate(v)}
              min={0}
              max={20}
              step={0.5}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12 text-right">{returnRate}%</span>
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Volatility
          </Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[vol]}
              onValueChange={([v]) => setVol(v)}
              min={5}
              max={40}
              step={1}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12 text-right">{vol}%</span>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        <div className="text-center p-2 bg-muted/20 rounded">
          <span className="text-[10px] text-muted-foreground block">5th %ile</span>
          <span className="text-sm font-mono">${(metrics.final5 / 1000).toFixed(0)}k</span>
        </div>
        <div className="text-center p-2 bg-muted/20 rounded">
          <span className="text-[10px] text-muted-foreground block">25th %ile</span>
          <span className="text-sm font-mono">${(metrics.final25 / 1000).toFixed(0)}k</span>
        </div>
        <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
          <span className="text-[10px] text-muted-foreground block">Median</span>
          <span className="text-sm font-mono font-medium">${(metrics.finalMedian / 1000).toFixed(0)}k</span>
        </div>
        <div className="text-center p-2 bg-muted/20 rounded">
          <span className="text-[10px] text-muted-foreground block">75th %ile</span>
          <span className="text-sm font-mono">${(metrics.final75 / 1000).toFixed(0)}k</span>
        </div>
        <div className="text-center p-2 bg-muted/20 rounded">
          <span className="text-[10px] text-muted-foreground block">95th %ile</span>
          <span className="text-sm font-mono">${(metrics.final95 / 1000).toFixed(0)}k</span>
        </div>
        <div className="text-center p-2 bg-success/10 rounded border border-success/20">
          <span className="text-[10px] text-muted-foreground block">P(Gain)</span>
          <span className="text-sm font-mono font-medium text-success">{metrics.positiveProb.toFixed(0)}%</span>
        </div>
      </div>

      {/* Fan chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: CHART_COLORS.axis, fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.grid }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: CHART_COLORS.axis, fontSize: 9 }}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                fontSize: "11px",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <ReferenceLine
              y={initialValue}
              stroke={CHART_COLORS.reference}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            {/* Outer band 5-95 */}
            <Area
              type="monotone"
              dataKey="p95"
              stroke="none"
              fill="hsl(220 15% 50%)"
              fillOpacity={0.1}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p5"
              stroke="none"
              fill="hsl(var(--background))"
              isAnimationActive={false}
            />
            {/* Inner band 25-75 */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill="hsl(220 15% 50%)"
              fillOpacity={0.2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="hsl(var(--background))"
              isAnimationActive={false}
            />
            {/* Median line */}
            <Area
              type="monotone"
              dataKey="median"
              stroke={CHART_COLORS.portfolio}
              strokeWidth={1.5}
              fill="none"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
