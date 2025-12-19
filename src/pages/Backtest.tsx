import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Download, RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

// Sample backtest results
const backtestData = [
  { year: "2015", portfolio: 100000, benchmark: 100000 },
  { year: "2016", portfolio: 112000, benchmark: 109500 },
  { year: "2017", portfolio: 134500, benchmark: 131400 },
  { year: "2018", portfolio: 128200, benchmark: 125800 },
  { year: "2019", portfolio: 168400, benchmark: 162100 },
  { year: "2020", portfolio: 198200, benchmark: 189500 },
  { year: "2021", portfolio: 258600, benchmark: 243800 },
  { year: "2022", portfolio: 218400, benchmark: 198600 },
  { year: "2023", portfolio: 278900, benchmark: 252300 },
  { year: "2024", portfolio: 342100, benchmark: 298500 },
];

const metrics = [
  { name: "Total Return", portfolio: "242.1%", benchmark: "198.5%", diff: "+43.6%" },
  { name: "CAGR", portfolio: "13.1%", benchmark: "11.5%", diff: "+1.6%" },
  { name: "Max Drawdown", portfolio: "-22.4%", benchmark: "-25.2%", diff: "+2.8%" },
  { name: "Sharpe Ratio", portfolio: "1.12", benchmark: "0.89", diff: "+0.23" },
  { name: "Sortino Ratio", portfolio: "1.67", benchmark: "1.34", diff: "+0.33" },
  { name: "Volatility", portfolio: "14.2%", benchmark: "16.8%", diff: "-2.6%" },
];

const Backtest = () => {
  const [holdings, setHoldings] = useState([
    { symbol: "VTI", allocation: 50 },
    { symbol: "VXUS", allocation: 20 },
    { symbol: "BND", allocation: 30 },
  ]);
  const [hasRun, setHasRun] = useState(true);

  const addHolding = () => {
    setHoldings([...holdings, { symbol: "", allocation: 0 }]);
  };

  const removeHolding = (index: number) => {
    setHoldings(holdings.filter((_, i) => i !== index));
  };

  const updateHolding = (index: number, field: "symbol" | "allocation", value: string | number) => {
    const updated = [...holdings];
    if (field === "symbol") {
      updated[index].symbol = (value as string).toUpperCase();
    } else {
      updated[index].allocation = value as number;
    }
    setHoldings(updated);
  };

  const totalAllocation = holdings.reduce((sum, h) => sum + h.allocation, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Portfolio Backtest</h1>
          <p className="text-muted-foreground">
            Test your portfolio against historical data to see how it would have performed
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Portfolio Allocation */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Portfolio Allocation</h2>
                <Button variant="ghost" size="sm" onClick={addHolding}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {holdings.map((holding, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Input
                      placeholder="Symbol"
                      value={holding.symbol}
                      onChange={(e) => updateHolding(index, "symbol", e.target.value)}
                      className="w-24 uppercase"
                    />
                    <div className="flex-1">
                      <Slider
                        value={[holding.allocation]}
                        onValueChange={(value) => updateHolding(index, "allocation", value[0])}
                        max={100}
                        step={1}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">
                      {holding.allocation}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => removeHolding(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Allocation</span>
                <span
                  className={`font-semibold ${
                    totalAllocation === 100
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {totalAllocation}%
                </span>
              </div>
            </div>

            {/* Backtest Settings */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Backtest Settings</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Start Date</Label>
                  <Select defaultValue="2015">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2010, 2015, 2018, 2020].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          January {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Benchmark</Label>
                  <Select defaultValue="SPY">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPY">S&P 500 (SPY)</SelectItem>
                      <SelectItem value="VTI">Total Stock Market (VTI)</SelectItem>
                      <SelectItem value="QQQ">NASDAQ 100 (QQQ)</SelectItem>
                      <SelectItem value="AGG">US Aggregate Bond (AGG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Initial Investment</Label>
                  <Input type="number" defaultValue={100000} />
                </div>
                <div>
                  <Label className="text-sm mb-2 block">Rebalancing Frequency</Label>
                  <Select defaultValue="yearly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Rebalancing</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button variant="hero" className="flex-1" onClick={() => setHasRun(true)}>
                  <Play className="w-4 h-4" />
                  Run Backtest
                </Button>
                <Button variant="outline" size="icon">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {hasRun ? (
              <>
                {/* Chart */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Portfolio Growth</h2>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={backtestData}>
                        <defs>
                          <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
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
                        <Area
                          type="monotone"
                          dataKey="portfolio"
                          stroke="hsl(160, 84%, 39%)"
                          strokeWidth={2}
                          fill="url(#portfolioGrad)"
                          name="Portfolio"
                        />
                        <Line
                          type="monotone"
                          dataKey="benchmark"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Benchmark"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Metrics */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold">Performance Metrics</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th className="text-right">Portfolio</th>
                          <th className="text-right">Benchmark</th>
                          <th className="text-right">Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric) => (
                          <tr key={metric.name}>
                            <td className="font-medium">{metric.name}</td>
                            <td className="text-right font-mono">{metric.portfolio}</td>
                            <td className="text-right font-mono text-muted-foreground">
                              {metric.benchmark}
                            </td>
                            <td className="text-right">
                              <span
                                className={
                                  metric.diff.startsWith("+") ? "positive" : "negative"
                                }
                              >
                                {metric.diff}
                              </span>
                            </td>
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
                  Configure your portfolio allocation and click "Run Backtest" to see results.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Backtest;
