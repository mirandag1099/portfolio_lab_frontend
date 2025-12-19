import { Button } from "@/components/ui/button";
import { Download, FileText, Lock, Sparkles } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";

interface Holding {
  ticker: string;
  weight: number;
}

interface ReportPreviewProps {
  holdings: Holding[];
  portfolioName?: string;
}

const COLORS = ["hsl(220 90% 56%)", "hsl(38 92% 50%)", "hsl(142 76% 36%)", "hsl(280 65% 60%)", "hsl(0 84% 60%)"];

const mockPerformance = [
  { date: "Jan", value: 10000 },
  { date: "Feb", value: 10200 },
  { date: "Mar", value: 9800 },
  { date: "Apr", value: 10500 },
  { date: "May", value: 11200 },
  { date: "Jun", value: 10900 },
  { date: "Jul", value: 11800 },
  { date: "Aug", value: 12100 },
  { date: "Sep", value: 11600 },
  { date: "Oct", value: 12400 },
  { date: "Nov", value: 13100 },
  { date: "Dec", value: 13800 },
];

export const ReportPreview = ({ holdings, portfolioName = "My Portfolio" }: ReportPreviewProps) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const pieData = holdings.map((h, i) => ({
    name: h.ticker,
    value: h.weight,
    color: COLORS[i % COLORS.length],
  }));

  // Mock asset allocation data
  const assetAllocation = [
    { type: "US Equities", weight: 62.4, benchmark: 65.0 },
    { type: "Intl Equities", weight: 18.2, benchmark: 20.0 },
    { type: "Fixed Income", weight: 12.8, benchmark: 10.0 },
    { type: "Cash", weight: 4.1, benchmark: 3.0 },
    { type: "Other", weight: 2.5, benchmark: 2.0 },
  ];

  // Mock sectors
  const sectors = [
    { name: "Technology", weight: 28.4, benchmark: 26.1 },
    { name: "Healthcare", weight: 14.2, benchmark: 13.8 },
    { name: "Financials", weight: 12.8, benchmark: 14.2 },
    { name: "Consumer Cyclical", weight: 11.3, benchmark: 10.5 },
    { name: "Industrials", weight: 9.7, benchmark: 8.9 },
    { name: "Communication", weight: 8.4, benchmark: 9.2 },
  ];

  // Mock regions
  const regions = [
    { name: "North America", weight: 68.5 },
    { name: "Europe", weight: 14.2 },
    { name: "Asia Pacific", weight: 12.1 },
    { name: "Emerging Markets", weight: 5.2 },
  ];

  // Style box grid (3x3)
  const styleBox = [
    [0, 12, 45],
    [2, 8, 18],
    [0, 5, 10],
  ];

  return (
    <div className="relative">
      {/* Report Preview Container */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-xl">
        {/* Report Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-lg">Portfolio X-Ray Report</h3>
                <p className="text-xs text-muted-foreground">Generated {currentDate}</p>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="font-mono">Page 1 of 3</p>
            </div>
          </div>
        </div>

        {/* Report Title Bar */}
        <div className="bg-primary text-primary-foreground px-4 py-2">
          <h2 className="font-display text-sm tracking-wide uppercase">{portfolioName}</h2>
        </div>

        {/* Report Content Preview */}
        <div className="p-4 text-xs space-y-4">
          {/* Account Overview Row */}
          <div className="grid grid-cols-4 gap-3 text-[10px]">
            <div>
              <p className="text-muted-foreground">Portfolio Value</p>
              <p className="font-mono font-semibold text-sm">$847,234.56</p>
            </div>
            <div>
              <p className="text-muted-foreground">Benchmark</p>
              <p className="font-mono font-semibold text-sm">S&P 500 TR</p>
            </div>
            <div>
              <p className="text-muted-foreground">Report Currency</p>
              <p className="font-mono font-semibold text-sm">USD</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fee Type</p>
              <p className="font-mono font-semibold text-sm">Net of Fees</p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Asset Allocation */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">Asset Allocation</h4>
              </div>
              <div className="flex gap-3">
                <div className="w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={15}
                        outerRadius={35}
                        dataKey="weight"
                      >
                        {assetAllocation.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-0.5">
                  {assetAllocation.map((item, i) => (
                    <div key={item.type} className="flex items-center gap-1 text-[9px]">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="flex-1 truncate">{item.type}</span>
                      <span className="font-mono">{item.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Equity Style Box */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <div className="w-1 h-3 bg-success rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">Equity Style Box</h4>
              </div>
              <div className="flex gap-3 items-start">
                <div className="grid grid-cols-3 gap-px bg-border p-px rounded">
                  {styleBox.map((row, ri) =>
                    row.map((val, ci) => (
                      <div
                        key={`${ri}-${ci}`}
                        className="w-6 h-5 flex items-center justify-center text-[8px] font-mono"
                        style={{
                          backgroundColor: val > 20 ? "hsl(var(--primary))" : val > 5 ? "hsl(var(--primary) / 0.5)" : "hsl(var(--muted))",
                          color: val > 20 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                        }}
                      >
                        {val}
                      </div>
                    ))
                  )}
                </div>
                <div className="text-[8px] text-muted-foreground">
                  <div className="flex justify-between gap-6 mb-1">
                    <span>Value</span>
                    <span>Core</span>
                    <span>Growth</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span>Large</span>
                    <span>Mid</span>
                    <span>Small</span>
                  </div>
                </div>
              </div>
            </div>

            {/* World Regions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <div className="w-1 h-3 bg-warning rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">World Regions</h4>
              </div>
              <div className="space-y-1">
                {regions.map((region) => (
                  <div key={region.name} className="flex items-center gap-2 text-[9px]">
                    <span className="flex-1">{region.name}</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${region.weight}%` }}
                      />
                    </div>
                    <span className="font-mono w-10 text-right">{region.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 border-b border-border pb-1">
              <div className="w-1 h-3 bg-chart-4 rounded-full" />
              <h4 className="font-semibold text-[11px] uppercase tracking-wide">Performance (12-Month)</h4>
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPerformance} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 500", "dataMax + 500"]} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1.5}
                    fill="url(#reportGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sectors & Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Sector Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <div className="w-1 h-3 bg-destructive rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">Sector Breakdown</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {sectors.map((sector) => (
                  <div key={sector.name} className="flex items-center justify-between text-[9px]">
                    <span className="truncate">{sector.name}</span>
                    <span className="font-mono">{sector.weight}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Statistics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1">
                <div className="w-1 h-3 bg-info rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">Key Statistics</h4>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="font-mono">21.4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P/B Ratio</span>
                  <span className="font-mono">3.82</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yield</span>
                  <span className="font-mono">1.47%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ROE</span>
                  <span className="font-mono">18.6%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expense Ratio</span>
                  <span className="font-mono">0.08%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Turnover</span>
                  <span className="font-mono">4%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Holdings Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <h4 className="font-semibold text-[11px] uppercase tracking-wide">Top 10 Holdings</h4>
              </div>
              <span className="text-[9px] text-muted-foreground">out of {holdings.length} total</span>
            </div>
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-1 font-medium">Symbol</th>
                  <th className="text-left py-1 font-medium">Name</th>
                  <th className="text-right py-1 font-medium">Type</th>
                  <th className="text-right py-1 font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {holdings.slice(0, 5).map((holding, i) => (
                  <tr key={holding.ticker} className="border-b border-border/50">
                    <td className="py-1 font-mono font-medium">{holding.ticker}</td>
                    <td className="py-1 text-muted-foreground">
                      {holding.ticker === "VTI" && "Vanguard Total Stock Market"}
                      {holding.ticker === "VXUS" && "Vanguard Total Intl Stock"}
                      {holding.ticker === "BND" && "Vanguard Total Bond Market"}
                      {holding.ticker === "QQQ" && "Invesco QQQ Trust"}
                      {holding.ticker === "VNQ" && "Vanguard Real Estate"}
                      {!["VTI", "VXUS", "BND", "QQQ", "VNQ"].includes(holding.ticker) && `${holding.ticker} Fund`}
                    </td>
                    <td className="py-1 text-right font-mono">ETF</td>
                    <td className="py-1 text-right font-mono">{holding.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fade overlay for "preview" effect */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
      </div>

      {/* CTA Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>Full report preview</span>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" className="gap-2">
            <Download className="w-4 h-4" />
            Download Full Report (PDF)
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Customize Report
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          Generate institutional-quality portfolio reports like Morningstar — completely free.
          Include performance analytics, risk metrics, holdings breakdown, and more.
        </p>
      </div>
    </div>
  );
};
