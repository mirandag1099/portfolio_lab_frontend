import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Download, Plus, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ToolNavigation } from "@/components/dashboard/ToolNavigation";
import { ToolIntro, toolIntros } from "@/components/dashboard/ToolIntro";

// Sample comparison data
const comparisonData = [
  { year: "2019", portfolio: 100000, spy: 100000, qqq: 100000, agg: 100000 },
  { year: "2020", portfolio: 118000, spy: 118400, qqq: 148600, agg: 107500 },
  { year: "2021", portfolio: 148500, spy: 152200, qqq: 175400, agg: 106200 },
  { year: "2022", portfolio: 128400, spy: 124500, qqq: 120800, agg: 92800 },
  { year: "2023", portfolio: 162300, spy: 156900, qqq: 175200, agg: 98200 },
  { year: "2024", portfolio: 198500, spy: 192400, qqq: 218600, agg: 102400 },
];

const benchmarks = [
  { id: "spy", name: "S&P 500 (SPY)", selected: true, color: "hsl(210, 100%, 50%)" },
  { id: "qqq", name: "NASDAQ 100 (QQQ)", selected: true, color: "hsl(280, 70%, 50%)" },
  { id: "agg", name: "US Aggregate Bond (AGG)", selected: true, color: "hsl(38, 92%, 50%)" },
  { id: "vti", name: "Total Stock Market (VTI)", selected: false, color: "hsl(330, 80%, 50%)" },
  { id: "vxus", name: "Total International (VXUS)", selected: false, color: "hsl(180, 70%, 40%)" },
];

const comparisonMetrics = [
  { metric: "Total Return", portfolio: "98.5%", spy: "92.4%", qqq: "118.6%", agg: "2.4%" },
  { metric: "CAGR", portfolio: "14.7%", spy: "14.0%", qqq: "16.9%", agg: "0.5%" },
  { metric: "Volatility", portfolio: "14.2%", spy: "18.4%", qqq: "24.1%", agg: "5.8%" },
  { metric: "Sharpe Ratio", portfolio: "1.03", spy: "0.76", qqq: "0.70", agg: "0.09" },
  { metric: "Max Drawdown", portfolio: "-13.5%", spy: "-18.1%", qqq: "-31.2%", agg: "-13.0%" },
  { metric: "Sortino Ratio", portfolio: "1.52", spy: "1.08", qqq: "0.98", agg: "0.13" },
];

const Benchmark = () => {
  const [selectedBenchmarks, setSelectedBenchmarks] = useState(
    benchmarks.filter((b) => b.selected).map((b) => b.id)
  );
  const [hasRun, setHasRun] = useState(true);

  const toggleBenchmark = (id: string) => {
    setSelectedBenchmarks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  return (
    <DashboardLayout title="Benchmark Comparison" description="Compare your portfolio performance against popular benchmarks and indices">
      <div className="space-y-6">
        {/* Tool Navigation */}
        <ToolNavigation />

        {/* Tool Introduction */}
        <ToolIntro
          icon={Activity}
          title={toolIntros.benchmark.title}
          description={toolIntros.benchmark.description}
          benefits={toolIntros.benchmark.benefits}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Select Benchmarks</h2>
              <div className="space-y-3">
                {benchmarks.map((benchmark) => (
                  <div
                    key={benchmark.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={benchmark.id}
                      checked={selectedBenchmarks.includes(benchmark.id)}
                      onCheckedChange={() => toggleBenchmark(benchmark.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: benchmark.color }}
                    />
                    <Label htmlFor={benchmark.id} className="cursor-pointer flex-1">
                      {benchmark.name}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <Label className="text-sm mb-2 block">Add Custom Benchmark</Label>
                <div className="flex gap-2">
                  <Input placeholder="Ticker symbol" className="flex-1" />
                  <Button variant="outline" size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Comparison Settings</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Time Period</Label>
                  <Select defaultValue="5y">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1y">1 Year</SelectItem>
                      <SelectItem value="3y">3 Years</SelectItem>
                      <SelectItem value="5y">5 Years</SelectItem>
                      <SelectItem value="10y">10 Years</SelectItem>
                      <SelectItem value="max">Max Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Initial Investment</Label>
                  <Input type="number" defaultValue={100000} />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Include Dividends</Label>
                  <Select defaultValue="reinvest">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reinvest">Reinvested</SelectItem>
                      <SelectItem value="cash">Cash Dividends</SelectItem>
                      <SelectItem value="exclude">Exclude</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={() => setHasRun(true)}>
                <Play className="w-4 h-4" />
                Compare
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {hasRun ? (
              <>
                {/* Chart */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Performance Comparison</h2>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="portfolio"
                          stroke="hsl(160, 84%, 39%)"
                          strokeWidth={3}
                          dot={false}
                          name="My Portfolio"
                        />
                        {selectedBenchmarks.includes("spy") && (
                          <Line
                            type="monotone"
                            dataKey="spy"
                            stroke="hsl(210, 100%, 50%)"
                            strokeWidth={2}
                            dot={false}
                            name="S&P 500"
                          />
                        )}
                        {selectedBenchmarks.includes("qqq") && (
                          <Line
                            type="monotone"
                            dataKey="qqq"
                            stroke="hsl(280, 70%, 50%)"
                            strokeWidth={2}
                            dot={false}
                            name="NASDAQ 100"
                          />
                        )}
                        {selectedBenchmarks.includes("agg") && (
                          <Line
                            type="monotone"
                            dataKey="agg"
                            stroke="hsl(38, 92%, 50%)"
                            strokeWidth={2}
                            dot={false}
                            name="US Bonds"
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Metrics Table */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold">Performance Metrics</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th className="text-right">
                            <span className="text-primary">My Portfolio</span>
                          </th>
                          {selectedBenchmarks.includes("spy") && (
                            <th className="text-right">S&P 500</th>
                          )}
                          {selectedBenchmarks.includes("qqq") && (
                            <th className="text-right">NASDAQ 100</th>
                          )}
                          {selectedBenchmarks.includes("agg") && (
                            <th className="text-right">US Bonds</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonMetrics.map((row) => (
                          <tr key={row.metric}>
                            <td className="font-medium">{row.metric}</td>
                            <td className="text-right font-mono text-primary">
                              {row.portfolio}
                            </td>
                            {selectedBenchmarks.includes("spy") && (
                              <td className="text-right font-mono text-muted-foreground">
                                {row.spy}
                              </td>
                            )}
                            {selectedBenchmarks.includes("qqq") && (
                              <td className="text-right font-mono text-muted-foreground">
                                {row.qqq}
                              </td>
                            )}
                            {selectedBenchmarks.includes("agg") && (
                              <td className="text-right font-mono text-muted-foreground">
                                {row.agg}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="glass rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-4">Key Insights</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-success-muted">
                      <p className="text-sm font-medium text-primary mb-1">
                        Better Risk-Adjusted Returns
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your portfolio has a Sharpe ratio of 1.03, outperforming S&P 500 (0.76) and
                        NASDAQ 100 (0.70).
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-success-muted">
                      <p className="text-sm font-medium text-primary mb-1">
                        Lower Maximum Drawdown
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your portfolio's max drawdown of -13.5% is significantly better than QQQ
                        (-31.2%).
                      </p>
                    </div>
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
                  Select benchmarks and click "Compare" to see how your portfolio stacks up.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Benchmark;
