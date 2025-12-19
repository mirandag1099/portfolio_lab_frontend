import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { MonteCarloEmbed } from "@/components/charts/MonteCarloEmbed";
import { ProfessionalChart, CHART_COLORS } from "@/components/charts/ProfessionalChart";
import { 
  ArrowLeft, Download, Share2, TrendingUp, 
  PieChart, Activity, BarChart3, LineChart as LineChartIcon, 
  Shield, ChevronUp, FileText
} from "lucide-react";
import { ReportPreview } from "@/components/report/ReportPreview";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  ComposedChart,
  ReferenceLine,
  ZAxis,
  LabelList,
} from "recharts";

interface Holding {
  ticker: string;
  weight: number;
}

// Mock data generators
const generateReturnsData = () => {
  const data = [];
  let value = 10000;
  let benchmark = 10000;
  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (60 - i));
    const portfolioReturn = (Math.random() - 0.45) * 0.08;
    const benchmarkReturn = (Math.random() - 0.48) * 0.06;
    value *= (1 + portfolioReturn);
    benchmark *= (1 + benchmarkReturn);
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      portfolio: Math.round(value),
      benchmark: Math.round(benchmark),
    });
  }
  return data;
};

const generateDrawdownData = () => {
  const data = [];
  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (60 - i));
    const portfolioDrawdown = Math.random() * -35;
    const benchmarkDrawdown = Math.random() * -25;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      portfolio: portfolioDrawdown,
      benchmark: benchmarkDrawdown,
    });
  }
  return data;
};

const generateMonteCarloData = () => {
  const data = [];
  let median = 10000;
  let upper = 10000;
  let lower = 10000;
  for (let i = 0; i < 12; i++) {
    const month = new Date();
    month.setMonth(month.getMonth() + i);
    const growth = 1 + (Math.random() * 0.03);
    median *= growth;
    upper = median * (1 + Math.random() * 0.15);
    lower = median * (1 - Math.random() * 0.1);
    data.push({
      month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      median: Math.round(median),
      upper: Math.round(upper),
      lower: Math.round(lower),
      p5: Math.round(lower * 0.9),
      p95: Math.round(upper * 1.1),
    });
  }
  return data;
};

// Efficient frontier curve with more data points
const efficientFrontierData = [
  { volatility: 4.5, return: 3.2 },
  { volatility: 5, return: 4.2 },
  { volatility: 5.5, return: 5.0 },
  { volatility: 6, return: 5.7 },
  { volatility: 6.5, return: 6.3 },
  { volatility: 7, return: 6.8 },
  { volatility: 7.5, return: 7.3 },
  { volatility: 8, return: 7.8 },
  { volatility: 8.5, return: 8.2 },
  { volatility: 9, return: 8.6 },
  { volatility: 9.5, return: 8.9 },
  { volatility: 10, return: 9.3 },
  { volatility: 10.5, return: 9.6 },
  { volatility: 11, return: 9.9 },
  { volatility: 11.5, return: 10.2 },
  { volatility: 12, return: 10.4 },
  { volatility: 13, return: 10.8 },
  { volatility: 14, return: 11.1 },
  { volatility: 15, return: 11.3 },
  { volatility: 16, return: 11.5 },
  { volatility: 17, return: 11.6 },
  { volatility: 18, return: 11.7 },
  { volatility: 19, return: 11.75 },
  { volatility: 20, return: 11.8 },
];

// Individual asset positions
const assetPoints = [
  { volatility: 7.2, return: 3.5, name: "IEF", size: 180 },
  { volatility: 15.2, return: 4.2, name: "TLT", size: 180 },
  { volatility: 18.5, return: 8.8, name: "GLD", size: 180 },
  { volatility: 19.8, return: 2.1, name: "DBC", size: 180 },
  { volatility: 19.2, return: 11.9, name: "SPY", size: 180 },
  { volatility: 19.5, return: 11.8, name: "VTI", size: 180 },
];

// Optimal portfolio points on the frontier
const optimalPoints = [
  { volatility: 5.7, return: 5.5, name: "Min Volatility", size: 220 },
  { volatility: 7.0, return: 6.6, name: "Min cVaR", size: 220 },
  { volatility: 7.5, return: 6.9, name: "Max Sharpe", size: 280 },
  { volatility: 8.0, return: 7.2, name: "Max Sortino", size: 220 },
  { volatility: 8.8, return: 7.8, name: "Max Omega", size: 220 },
  { volatility: 13.7, return: 10.6, name: "Max Quadratic Utility", size: 220 },
  { volatility: 5.9, return: 5.7, name: "Min Max Drawdown", size: 220 },
];

