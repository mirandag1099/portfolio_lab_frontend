import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  ArrowRight,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ToolNavigation, ToolSuggestion } from "@/components/dashboard/ToolNavigation";
import { ToolIntro, toolIntros } from "@/components/dashboard/ToolIntro";
import { MetricTooltip } from "@/components/ui/metric-tooltip";

const efficientFrontierData = [
  { volatility: 6, return: 4.2 },
  { volatility: 8, return: 6.8 },
  { volatility: 10, return: 8.9 },
  { volatility: 12, return: 10.5, label: "Optimal" },
  { volatility: 14, return: 11.6 },
  { volatility: 16, return: 12.4 },
  { volatility: 18, return: 12.9 },
  { volatility: 20, return: 13.2 },
];

const currentPortfolio = { volatility: 14.2, return: 11.8 };
const suggestedPortfolio = { volatility: 12, return: 10.5 };

const optimizationSuggestions = [
  {
    action: "swap",
    from: { symbol: "VTI", allocation: 50, name: "US Total Market" },
    to: { symbol: "VT", allocation: 45, name: "Total World Stock" },
    reason: "Reduce US concentration, improve international diversification",
    impact: { sharpe: "+0.12", volatility: "-1.2%", expectedReturn: "-0.3%" },
  },
  {
    action: "add",
    from: null,
    to: { symbol: "BNDX", allocation: 10, name: "Int'l Bonds" },
    reason: "FF3 analysis shows low bond exposure, adding reduces correlation",
    impact: { sharpe: "+0.08", volatility: "-2.1%", expectedReturn: "-0.5%" },
  },
  {
    action: "reduce",
    from: { symbol: "QQQ", allocation: 30, name: "NASDAQ-100" },
    to: { symbol: "QQQ", allocation: 20, name: "NASDAQ-100" },
    reason: "High momentum factor loading, overexposed to tech sector risk",
    impact: { sharpe: "+0.05", volatility: "-1.8%", expectedReturn: "-0.8%" },
  },
];

