import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Download, Target, TrendingUp, Shield } from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Efficient frontier data
const efficientFrontierData = Array.from({ length: 20 }, (_, i) => ({
  risk: 5 + i * 1.2,
  return: 3 + Math.sqrt(i * 2) * 4 + Math.random() * 0.5,
}));

const currentPortfolio = { risk: 12, return: 8.5 };
const optimalPortfolio = { risk: 11, return: 9.8 };

const currentAllocation = [
  { name: "VTI", value: 40, color: "hsl(160, 84%, 39%)" },
  { name: "VXUS", value: 20, color: "hsl(210, 100%, 50%)" },
  { name: "BND", value: 25, color: "hsl(38, 92%, 50%)" },
  { name: "VNQ", value: 10, color: "hsl(280, 70%, 50%)" },
  { name: "GLD", value: 5, color: "hsl(0, 84%, 60%)" },
];

const optimalAllocation = [
  { name: "VTI", value: 35, color: "hsl(160, 84%, 39%)" },
  { name: "VXUS", value: 25, color: "hsl(210, 100%, 50%)" },
  { name: "BND", value: 20, color: "hsl(38, 92%, 50%)" },
  { name: "VNQ", value: 12, color: "hsl(280, 70%, 50%)" },
  { name: "GLD", value: 8, color: "hsl(0, 84%, 60%)" },
];

const optimizationMetrics = [
  { label: "Expected Return", current: "8.5%", optimal: "9.8%", diff: "+1.3%" },
  { label: "Expected Volatility", current: "12.0%", optimal: "11.0%", diff: "-1.0%" },
  { label: "Sharpe Ratio", current: "0.71", optimal: "0.89", diff: "+0.18" },
  { label: "Max Drawdown (Est.)", current: "-24.0%", optimal: "-21.0%", diff: "+3.0%" },
];

const Optimization = () => {
  const [riskTolerance, setRiskTolerance] = useState([50]);
  const [hasRun, setHasRun] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Portfolio Optimization</h1>
          <p className="text-muted-foreground">
            Find the optimal asset allocation based on your risk tolerance and expected returns
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Optimization Settings</h2>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm mb-2 block">Optimization Objective</Label>
                  <Select defaultValue="sharpe">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharpe">Maximize Sharpe Ratio</SelectItem>
                      <SelectItem value="return">Maximize Return</SelectItem>
                      <SelectItem value="minvol">Minimize Volatility</SelectItem>
                      <SelectItem value="targetreturn">Target Return</SelectItem>
                      <SelectItem value="targetrisk">Target Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm">Risk Tolerance</Label>
                    <span className="text-sm font-medium">{riskTolerance[0]}%</span>
                  </div>
                  <Slider
                    value={riskTolerance}
                    onValueChange={setRiskTolerance}
                    min={0}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Constraint: Max Single Asset</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={40} className="w-20" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Constraint: Min Single Asset</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue={5} className="w-20" />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Rebalancing Period</Label>
                  <Select defaultValue="quarterly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={() => setHasRun(true)}>
                <Play className="w-4 h-4" />
                Optimize Portfolio
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {hasRun ? (
              <>
                {/* Efficient Frontier */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Efficient Frontier</h2>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="risk"
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          label={{ value: "Risk (Std Dev %)", position: "bottom", offset: -5 }}
                          domain={[0, 30]}
                        />
                        <YAxis
                          dataKey="return"
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          label={{ value: "Return (%)", angle: -90, position: "left" }}
                          domain={[0, 15]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)}%`,
                            name === "risk" ? "Risk" : "Return",
                          ]}
                        />
                        {/* Efficient Frontier Line */}
                        <Scatter
                          data={efficientFrontierData}
                          fill="hsl(var(--muted-foreground))"
                          fillOpacity={0.3}
                          line={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 }}
                        />
                        {/* Current Portfolio */}
                        <Scatter
                          data={[currentPortfolio]}
                          fill="hsl(var(--warning))"
                          shape="diamond"
                          name="Current"
                        />
                        {/* Optimal Portfolio */}
                        <Scatter
                          data={[optimalPortfolio]}
                          fill="hsl(160, 84%, 39%)"
                          shape="star"
                          name="Optimal"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-warning rotate-45" />
                      <span className="text-muted-foreground">Current Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary" />
                      <span className="text-muted-foreground">Optimal Portfolio</span>
                    </div>
                  </div>
                </div>

                {/* Allocation Comparison */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-warning" />
                      Current Allocation
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={currentAllocation}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, value }) => `${name} ${value}%`}
                          >
                            {currentAllocation.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      Optimal Allocation
                    </h3>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={optimalAllocation}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ name, value }) => `${name} ${value}%`}
                          >
                            {optimalAllocation.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Metrics Comparison */}
                <div className="glass rounded-xl overflow-hidden">
                  <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-semibold">Optimization Impact</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Metric</th>
                          <th className="text-right">Current</th>
                          <th className="text-right">Optimal</th>
                          <th className="text-right">Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizationMetrics.map((metric) => (
                          <tr key={metric.label}>
                            <td className="font-medium">{metric.label}</td>
                            <td className="text-right font-mono text-muted-foreground">
                              {metric.current}
                            </td>
                            <td className="text-right font-mono text-primary">
                              {metric.optimal}
                            </td>
                            <td className="text-right">
                              <span className="positive">{metric.diff}</span>
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
                  Set your optimization parameters and click "Optimize Portfolio" to see results.
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

export default Optimization;