// Key portfolio points
const myStrategyPoint = [{ volatility: 8.5, return: 6.6, name: "My Strategy", size: 400 }];
const benchmarkPoint = [{ volatility: 19.4, return: 10.5, name: "SPY (Benchmark)", size: 350 }];

const correlationAssets = ["VTI", "VXUS", "BND", "QQQ", "VNQ"];

const COLORS = [
  "hsl(220 90% 56%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 84% 60%)",
];

const sections = [
  { id: "summary", label: "Summary" },
  { id: "performance", label: "Performance" },
  { id: "risk", label: "Risk" },
  { id: "allocations", label: "Allocations" },
  { id: "montecarlo", label: "Monte Carlo" },
  { id: "frontier", label: "Frontier" },
  { id: "holdings", label: "Holdings" },
  { id: "report", label: "Report" },
];

// Generate Rolling Sharpe/Sortino data
const generateRollingData = () => {
  const data = [];
  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (60 - i));
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      portfolioSharpe: (Math.random() * 4 - 0.5).toFixed(2),
      benchmarkSharpe: (Math.random() * 3.5 - 0.5).toFixed(2),
      portfolioSortino: (Math.random() * 6 - 1).toFixed(2),
      benchmarkSortino: (Math.random() * 5 - 1).toFixed(2),
    });
  }
  return data;
};

// Generate Rolling Volatility/Beta data
const generateRollingRiskData = () => {
  const data = [];
  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (60 - i));
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      portfolioVol: (Math.random() * 15 + 5).toFixed(1),
      benchmarkVol: (Math.random() * 12 + 10).toFixed(1),
      portfolioBeta: (Math.random() * 0.8 + 0.1).toFixed(2),
    });
  }
  return data;
};

const alternativeAllocations = [
  { strategy: "Provided Allocation", name: "My Strategy", cumReturn: "231.5%", cagr: "6.6%", volatility: "8.5%", sharpe: "0.79" },
  { strategy: "Max Sharpe", name: "My Strategy", cumReturn: "233.5%", cagr: "6.6%", volatility: "7.0%", sharpe: "0.95" },
  { strategy: "Max Sortino", name: "My Strategy", cumReturn: "250.3%", cagr: "6.9%", volatility: "7.5%", sharpe: "0.92" },
  { strategy: "Max Omega", name: "My Strategy", cumReturn: "207.7%", cagr: "6.1%", volatility: "8.9%", sharpe: "0.71" },
  { strategy: "Max Quadratic Utility", name: "My Strategy", cumReturn: "450.4%", cagr: "9.5%", volatility: "13.7%", sharpe: "0.73" },
  { strategy: "Min Volatility", name: "My Strategy", cumReturn: "137.5%", cagr: "4.7%", volatility: "5.7%", sharpe: "0.83" },
  { strategy: "Min cVaR", name: "My Strategy", cumReturn: "54.1%", cagr: "2.3%", volatility: "6.9%", sharpe: "0.37" },
  { strategy: "Min Max Drawdown", name: "My Strategy", cumReturn: "91.7%", cagr: "3.5%", volatility: "5.9%", sharpe: "0.61" },
  { strategy: "SPY", name: "Benchmark", cumReturn: "563.3%", cagr: "10.5%", volatility: "19.4%", sharpe: "0.61" },
];

const worstDrawdowns = [
  { rank: 1, start: "2007-10-11", end: "2009-02-27", recovery: "2013-01-18", length: 1560, drawdown: "-52.4%" },
  { rank: 2, start: "2020-02-13", end: "2020-03-23", recovery: "2020-08-04", length: 173, drawdown: "-21.8%" },
  { rank: 3, start: "2022-01-03", end: "2022-10-12", recovery: "2024-02-15", length: 773, drawdown: "-18.6%" },
  { rank: 4, start: "2018-09-21", end: "2018-12-24", recovery: "2019-04-12", length: 203, drawdown: "-13.2%" },
  { rank: 5, start: "2015-07-20", end: "2016-02-11", recovery: "2016-07-08", length: 354, drawdown: "-11.4%" },
];

