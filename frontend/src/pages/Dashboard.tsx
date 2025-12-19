import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Upload,
  Plus,
  ArrowRight,
  BarChart3,
  PieChart,
  LineChart,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// Sample data
const portfolioGrowthData = [
  { month: "Jan", portfolio: 100000, benchmark: 100000 },
  { month: "Feb", portfolio: 102500, benchmark: 101200 },
  { month: "Mar", portfolio: 101800, benchmark: 99800 },
  { month: "Apr", portfolio: 108200, benchmark: 104500 },
  { month: "May", portfolio: 112400, benchmark: 107200 },
  { month: "Jun", portfolio: 115800, benchmark: 109800 },
  { month: "Jul", portfolio: 118200, benchmark: 112400 },
  { month: "Aug", portfolio: 116500, benchmark: 110200 },
  { month: "Sep", portfolio: 122800, benchmark: 115600 },
  { month: "Oct", portfolio: 128400, benchmark: 119800 },
  { month: "Nov", portfolio: 132100, benchmark: 123400 },
  { month: "Dec", portfolio: 138500, benchmark: 127200 },
];

const holdings = [
  { symbol: "VTI", name: "Vanguard Total Stock Market", allocation: 40, change: 2.34 },
  { symbol: "VXUS", name: "Vanguard Total International", allocation: 20, change: -0.87 },
  { symbol: "BND", name: "Vanguard Total Bond Market", allocation: 25, change: 0.12 },
  { symbol: "VNQ", name: "Vanguard Real Estate", allocation: 10, change: 1.56 },
  { symbol: "GLD", name: "SPDR Gold Shares", allocation: 5, change: 0.45 },
];

const Dashboard = () => {
  const [newSymbol, setNewSymbol] = useState("");

  const totalValue = 138500;
  const totalReturn = 38.5;
  const ytdReturn = 22.4;
  const volatility = 12.3;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Portfolio Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your investment portfolio performance
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              Import
            </Button>
            <Button variant="hero">
              <Plus className="w-4 h-4" />
              Add Holding
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Portfolio Value"
            value={`$${totalValue.toLocaleString()}`}
            change={totalReturn}
            icon={TrendingUp}
          />
          <StatCard
            title="Total Return"
            value={`${totalReturn.toFixed(1)}%`}
            change={totalReturn}
            icon={BarChart3}
          />
          <StatCard
            title="YTD Return"
            value={`${ytdReturn.toFixed(1)}%`}
            change={ytdReturn}
            icon={LineChart}
          />
          <StatCard
            title="Volatility"
            value={`${volatility.toFixed(1)}%`}
            change={-2.1}
            icon={PieChart}
            invertColor
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Portfolio Chart */}
          <div className="lg:col-span-2 glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Portfolio Performance</h2>
              <Select defaultValue="1y">
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1M</SelectItem>
                  <SelectItem value="3m">3M</SelectItem>
                  <SelectItem value="6m">6M</SelectItem>
                  <SelectItem value="1y">1Y</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioGrowthData}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
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
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fill="url(#portfolioGradient)"
                    name="Portfolio"
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name="S&P 500"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Analysis</h2>
              <div className="space-y-3">
                <Link
                  to="/backtest"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-primary" />
                    <span className="font-medium">Backtest</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/monte-carlo"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    <span className="font-medium">Monte Carlo</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/factor-analysis"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <PieChart className="w-5 h-5 text-primary" />
                    <span className="font-medium">Factor Analysis</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
                <Link
                  to="/optimization"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="font-medium">Optimize</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </div>
            </div>

            {/* Add Holding */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Add Holding</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter symbol (e.g., VTI)"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  className="uppercase"
                />
                <Button variant="hero" size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="mt-6 glass rounded-xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">Current Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th className="text-right">Allocation</th>
                  <th className="text-right">Today's Change</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => (
                  <tr key={holding.symbol}>
                    <td className="font-semibold text-primary">{holding.symbol}</td>
                    <td className="text-muted-foreground">{holding.name}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${holding.allocation}%` }}
                          />
                        </div>
                        <span className="w-12 text-right">{holding.allocation}%</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span
                        className={holding.change >= 0 ? "positive" : "negative"}
                      >
                        {holding.change >= 0 ? "+" : ""}
                        {holding.change.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  invertColor?: boolean;
}

const StatCard = ({ title, value, change, icon: Icon, invertColor }: StatCardProps) => {
  const isPositive = invertColor ? change < 0 : change >= 0;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <div className="flex items-center gap-1 text-sm">
        {isPositive ? (
          <TrendingUp className="w-4 h-4 text-primary" />
        ) : (
          <TrendingDown className="w-4 h-4 text-destructive" />
        )}
        <span className={isPositive ? "text-primary" : "text-destructive"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export default Dashboard;