const OptimizationDashboard = () => {
  const [optimizationGoal, setOptimizationGoal] = useState("sharpe");

  return (
    <DashboardLayout
      title="Portfolio Optimization"
      description="Find the optimal asset allocation using modern portfolio theory"
    >
      {/* Tool Navigation */}
      <div className="mb-6">
        <ToolNavigation />
      </div>

      {/* Tool Introduction */}
      <div className="mb-6">
        <ToolIntro
          icon={Target}
          title={toolIntros.optimization.title}
          description={toolIntros.optimization.description}
          benefits={toolIntros.optimization.benefits}
        />
      </div>

      <Tabs defaultValue="efficient-frontier" className="space-y-6">
        <TabsList className="tabs-modern max-w-lg grid grid-cols-3">
          <TabsTrigger value="efficient-frontier" className="tab-trigger-modern">Efficient Frontier</TabsTrigger>
          <TabsTrigger value="suggestions" className="tab-trigger-modern">Suggestions</TabsTrigger>
          <TabsTrigger value="factor-based" className="tab-trigger-modern">Factor-Based</TabsTrigger>
        </TabsList>

        <TabsContent value="efficient-frontier" className="space-y-6">
          {/* Optimization Controls */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-elevated p-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Optimization Goal</Label>
              <Select value={optimizationGoal} onValueChange={setOptimizationGoal}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sharpe">Max Sharpe Ratio</SelectItem>
                  <SelectItem value="min-vol">Min Volatility</SelectItem>
                  <SelectItem value="max-return">Max Return</SelectItem>
                  <SelectItem value="target-return">Target Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="card-elevated p-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Risk Tolerance</Label>
              <Select defaultValue="moderate">
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="card-elevated p-4">
              <Label className="text-sm text-muted-foreground mb-2 block">Constraints</Label>
              <Select defaultValue="none">
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No constraints</SelectItem>
                  <SelectItem value="long-only">Long only</SelectItem>
                  <SelectItem value="sector-limits">Sector limits</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Efficient Frontier Chart */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-lg">Efficient Frontier</h2>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Efficient Portfolios</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">Optimal</span>
                </div>
              </div>
            </div>
            <div className="h-96 frontier-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    type="number"
                    dataKey="volatility"
                    name="Volatility"
                    domain={[4, 22]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    label={{ value: "Volatility (%)", position: "bottom", offset: 20, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="return"
                    name="Return"
                    domain={[2, 16]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    label={{ value: "Expected Return (%)", angle: -90, position: "left", fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "var(--shadow-lg)",
                    }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "volatility" ? "Volatility" : "Return"]}
                  />
                  <Scatter
                    data={efficientFrontierData}
                    fill="hsl(var(--primary))"
                    line={{ stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                  <Scatter
                    data={[currentPortfolio]}
                    fill="hsl(var(--destructive))"
                    shape="star"
                  />
                  <Scatter
                    data={[suggestedPortfolio]}
                    fill="hsl(var(--success))"
                    shape="diamond"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-elevated p-6 border-destructive/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-display">Current Portfolio</h3>
              </div>
              <div className="space-y-3">
                <MetricRow label="Expected Return" value="11.8%" metric="Annual Return" />
                <MetricRow label="Volatility" value="14.2%" metric="Annualized Volatility" />
                <MetricRow label="Sharpe Ratio" value="1.18" metric="Sharpe Ratio" />
                <MetricRow label="Max Drawdown" value="-28.4%" metric="Max Drawdown" />
              </div>
            </div>
            <div className="card-elevated p-6 border-success/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <h3 className="font-display">Optimized Portfolio</h3>
              </div>
              <div className="space-y-3">
                <MetricRow label="Expected Return" value="10.5%" positive metric="Annual Return" />
                <MetricRow label="Volatility" value="12.0%" positive metric="Annualized Volatility" />
                <MetricRow label="Sharpe Ratio" value="1.38" positive metric="Sharpe Ratio" />
                <MetricRow label="Max Drawdown" value="-22.1%" positive metric="Max Drawdown" />
              </div>
            </div>
          </div>

          {/* Next Step Suggestion */}
          <ToolSuggestion 
            tool="factor-analysis" 
            context="Analyze factor exposures of optimized portfolio" 
          />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <div className="card-elevated p-6">
            <h2 className="font-display text-lg mb-2">Recommended Changes</h2>
            <p className="text-muted-foreground mb-6">
              Based on FF3 factor analysis and momentum indicators
            </p>
            <div className="space-y-4">
              {optimizationSuggestions.map((suggestion, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        {suggestion.action === "swap" && (
                          <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-info" />
                          </div>
                        )}
                        {suggestion.action === "add" && (
                          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-success" />
                          </div>
                        )}
                        {suggestion.action === "reduce" && (
                          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-warning" />
                          </div>
                        )}
                        <span className="font-medium capitalize">{suggestion.action}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mb-3">
                        {suggestion.from && (
                          <>
                            <span className="font-mono px-2 py-1 rounded-lg bg-destructive/10 text-destructive">
                              {suggestion.from.symbol} ({suggestion.from.allocation}%)
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </>
                        )}
                        <span className="font-mono px-2 py-1 rounded-lg bg-success/10 text-success">
                          {suggestion.to.symbol} ({suggestion.to.allocation}%)
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                      <div className="flex gap-2 mt-3">
                        <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary">
                          Sharpe {suggestion.impact.sharpe}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-lg bg-success/10 text-success">
                          Vol {suggestion.impact.volatility}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                          Return {suggestion.impact.expectedReturn}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Apply
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="default" size="lg" className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Apply All Recommendations
          </Button>
        </TabsContent>

        <TabsContent value="factor-based" className="space-y-6">
          <div className="card-elevated p-6">
            <h2 className="font-display text-lg mb-2">Factor-Based Optimization</h2>
            <p className="text-muted-foreground mb-6">
              Optimize based on Fama-French factor exposures and momentum
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Target Market Beta</Label>
                <div className="flex gap-2">
                  <Input type="number" defaultValue="1.0" step="0.1" className="rounded-xl" />
                  <span className="text-muted-foreground self-center font-mono">β</span>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Target Size Factor (SMB)</Label>
                <Input type="number" defaultValue="0.0" step="0.1" className="rounded-xl" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Target Value Factor (HML)</Label>
                <Input type="number" defaultValue="0.0" step="0.1" className="rounded-xl" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Target Momentum Factor</Label>
                <Input type="number" defaultValue="0.0" step="0.1" className="rounded-xl" />
              </div>
            </div>
            <Button variant="default" className="mt-6">
              <Target className="w-4 h-4 mr-2" />
              Optimize for Factors
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

const MetricRow = ({
  label,
  value,
  positive,
  metric,
}: {
  label: string;
  value: string;
  positive?: boolean;
  metric?: string;
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-muted-foreground">
      {metric ? <MetricTooltip metric={metric}>{label}</MetricTooltip> : label}
    </span>
    <span className={`font-display font-bold ${positive ? "text-success" : ""}`}>{value}</span>
  </div>
);

export default OptimizationDashboard;