const PortfolioResults = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [returnsData] = useState(generateReturnsData);
  const [drawdownData] = useState(generateDrawdownData);
  const [monteCarloData] = useState(generateMonteCarloData);
  const [rollingData] = useState(generateRollingData);
  const [rollingRiskData] = useState(generateRollingRiskData);
  const [activeSection, setActiveSection] = useState("summary");
  const [perfTab, setPerfTab] = useState<"cumulative" | "volAdj" | "rollingSharpe" | "rollingSortino">("cumulative");
  const [riskTab, setRiskTab] = useState<"drawdowns" | "worstDrawdowns" | "rollingVol" | "rollingBeta">("drawdowns");
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const stored = sessionStorage.getItem("portfolioHoldings");
    if (stored) {
      setHoldings(JSON.parse(stored));
    } else {
      setHoldings([
        { ticker: "VTI", weight: 40 },
        { ticker: "VXUS", weight: 20 },
        { ticker: "BND", weight: 20 },
        { ticker: "QQQ", weight: 15 },
        { ticker: "VNQ", weight: 5 },
      ]);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      for (const section of sections) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const offset = 100;
      const top = element.offsetTop - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const periodReturns = [
    { period: "1M", portfolio: -2.34, benchmark: -3.12 },
    { period: "3M", portfolio: 4.56, benchmark: 3.21 },
    { period: "YTD", portfolio: 12.87, benchmark: 10.45 },
    { period: "1Y", portfolio: 18.23, benchmark: 14.67 },
    { period: "3Y", portfolio: 42.15, benchmark: 35.89 },
    { period: "5Y", portfolio: 89.34, benchmark: 72.45 },
  ];

  const performanceMetrics = [
    { metric: "Cumulative Return", portfolio: "231.5%", benchmark: "563.3%" },
    { metric: "CAGR", portfolio: "6.6%", benchmark: "10.5%" },
    { metric: "Annual Return", portfolio: "6.5%", benchmark: "10.5%" },
    { metric: "Monthly Return", portfolio: "10.5%", benchmark: "17.1%" },
    { metric: "Daily Return", portfolio: "0.0%", benchmark: "0.0%" },
    { metric: "Sharpe Ratio", portfolio: "0.79", benchmark: "0.61" },
    { metric: "Sortino Ratio", portfolio: "1.12", benchmark: "0.86" },
    { metric: "Omega Ratio", portfolio: "1.15", benchmark: "1.13" },
    { metric: "Calmar Ratio", portfolio: "0.26", benchmark: "0.19" },
    { metric: "Recovery Factor", portfolio: "5.01", benchmark: "4.07" },
    { metric: "Ulcer Performance", portfolio: "1.06", benchmark: "0.91" },
    { metric: "Serenity Ratio", portfolio: "0.63", benchmark: "0.59" },
  ];

  const riskMetrics = [
    { metric: "Annualized Volatility", portfolio: "8.5%", benchmark: "19.4%" },
    { metric: "Max Drawdown", portfolio: "-25.3%", benchmark: "-55.2%" },
    { metric: "Longest Drawdown", portfolio: "979 days", benchmark: "1772 days" },
    { metric: "Ulcer Index", portfolio: "6.3%", benchmark: "13.1%" },
    { metric: "Value at Risk (95%)", portfolio: "-0.9%", benchmark: "-2.0%" },
    { metric: "CVaR", portfolio: "-1.3%", benchmark: "-3.2%" },
    { metric: "Risk of Ruin", portfolio: "0.0%", benchmark: "0.0%" },
    { metric: "Kelly Criterion", portfolio: "7.0%", benchmark: "6.3%" },
  ];

  const detailedReturns = [
    { metric: "Best Day", portfolio: "4.4%", benchmark: "14.5%" },
    { metric: "Worst Day", portfolio: "-4.8%", benchmark: "-10.9%" },
    { metric: "Best Month", portfolio: "44.7%", benchmark: "60.5%" },
    { metric: "Worst Month", portfolio: "-13.0%", benchmark: "-12.6%" },
    { metric: "Best Year", portfolio: "19.8%", benchmark: "32.3%" },
    { metric: "Worst Year", portfolio: "-20.8%", benchmark: "-36.8%" },
    { metric: "MTD Return", portfolio: "-3.4%", benchmark: "-2.4%" },
    { metric: "3M Return", portfolio: "-1.1%", benchmark: "2.9%" },
    { metric: "6M Return", portfolio: "5.7%", benchmark: "8.4%" },
    { metric: "YTD Return", portfolio: "13.0%", benchmark: "24.9%" },
    { metric: "1Y Return", portfolio: "13.0%", benchmark: "24.9%" },
    { metric: "3Y Return (ann.)", portfolio: "2.8%", benchmark: "11.9%" },
    { metric: "5Y Return (ann.)", portfolio: "5.1%", benchmark: "14.3%" },
    { metric: "10Y Return (ann.)", portfolio: "6.0%", benchmark: "12.9%" },
  ];

  const benchmarkComparison = [
    { metric: "Alpha", portfolio: "0.04" },
    { metric: "Beta", portfolio: "0.21" },
    { metric: "Correlation", portfolio: "47.0%" },
    { metric: "Treynor Ratio", portfolio: "0.33" },
    { metric: "Information Ratio", portfolio: "-0.30" },
  ];

  const benchmarkStats = [
    { metric: "Alpha", value: "0.04" },
    { metric: "Beta", value: "0.21" },
    { metric: "Correlation", value: "47.0%" },
    { metric: "Treynor", value: "0.33" },
    { metric: "Info Ratio", value: "-0.30" },
  ];

  const monteCarloMetrics = [
    { metric: "Expected Return", portfolio: "40.1%", benchmark: "15.8%" },
    { metric: "Volatility", portfolio: "31.8%", benchmark: "21.1%" },
    { metric: "Final (25th)", portfolio: "$16,793", benchmark: "$15,964" },
    { metric: "Final (Median)", portfolio: "$19,409", benchmark: "$17,451" },
    { metric: "Final (75th)", portfolio: "$22,749", benchmark: "$19,177" },
    { metric: "P(Positive)", portfolio: "82.3%", benchmark: "74.5%" },
  ];

  const pieData = holdings.map((h, i) => ({
    name: h.ticker,
    value: h.weight,
    color: COLORS[i % COLORS.length],
  }));

  const formatDiff = (portfolio: number, benchmark: number) => {
    const diff = portfolio - benchmark;
    return diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;
  };

  return (
    <DashboardLayout title="Portfolio Analysis" description="Complete analysis report">
      {/* Sticky Navigation */}
      <div className="sticky top-16 z-40 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b border-border mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              New
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION: Summary */}
      <section
        id="summary"
        ref={(el) => (sectionRefs.current["summary"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <PieChart className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Summary</h2>
        </div>

        {/* Summary Header */}
        <div className="bg-muted/30 rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground">Start Date</span>
            <span className="block font-medium">2006-02-06</span>
          </div>
          <div>
            <span className="text-muted-foreground">End Date</span>
            <span className="block font-medium">2024-12-31</span>
          </div>
          <div>
            <span className="text-muted-foreground">Benchmark</span>
            <span className="block font-medium">SPY</span>
          </div>
          <div>
            <span className="text-muted-foreground">Currency</span>
            <span className="block font-medium">USD</span>
          </div>
          <div>
            <span className="text-muted-foreground">Risk-free Rate</span>
            <span className="block font-medium">0.0%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Reinvest Dividends</span>
            <span className="block font-medium">Yes</span>
          </div>
        </div>

        {/* Return Metrics Cards */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-3">Return</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Final Value" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">$33,146</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">-50.0%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: $66,328</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Cumulative Return" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">231.5%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">-331.8%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 563.3%</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="CAGR" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">6.6%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">-4.0%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 10.5%</p>
            </div>
          </div>
        </div>

        {/* Risk Metrics Cards */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Risk</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Annualized Volatility" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">8.5%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">-10.9%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 19.4%</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Max Drawdown" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold text-destructive">-25.3%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">+29.9%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: -55.2%</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Ulcer Index" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">6.3%</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">-6.8%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 13.1%</p>
            </div>
          </div>
        </div>

        {/* Ratio Metrics Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Sharpe Ratio" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">0.79</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">+17.7%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 0.61</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Sortino Ratio" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">1.12</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">+25.5%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 0.86</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Calmar Ratio" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">0.26</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">+6.8%</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: 0.19</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Allocation */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-medium mb-3">Allocation</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Weight"]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-mono">{item.name}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Period Returns */}
          <div className="card-elevated p-5 lg:col-span-2">
            <h3 className="text-sm font-medium mb-3">Period Returns</h3>
            <div className="grid grid-cols-6 gap-2">
              {periodReturns.map((item) => (
                <div key={item.period} className="text-center p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">{item.period}</span>
                  <span className={`font-mono text-sm font-medium block ${item.portfolio >= 0 ? "text-success" : "text-destructive"}`}>
                    {item.portfolio >= 0 ? "+" : ""}{item.portfolio.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] block mt-1 ${item.portfolio > item.benchmark ? "text-success" : "text-destructive"}`}>
                    {formatDiff(item.portfolio, item.benchmark)}
                  </span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
              {benchmarkStats.map((item) => (
                <div key={item.metric} className="text-center">
                  <span className="text-[10px] text-muted-foreground uppercase block">{item.metric}</span>
                  <span className="font-mono text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Performance */}
      <section
        id="performance"
        ref={(el) => (sectionRefs.current["performance"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <TrendingUp className="w-5 h-5 text-success" />
          <h2 className="text-xl font-display">Performance Analysis</h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Evaluates historical data through key metrics like Cumulative returns, End of Year (EoY) returns, and risk-adjusted measures such as the Sharpe ratio and Sortino ratio.
        </p>

        {/* Performance Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border">
          {[
            { id: "cumulative", label: "Cumulative Returns" },
            { id: "volAdj", label: "Volatility Adjusted" },
            { id: "rollingSharpe", label: "Rolling Sharpe" },
            { id: "rollingSortino", label: "Rolling Sortino" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPerfTab(tab.id as any)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                perfTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Performance Chart */}
        <div className="card-elevated p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {perfTab === "cumulative" && "Portfolio Value Growth"}
              {perfTab === "volAdj" && "Volatility Adjusted Returns"}
              {perfTab === "rollingSharpe" && "Rolling Sharpe (6-Months)"}
              {perfTab === "rollingSortino" && "Rolling Sortino (6-Months)"}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-success" />
                <span>My Strategy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5" style={{ backgroundColor: "hsl(280 65% 60%)" }} />
                <span className="text-muted-foreground">SPY</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {(perfTab === "cumulative" || perfTab === "volAdj") ? (
                <AreaChart data={returnsData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                  />
                  <Area type="monotone" dataKey="benchmark" stroke="hsl(280 65% 60%)" strokeWidth={1.5} fill="transparent" name="SPY" />
                  <Area type="monotone" dataKey="portfolio" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#portfolioGradient)" name="Portfolio" />
                </AreaChart>
              ) : (
                <LineChart data={rollingData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Line 
                    type="monotone" 
                    dataKey={perfTab === "rollingSharpe" ? "benchmarkSharpe" : "benchmarkSortino"} 
                    stroke="hsl(280 65% 60%)" 
                    strokeWidth={1.5} 
                    dot={false} 
                    name="SPY" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey={perfTab === "rollingSharpe" ? "portfolioSharpe" : "portfolioSortino"} 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2} 
                    dot={false} 
                    name="Portfolio" 
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Performance Metrics */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Performance Metrics</h3>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground uppercase mb-2 border-b border-border pb-2">
              <span className="flex-1">Metric</span>
              <span className="w-20 text-right">Strategy</span>
              <span className="w-20 text-right">SPY</span>
            </div>
            <div className="space-y-0 max-h-[320px] overflow-y-auto">
              {performanceMetrics.map((item) => (
                <div key={item.metric} className="metric-row">
                  <span className="metric-label"><MetricTooltip metric={item.metric} /></span>
                  <span className="metric-value-primary">{item.portfolio}</span>
                  <span className="metric-value text-muted-foreground">{item.benchmark}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Returns */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Detailed Returns</h3>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground uppercase mb-2 border-b border-border pb-2">
              <span className="flex-1">Period</span>
              <span className="w-20 text-right">Strategy</span>
              <span className="w-20 text-right">SPY</span>
            </div>
            <div className="space-y-0 max-h-[320px] overflow-y-auto">
              {detailedReturns.map((item) => (
                <div key={item.metric} className="metric-row">
                  <span className="metric-label"><MetricTooltip metric={item.metric} /></span>
                  <span className={`metric-value-primary ${item.portfolio.startsWith("-") ? "text-destructive" : "text-success"}`}>
                    {item.portfolio}
                  </span>
                  <span className={`metric-value ${item.benchmark.startsWith("-") ? "text-destructive/70" : "text-muted-foreground"}`}>
                    {item.benchmark}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Risk Analysis */}
      <section
        id="risk"
        ref={(el) => (sectionRefs.current["risk"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <Shield className="w-5 h-5 text-destructive" />
          <h2 className="text-xl font-display">Risk Analysis</h2>
        </div>

        {/* Risk Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border">
          {[
            { id: "drawdowns", label: "Drawdowns" },
            { id: "worstDrawdowns", label: "Worst Drawdowns" },
            { id: "rollingVol", label: "Rolling Volatility" },
            { id: "rollingBeta", label: "Rolling Beta" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRiskTab(tab.id as any)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                riskTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Risk Chart */}
        <div className="card-elevated p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {riskTab === "drawdowns" && "Drawdowns"}
              {riskTab === "worstDrawdowns" && "Worst Drawdowns"}
              {riskTab === "rollingVol" && "Rolling Volatility (6-Months)"}
              {riskTab === "rollingBeta" && "Rolling Beta (6-Months)"}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-success" />
                <span>My Strategy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5" style={{ backgroundColor: "hsl(280 65% 60%)" }} />
                <span className="text-muted-foreground">SPY</span>
              </div>
              {riskTab === "drawdowns" && (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 border-t border-dashed border-muted-foreground" />
                  <span className="text-muted-foreground">Average</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {riskTab === "drawdowns" ? (
                <ComposedChart data={drawdownData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[-70, 0]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                  />
                  <ReferenceLine y={-5} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="portfolio" stroke="hsl(var(--success))" strokeWidth={1.5} fill="url(#drawdownFill)" name="Portfolio" />
                  <Line type="monotone" dataKey="benchmark" stroke="hsl(280 65% 60%)" strokeWidth={1} dot={false} name="SPY" />
                </ComposedChart>
              ) : riskTab === "worstDrawdowns" ? (
                <div className="w-full h-full flex items-center">
                  <table className="data-table w-full text-xs">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Recovery</th>
                        <th className="text-right">Days</th>
                        <th className="text-right">Drawdown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worstDrawdowns.map((dd) => (
                        <tr key={dd.rank}>
                          <td className="font-mono">{dd.rank}</td>
                          <td className="font-mono">{dd.start}</td>
                          <td className="font-mono">{dd.end}</td>
                          <td className="font-mono">{dd.recovery}</td>
                          <td className="text-right font-mono">{dd.length}</td>
                          <td className="text-right font-mono text-destructive">{dd.drawdown}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <LineChart data={rollingRiskData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => riskTab === "rollingVol" ? `${v}%` : v} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  {riskTab === "rollingVol" ? (
                    <>
                      <Line type="monotone" dataKey="benchmarkVol" stroke="hsl(280 65% 60%)" strokeWidth={1.5} dot={false} name="SPY" />
                      <Line type="monotone" dataKey="portfolioVol" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Portfolio" />
                    </>
                  ) : (
                    <>
                      <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                      <Line type="monotone" dataKey="portfolioBeta" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Beta" />
                    </>
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Risk Metrics */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Risk Metrics</h3>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground uppercase mb-2 border-b border-border pb-2">
              <span className="flex-1">Metric</span>
              <span className="w-20 text-right">Strategy</span>
              <span className="w-20 text-right">SPY</span>
            </div>
            <div className="space-y-0">
              {riskMetrics.map((item) => (
                <div key={item.metric} className="metric-row">
                  <span className="metric-label"><MetricTooltip metric={item.metric} /></span>
                  <span className={`metric-value-primary ${item.portfolio.startsWith("-") ? "text-destructive" : ""}`}>
                    {item.portfolio}
                  </span>
                  <span className={`metric-value ${item.benchmark.startsWith("-") ? "text-destructive/70" : "text-muted-foreground"}`}>
                    {item.benchmark}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmark Comparison */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Benchmark Comparison</h3>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex gap-4 text-[10px] text-muted-foreground uppercase mb-2 border-b border-border pb-2">
              <span className="flex-1">vs SPY</span>
              <span className="w-20 text-right">Value</span>
            </div>
            <div className="space-y-0">
              {benchmarkComparison.map((item) => (
                <div key={item.metric} className="metric-row">
                  <span className="metric-label"><MetricTooltip metric={item.metric} /></span>
                  <span className="metric-value-primary">{item.portfolio}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
              Alpha &gt; 0 indicates outperformance vs benchmark on a risk-adjusted basis
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: Alternative Allocations */}
      <section
        id="allocations"
        ref={(el) => (sectionRefs.current["allocations"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <BarChart3 className="w-5 h-5 text-chart-4" />
          <h2 className="text-xl font-display">Alternative Portfolio Allocations</h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Compare your current allocation against optimized strategies. Each strategy represents a different objective on the efficient frontier.
        </p>

        <div className="card-elevated p-5">
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Optimization Strategy</th>
                  <th>Portfolio Name</th>
                  <th className="text-right"><MetricTooltip metric="Cumulative Return" /></th>
                  <th className="text-right"><MetricTooltip metric="CAGR" /></th>
                  <th className="text-right"><MetricTooltip metric="Annualized Volatility">Ann. Volatility</MetricTooltip></th>
                  <th className="text-right"><MetricTooltip metric="Sharpe Ratio" /></th>
                </tr>
              </thead>
              <tbody>
                {alternativeAllocations.map((alloc, i) => (
                  <tr key={alloc.strategy} className={i === 0 ? "bg-primary/5" : alloc.strategy === "SPY" ? "border-t-2 border-border" : ""}>
                    <td className={`font-medium ${i === 0 ? "text-primary" : ""}`}>{alloc.strategy}</td>
                    <td className="text-muted-foreground">{alloc.name}</td>
                    <td className="text-right font-mono">{alloc.cumReturn}</td>
                    <td className="text-right font-mono">{alloc.cagr}</td>
                    <td className="text-right font-mono">{alloc.volatility}</td>
                    <td className="text-right font-mono">{alloc.sharpe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Highlighted row shows your current allocation</p>
            <Button size="sm" onClick={() => navigate("/dashboard/optimization")}>
              Run Full Optimization
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION: Monte Carlo */}
      <section
        id="montecarlo"
        ref={(el) => (sectionRefs.current["montecarlo"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <Activity className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-xl font-display">Monte Carlo Simulation</h2>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Stress-test your portfolio with Monte Carlo simulation. Adjust parameters to explore different scenarios and probability distributions.
        </p>

        <div className="text-[10px] text-muted-foreground bg-muted/30 rounded px-3 py-1.5 mb-4 inline-block">
          Projections are hypothetical and do not guarantee future returns. Past performance is not indicative of future results.
        </div>

        <div className="card-elevated p-5">
          <MonteCarloEmbed 
            initialValue={10000}
            expectedReturn={0.065}
            volatility={0.085}
          />
        </div>
      </section>

      {/* SECTION: Efficient Frontier */}
      <section
        id="frontier"
        ref={(el) => (sectionRefs.current["frontier"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Efficient Frontier</h2>
        </div>

        <div className="grid lg:grid-cols-4 gap-4">
          {/* Main Chart */}
          <div className="lg:col-span-3 card-elevated p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Risk-Return Profile</h3>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <Download className="w-3 h-3" />
              </Button>
            </div>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                  <defs>
                    <linearGradient id="frontierGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    type="number"
                    dataKey="volatility"
                    name="Volatility"
                    domain={[4, 22]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    label={{ value: "Annualized Volatility (%)", position: "bottom", offset: 20, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="return"
                    name="Return"
                    domain={[0, 14]}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    label={{ value: "Expected Return (%)", angle: -90, position: "insideLeft", offset: 10, fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <ZAxis type="number" dataKey="size" range={[60, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (props?.payload?.name) {
                        return [`${value.toFixed(1)}%`, name === "volatility" ? "Vol" : "Return"];
                      }
                      return [`${value.toFixed(1)}%`, name === "volatility" ? "Volatility" : "Return"];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.name) {
                        return payload[0].payload.name;
                      }
                      return "";
                    }}
                  />
                  {/* Efficient Frontier Line */}
                  <Scatter 
                    data={efficientFrontierData} 
                    fill="transparent" 
                    line={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 }} 
                    shape={() => null}
                  />
                  {/* Individual Assets */}
                  <Scatter 
                    data={assetPoints} 
                    fill="hsl(var(--destructive))"
                    opacity={0.8}
                  >
                    <LabelList dataKey="name" position="top" fontSize={9} fill="hsl(var(--muted-foreground))" />
                  </Scatter>
                  {/* Optimal Portfolio Points */}
                  <Scatter 
                    data={optimalPoints} 
                    fill="hsl(var(--success))"
                  >
                    <LabelList dataKey="name" position="bottom" fontSize={8} fill="hsl(var(--success))" />
                  </Scatter>
                  {/* My Strategy */}
                  <Scatter 
                    data={myStrategyPoint} 
                    fill="hsl(var(--primary))"
                  >
                    <LabelList dataKey="name" position="top" fontSize={10} fontWeight={600} fill="hsl(var(--primary))" />
                  </Scatter>
                  {/* Benchmark */}
                  <Scatter 
                    data={benchmarkPoint} 
                    fill="hsl(280 65% 60%)"
                  >
                    <LabelList dataKey="name" position="top" fontSize={10} fill="hsl(280 65% 60%)" />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 pt-3 border-t border-border text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-foreground" />
                <span>Efficient Frontier</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-medium">My Strategy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(280 65% 60%)" }} />
                <span>SPY Benchmark</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive opacity-80" />
                <span>Individual Assets</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <span>Optimal Portfolios</span>
              </div>
            </div>
          </div>

          {/* Side Panel - Portfolio Details */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-medium mb-4">Portfolio Position</h3>
            
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-[10px] text-primary uppercase tracking-wider">My Strategy</span>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Return</span>
                    <span className="font-mono font-medium">6.6%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-mono font-medium">8.5%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sharpe</span>
                    <span className="font-mono font-medium">0.79</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">SPY Benchmark</span>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Return</span>
                    <span className="font-mono">10.5%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-mono">19.4%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sharpe</span>
                    <span className="font-mono">0.61</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <span className="text-[10px] text-success uppercase tracking-wider">Max Sharpe</span>
                <div className="mt-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Return</span>
                    <span className="font-mono font-medium text-success">6.9%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Volatility</span>
                    <span className="font-mono font-medium text-success">7.5%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sharpe</span>
                    <span className="font-mono font-medium text-success">0.95</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-3">
                  Your portfolio is slightly below the efficient frontier. Optimization could improve risk-adjusted returns.
                </p>
                <Button size="sm" className="w-full" onClick={() => navigate("/dashboard/optimization")}>
                  Optimize Portfolio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Holdings */}
      <section
        id="holdings"
        ref={(el) => (sectionRefs.current["holdings"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <LineChartIcon className="w-5 h-5 text-chart-3" />
          <h2 className="text-xl font-display">Holdings & Correlation</h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Holdings Table */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-medium mb-3">Asset Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th className="text-right">Weight</th>
                    <th className="text-right">Return</th>
                    <th className="text-right">CAGR</th>
                    <th className="text-right">Vol.</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding, i) => (
                    <tr key={holding.ticker}>
                      <td className="font-mono font-medium flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {holding.ticker}
                      </td>
                      <td className="text-right font-mono">{holding.weight}%</td>
                      <td className="text-right font-mono text-success">+{(Math.random() * 200 + 50).toFixed(1)}%</td>
                      <td className="text-right font-mono">{(Math.random() * 30 + 10).toFixed(1)}%</td>
                      <td className="text-right font-mono">{(Math.random() * 20 + 15).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Correlation Matrix */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-medium mb-3">Correlation Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1.5"></th>
                    {correlationAssets.map((asset) => (
                      <th key={asset} className="p-1.5 text-center font-mono">{asset}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationAssets.map((row, i) => (
                    <tr key={row}>
                      <td className="p-1.5 font-mono font-medium">{row}</td>
                      {correlationAssets.map((col, j) => {
                        const value = i === j ? 1 : Math.random() * 0.4 + 0.5;
                        const intensity = value;
                        return (
                          <td
                            key={col}
                            className="p-1.5 text-center font-mono"
                            style={{
                              backgroundColor: `hsl(var(--primary) / ${intensity * 0.25})`,
                            }}
                          >
                            {value.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              High correlations may indicate concentration risk
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: Report Preview */}
      <section
        id="report"
        ref={(el) => (sectionRefs.current["report"] = el)}
        className="mb-12 scroll-mt-32"
      >
        <div className="section-header">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Professional Report</h2>
        </div>

        <div className="text-sm text-muted-foreground mb-6">
          Generate an institutional-quality portfolio report — the same format used by Morningstar and major financial advisors. 
          Completely free, no gatekeeping.
        </div>

        <ReportPreview holdings={holdings} portfolioName="My Portfolio" />
      </section>

      {/* Back to top */}
      <div className="text-center pb-8">
        <Button variant="ghost" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ChevronUp className="w-4 h-4 mr-1" />
          Back to Top
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default PortfolioResults;
