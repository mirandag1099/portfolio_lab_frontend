import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Download, Info, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ToolNavigation } from "@/components/dashboard/ToolNavigation";
import { ToolIntro, toolIntros } from "@/components/dashboard/ToolIntro";

// Generate sample Monte Carlo paths
const generatePaths = () => {
  const paths: { year: number; p5: number; p25: number; p50: number; p75: number; p95: number }[] = [];
  let p5 = 100000, p25 = 100000, p50 = 100000, p75 = 100000, p95 = 100000;
  
  for (let year = 0; year <= 30; year++) {
    paths.push({ year, p5: Math.round(p5), p25: Math.round(p25), p50: Math.round(p50), p75: Math.round(p75), p95: Math.round(p95) });
    p5 *= 1.02;
    p25 *= 1.045;
    p50 *= 1.07;
    p75 *= 1.095;
    p95 *= 1.12;
  }
  return paths;
};

const monteCarloData = generatePaths();

const outcomes = [
  { percentile: "95th Percentile", value: 2487000, description: "Best case scenario" },
  { percentile: "75th Percentile", value: 1534000, description: "Optimistic outcome" },
  { percentile: "50th Percentile (Median)", value: 761000, description: "Most likely outcome" },
  { percentile: "25th Percentile", value: 385000, description: "Conservative outcome" },
  { percentile: "5th Percentile", value: 182000, description: "Worst case scenario" },
];

const MonteCarlo = () => {
  const [initialAmount, setInitialAmount] = useState(100000);
  const [years, setYears] = useState(30);
  const [simulations, setSimulations] = useState(10000);
  const [hasRun, setHasRun] = useState(true);

  const successRate = 87.4;
  const goalAmount = 500000;

  return (
    <DashboardLayout title="Monte Carlo Simulation" description="Run thousands of simulations to understand the range of possible outcomes">
      <div className="space-y-6">
        {/* Tool Navigation */}
        <ToolNavigation />

        {/* Tool Introduction */}
        <ToolIntro
          icon={BarChart3}
          title={toolIntros["monte-carlo"].title}
          description={toolIntros["monte-carlo"].description}
          benefits={toolIntros["monte-carlo"].benefits}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Simulation Parameters</h2>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm mb-2 block">Initial Investment</Label>
                  <Input
                    type="number"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm">Time Horizon</Label>
                    <span className="text-sm font-medium">{years} years</span>
                  </div>
                  <Slider
                    value={[years]}
                    onValueChange={(value) => setYears(value[0])}
                    min={5}
                    max={50}
                    step={1}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Goal Amount</Label>
                  <Input type="number" defaultValue={500000} />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm">Number of Simulations</Label>
                    <span className="text-sm font-medium">{simulations.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[simulations]}
                    onValueChange={(value) => setSimulations(value[0])}
                    min={1000}
                    max={50000}
                    step={1000}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Monthly Contribution</Label>
                  <Input type="number" defaultValue={1000} />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Expected Annual Return</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={7} className="w-20" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Annual Volatility</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={15} className="w-20" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={() => setHasRun(true)}>
                <Play className="w-4 h-4" />
                Run Simulation
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {hasRun ? (
              <>
                {/* Success Rate */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Probability of Success</h2>
                    <Button variant="outline" size="sm">
                      <Info className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          className="stroke-muted"
                          strokeWidth="10"
                          fill="none"
                          cx="50"
                          cy="50"
                          r="40"
                        />
                        <circle
                          className="stroke-primary"
                          strokeWidth="10"
                          fill="none"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          strokeDasharray={`${successRate * 2.51} 251`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{successRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-medium mb-1">
                        High probability of reaching your goal
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Based on {simulations.toLocaleString()} simulations, there's an{" "}
                        {successRate}% chance your portfolio will exceed ${goalAmount.toLocaleString()} in {years} years.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fan Chart */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Projection Fan Chart</h2>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monteCarloData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          label={{ value: "Years", position: "bottom", offset: -5 }}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <ReferenceLine
                          y={goalAmount}
                          stroke="hsl(var(--warning))"
                          strokeDasharray="5 5"
                          label={{ value: "Goal", position: "right" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="p95"
                          stroke="hsl(160, 84%, 70%)"
                          strokeWidth={1}
                          dot={false}
                          name="95th Percentile"
                        />
                        <Line
                          type="monotone"
                          dataKey="p75"
                          stroke="hsl(160, 84%, 55%)"
                          strokeWidth={1}
                          dot={false}
                          name="75th Percentile"
                        />
                        <Line
                          type="monotone"
                          dataKey="p50"
                          stroke="hsl(160, 84%, 39%)"
                          strokeWidth={3}
                          dot={false}
                          name="Median"
                        />
                        <Line
                          type="monotone"
                          dataKey="p25"
                          stroke="hsl(160, 84%, 55%)"
                          strokeWidth={1}
                          dot={false}
                          name="25th Percentile"
                        />
                        <Line
                          type="monotone"
                          dataKey="p5"
                          stroke="hsl(160, 84%, 70%)"
                          strokeWidth={1}
                          dot={false}
                          name="5th Percentile"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Outcome Table */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold">Projected Outcomes at Year {years}</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Percentile</th>
                          <th className="text-right">Portfolio Value</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outcomes.map((outcome) => (
                          <tr key={outcome.percentile}>
                            <td className="font-medium">{outcome.percentile}</td>
                            <td className="text-right font-mono text-primary">
                              ${outcome.value.toLocaleString()}
                            </td>
                            <td className="text-muted-foreground">{outcome.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="glass rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Configure your simulation parameters and click "Run Simulation" to see results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MonteCarlo;
