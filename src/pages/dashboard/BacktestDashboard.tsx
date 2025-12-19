import { useState, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Download,
  Play,
  Save,
  Calendar,
  Scale,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { HoldingRow, Holding } from "@/components/portfolio/HoldingRow";
import { CSVUpload } from "@/components/portfolio/CSVUpload";
import { PortfolioValidation } from "@/components/portfolio/PortfolioValidation";
import { usePortfolioValidation } from "@/hooks/usePortfolioValidation";
import { useToast } from "@/hooks/use-toast";
import { ToolNavigation, ToolSuggestion } from "@/components/dashboard/ToolNavigation";
import { ToolIntro, toolIntros } from "@/components/dashboard/ToolIntro";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { LineChart as LineChartIcon } from "lucide-react";

const backtestResults = [
  { date: "2005", portfolio: 10000, benchmark: 10000 },
  { date: "2008", portfolio: 7200, benchmark: 6500 },
  { date: "2010", portfolio: 12400, benchmark: 10800 },
  { date: "2015", portfolio: 28500, benchmark: 22400 },
  { date: "2020", portfolio: 52000, benchmark: 38000 },
  { date: "2024", portfolio: 98500, benchmark: 68000 },
];

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const getDateYearsAgo = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return formatDate(date);
};

const BacktestDashboard = () => {
  const { toast } = useToast();
  const [holdings, setHoldings] = useState<Holding[]>([
    { symbol: "VT", name: "Vanguard Total World Stock", allocation: 100 },
  ]);
  const [rebalancing, setRebalancing] = useState("none");
  const [initialValue, setInitialValue] = useState("10000");
  const [benchmark, setBenchmark] = useState("SPY");
  const [showResults, setShowResults] = useState(false);
  const [startDate, setStartDate] = useState(getDateYearsAgo(10));
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const validation = usePortfolioValidation(holdings);

  const addHolding = () => {
    setHoldings([...holdings, { symbol: "", name: "", allocation: 0 }]);
  };

  const removeHolding = (index: number) => {
    if (holdings.length > 1) {
      setHoldings(holdings.filter((_, i) => i !== index));
    }
  };

  const updateHolding = (index: number, field: keyof Holding, value: string | number) => {
    const newHoldings = [...holdings];
    newHoldings[index] = { ...newHoldings[index], [field]: value };
    setHoldings(newHoldings);
  };

  const setEqualAllocation = () => {
    const equalAlloc = parseFloat((100 / holdings.length).toFixed(2));
    const remainder = parseFloat((100 - equalAlloc * holdings.length).toFixed(2));
    setHoldings(
      holdings.map((h, i) => ({
        ...h,
        allocation: i === 0 ? equalAlloc + remainder : equalAlloc,
      }))
    );
    toast({
      title: "Weights Recalculated",
      description: `Each asset set to ${equalAlloc.toFixed(2)}%`,
    });
  };

  const handleCSVUpload = (uploadedHoldings: Holding[]) => {
    setHoldings(uploadedHoldings);
    toast({
      title: "CSV Imported",
      description: `Loaded ${uploadedHoldings.length} assets from CSV`,
    });
  };

  const handleRunBacktest = () => {
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in your portfolio before running backtest.",
        variant: "destructive",
      });
      return;
    }
    setShowResults(true);
    toast({
      title: "Backtest Running",
      description: "Processing your portfolio against historical data...",
    });
  };

  const exportCSV = () => {
    const csv = ["Ticker,Name,Weight"];
    holdings.forEach((h) => {
      csv.push(`${h.symbol},"${h.name}",${h.allocation}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTimeframePreset = (yearsAgo: number) => {
    setStartDate(getDateYearsAgo(yearsAgo));
  };

  const handleEndDatePreset = (preset: "today" | "startOfYear") => {
    if (preset === "today") {
      setEndDate(formatDate(new Date()));
    } else {
      const startOfYear = new Date();
      startOfYear.setMonth(0, 1);
      setEndDate(formatDate(startOfYear));
    }
  };

  const clearAllHoldings = () => {
    setHoldings([{ symbol: "", name: "", allocation: 0 }]);
    toast({
      title: "Holdings Cleared",
      description: "All assets have been removed",
    });
  };

  return (
    <DashboardLayout
      title="Portfolio Backtesting"
      description="Test your portfolio against historical data with customizable rebalancing options"
    >
      {/* Tool Navigation */}
      <div className="mb-6">
        <ToolNavigation />
      </div>

      {/* Tool Introduction */}
      <div className="mb-6">
        <ToolIntro
          icon={LineChartIcon}
          title={toolIntros.backtest.title}
          description={toolIntros.backtest.description}
          benefits={toolIntros.backtest.benefits}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Portfolio Tab Header */}
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 border-b border-border pb-4 mb-4">
                <Button variant="hero" size="sm">
                  My Strategy
                </Button>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Portfolio
                </Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <CSVUpload onUpload={handleCSVUpload} />
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Select defaultValue="popular">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Popular Portfolios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular Portfolios</SelectItem>
                    <SelectItem value="buffett">Warren Buffett 90/10</SelectItem>
                    <SelectItem value="dalio">All Weather</SelectItem>
                    <SelectItem value="boglehead">Three Fund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Holdings Table */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Holdings</CardTitle>
                <Button variant="ghost" size="sm" onClick={setEqualAllocation}>
                  <Scale className="w-4 h-4 mr-1" />
                  Recalculate Equal Weights
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {holdings.map((holding, idx) => (
                  <HoldingRow
                    key={idx}
                    index={idx}
                    holding={holding}
                    onUpdate={updateHolding}
                    onRemove={removeHolding}
                    canRemove={holdings.length > 1}
                    errors={
                      validation.errors.get(idx)
                        ? {
                            symbol: validation.errors.get(idx)?.symbol,
                            allocation: validation.errors.get(idx)?.allocation,
                            duplicate: validation.errors.get(idx)?.duplicate,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addHolding}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Asset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={clearAllHoldings}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove All
                </Button>
              </div>

              {/* Validation Status */}
              <div className="pt-4 border-t border-border">
                <PortfolioValidation
                  totalWeight={validation.totalWeight}
                  hasEmptyTickers={validation.hasEmptyTickers}
                  hasDuplicates={validation.hasDuplicates}
                  hasInvalidWeights={validation.hasInvalidWeights}
                />
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Options */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Portfolio Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Use Shares</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label>Custom Expected Returns</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label>Custom Volatility</Label>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Rebalancing Options */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Rebalancing & Cash Flow Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rebalancing</Label>
                  <Select value={rebalancing} onValueChange={setRebalancing}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="threshold">Threshold (5%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Value ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={initialValue}
                    onChange={(e) => setInitialValue(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Run Backtest Button */}
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleRunBacktest}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Backtest
          </Button>

          {/* Results Section */}
          {showResults && (
            <Card className="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Backtest Results</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={backtestResults}>
                      <defs>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
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
                        stroke="hsl(var(--primary))"
                        fill="url(#portfolioGrad)"
                        name="Portfolio"
                      />
                      <Line
                        type="monotone"
                        dataKey="benchmark"
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="5 5"
                        name="Benchmark (SPY)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="CAGR" value="12.4%" positive tooltip />
                  <MetricCard label="Sharpe Ratio" value="1.24" positive tooltip />
                  <MetricCard label="Max Drawdown" value="-28.0%" tooltip />
                  <MetricCard label="Sortino Ratio" value="1.86" positive tooltip />
                  <MetricCard label="Annualized Volatility" value="15.2%" tooltip />
                  <MetricCard label="Best Year" value="+32.4%" positive tooltip />
                  <MetricCard label="Worst Year" value="-28.0%" tooltip />
                  <MetricCard label="Correlation" value="0.92" tooltip />
                </div>

                {/* Next Step Suggestion */}
                <div className="pt-4 border-t border-border">
                  <ToolSuggestion 
                    tool="optimization" 
                    context="Optimize this portfolio" 
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Timeframe & Options */}
        <div className="space-y-4">
          {/* Timeframe */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Timeframe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: "1Y", years: 1 },
                    { label: "3Y", years: 3 },
                    { label: "5Y", years: 5 },
                    { label: "7Y", years: 7 },
                    { label: "10Y", years: 10 },
                    { label: "20Y", years: 20 },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleTimeframePreset(preset.years)}
                    >
                      {preset.label} Ago
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleEndDatePreset("startOfYear")}
                  >
                    Start of Year
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleEndDatePreset("today")}
                  >
                    Today
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Options */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>Financial Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Benchmark</Label>
                <Select value={benchmark} onValueChange={setBenchmark}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPY">S&P 500 (SPY)</SelectItem>
                    <SelectItem value="VT">Total World (VT)</SelectItem>
                    <SelectItem value="QQQ">NASDAQ-100 (QQQ)</SelectItem>
                    <SelectItem value="BND">Total Bond (BND)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["SPY", "VT", "VWCE", "BTC"].map((b) => (
                    <Button
                      key={b}
                      variant={benchmark === b ? "hero" : "outline"}
                      size="sm"
                      className="text-xs"
                      onClick={() => setBenchmark(b)}
                    >
                      {b}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Base Currency</Label>
                <Select defaultValue="USD">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

const MetricCard = ({
  label,
  value,
  positive,
  tooltip,
}: {
  label: string;
  value: string;
  positive?: boolean;
  tooltip?: boolean;
}) => (
  <div className="p-4 rounded-lg bg-muted/50">
    <p className="text-xs text-muted-foreground mb-1">
      {tooltip ? <MetricTooltip metric={label}>{label}</MetricTooltip> : label}
    </p>
    <p className={`text-lg font-bold ${positive ? "text-green-500" : ""}`}>{value}</p>
  </div>
);

export default BacktestDashboard;
