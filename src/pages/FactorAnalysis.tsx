import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Play, Download, Info, PieChart } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";
import { ToolNavigation, ToolSuggestion } from "@/components/dashboard/ToolNavigation";
import { ToolIntro, toolIntros } from "@/components/dashboard/ToolIntro";
import { MetricTooltip } from "@/components/ui/metric-tooltip";

const factorExposures = [
  { factor: "Market (Mkt-RF)", exposure: 1.12, tStat: 24.5, pValue: 0.0001 },
  { factor: "Size (SMB)", exposure: 0.23, tStat: 4.2, pValue: 0.0001 },
  { factor: "Value (HML)", exposure: -0.15, tStat: -2.8, pValue: 0.0056 },
];

const factorChartData = [
  { name: "Market (β)", value: 1.12, fill: "hsl(160, 84%, 39%)" },
  { name: "Size (SMB)", value: 0.23, fill: "hsl(210, 100%, 50%)" },
  { name: "Value (HML)", value: -0.15, fill: "hsl(0, 84%, 60%)" },
];

const regressionStats = [
  { name: "R-Squared", value: "0.924", description: "92.4% of variance explained" },
  { name: "Adjusted R²", value: "0.921", description: "Adjusted for factors" },
  { name: "Alpha (Annualized)", value: "1.23%", description: "Excess return vs factors" },
  { name: "Alpha t-stat", value: "2.14", description: "Statistical significance" },
  { name: "Tracking Error", value: "3.45%", description: "Active risk" },
  { name: "Information Ratio", value: "0.36", description: "Alpha / Tracking Error" },
];

// Scatter plot data for alpha visualization
const alphaScatter = Array.from({ length: 60 }, (_, i) => ({
  month: i + 1,
  portfolioReturn: (Math.random() - 0.45) * 10,
  predictedReturn: (Math.random() - 0.5) * 8,
}));

const FactorAnalysis = () => {
  const [hasRun, setHasRun] = useState(true);

  return (
    <DashboardLayout title="Factor Analysis (FF3)" description="Analyze your portfolio's exposure to market, size, and value factors using the Fama-French model">
      {/* Tool Navigation */}
      <div className="mb-6">
        <ToolNavigation />
      </div>

      {/* Tool Introduction */}
      <div className="mb-6">
        <ToolIntro
          icon={PieChart}
          title={toolIntros["factor-analysis"].title}
          description={toolIntros["factor-analysis"].description}
          benefits={toolIntros["factor-analysis"].benefits}
        />
      </div>

      <div className="space-y-6">

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Analysis Settings</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Portfolio / Fund Ticker</Label>
                  <Input placeholder="e.g., VTI or custom" defaultValue="My Portfolio" />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Factor Model</Label>
                  <Select defaultValue="ff3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ff3">Fama-French 3-Factor</SelectItem>
                      <SelectItem value="ff5">Fama-French 5-Factor</SelectItem>
                      <SelectItem value="carhart">Carhart 4-Factor</SelectItem>
                      <SelectItem value="capm">CAPM (Single Factor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Analysis Period</Label>
                  <Select defaultValue="5y">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1y">1 Year</SelectItem>
                      <SelectItem value="3y">3 Years</SelectItem>
                      <SelectItem value="5y">5 Years</SelectItem>
                      <SelectItem value="10y">10 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Return Frequency</Label>
                  <Select defaultValue="monthly">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Risk-Free Rate</Label>
                  <Select defaultValue="tbill">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tbill">1-Month T-Bill</SelectItem>
                      <SelectItem value="3m">3-Month T-Bill</SelectItem>
                      <SelectItem value="custom">Custom Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="hero" className="w-full mt-6" onClick={() => setHasRun(true)}>
                <Play className="w-4 h-4" />
                Run Analysis
              </Button>
            </div>

            {/* Info Card */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">About Factor Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    The Fama-French 3-Factor model decomposes returns into market risk (beta),
                    size (SMB), and value (HML) factors to explain portfolio performance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {hasRun ? (
              <>
                {/* Factor Exposures Chart */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Factor Loadings</h2>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={factorChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          domain={[-0.5, 1.5]}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          width={100}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Regression Results */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h2 className="text-lg font-semibold">Factor Coefficients</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Factor</th>
                            <th className="text-right">Loading</th>
                            <th className="text-right">t-stat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {factorExposures.map((factor) => (
                            <tr key={factor.factor}>
                              <td className="font-medium">{factor.factor}</td>
                              <td className="text-right font-mono">
                                <span
                                  className={
                                    factor.exposure >= 0 ? "text-primary" : "text-destructive"
                                  }
                                >
                                  {factor.exposure.toFixed(2)}
                                </span>
                              </td>
                              <td className="text-right font-mono text-muted-foreground">
                                {factor.tStat.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-border">
                      <h2 className="text-lg font-semibold">Regression Statistics</h2>
                    </div>
                    <div className="p-4 space-y-3">
                      {regressionStats.slice(0, 4).map((stat) => (
                        <div key={stat.name} className="flex justify-between items-center">
                          <span className="text-muted-foreground text-sm">
                            <MetricTooltip metric={stat.name}>{stat.name}</MetricTooltip>
                          </span>
                          <span className="font-mono font-medium">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alpha Analysis */}
                <div className="glass rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-semibold">Alpha Generation</h2>
                      <p className="text-sm text-muted-foreground">
                        Actual vs. predicted returns based on factor exposures
                      </p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="predictedReturn"
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          label={{ value: "Predicted Return (%)", position: "bottom", offset: -5 }}
                          domain={[-6, 6]}
                        />
                        <YAxis
                          dataKey="portfolioReturn"
                          type="number"
                          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                          label={{ value: "Actual Return (%)", angle: -90, position: "left" }}
                          domain={[-6, 6]}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Scatter
                          data={alphaScatter}
                          fill="hsl(160, 84%, 39%)"
                          fillOpacity={0.6}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Next Step Suggestion */}
                <ToolSuggestion 
                  tool="monte-carlo" 
                  context="Run Monte Carlo simulation with factor-adjusted returns" 
                />
              </>
            ) : (
              <div className="glass rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Enter your portfolio details and click "Run Analysis" to see factor exposures.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FactorAnalysis;
