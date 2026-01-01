import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MetricTooltip } from "@/components/ui/metric-tooltip";
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { MonteCarloEmbed } from "@/components/charts/MonteCarloEmbed";
import { ProfessionalChart, CHART_COLORS } from "@/components/charts/ProfessionalChart";
import { 
  ArrowLeft, Download, Share2, TrendingUp, 
  PieChart, Activity, BarChart3, LineChart as LineChartIcon, 
  Shield, ChevronUp, FileText, Info
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
  BarChart,
  Bar,
} from "recharts";

interface Holding {
  ticker: string;
  weight: number;
  cagr?: number | null;
  volatility?: number | null;
  bestDay?: number | null;
  worstDay?: number | null;
}

// Mock data generators
const generateReturnsData = () => {
  const data = [];
  let value = 1000; // Start at $1,000 to match Final Value stat card
  let benchmark = 1000; // Start at $1,000 to match Final Value stat card
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

// Extended color palette to ensure unique colors for many holdings
const COLORS = [
  "hsl(220 90% 56%)",   // Blue
  "hsl(142 76% 36%)",   // Green
  "hsl(38 92% 50%)",    // Yellow/Orange
  "hsl(280 65% 60%)",   // Purple
  "hsl(0 84% 60%)",     // Red
  "hsl(195 85% 55%)",   // Cyan
  "hsl(340 75% 55%)",   // Pink
  "hsl(30 100% 55%)",   // Orange
  "hsl(160 70% 45%)",   // Teal
  "hsl(270 70% 65%)",   // Lavender
  "hsl(15 90% 55%)",    // Coral
  "hsl(210 80% 50%)",   // Sky Blue
  "hsl(120 65% 50%)",   // Lime Green
  "hsl(300 60% 60%)",   // Magenta
  "hsl(45 95% 55%)",    // Gold
  "hsl(180 70% 45%)",   // Turquoise
  "hsl(330 70% 55%)",   // Rose
  "hsl(240 75% 55%)",   // Indigo
  "hsl(60 85% 55%)",    // Bright Yellow
  "hsl(200 80% 50%)",   // Light Blue
];

const sections = [
  { id: "summary", label: "Summary" },
  { id: "performance", label: "Performance" },
  { id: "risk", label: "Risk" },
  { id: "holdings", label: "Holdings" },
  { id: "allocations", label: "Allocations" },
  { id: "montecarlo", label: "Monte Carlo" },
  { id: "frontier", label: "Frontier" },
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

// Portfolio Analysis API response type
interface PortfolioAnalysisData {
  meta: {
    analysisDate: string;
    benchmarkTicker: string;
    riskFreeRate: number;
    lookbackYears: number;
    effectiveStartDate?: string;
  };
  periodReturns: {
    portfolio: {
      '1M': number | null;
      '3M': number | null;
      'YTD': number | null;
      '1Y': number | null;
      '3Y': number | null;
      '5Y': number | null;
    };
    benchmark: {
      '1M': number | null;
      '3M': number | null;
      'YTD': number | null;
      '1Y': number | null;
      '3Y': number | null;
      '5Y': number | null;
    };
    annualized: boolean;
  };
  returnsTable: Array<{
    period: string;
    portfolioReturn: number;
    benchmarkReturn: number;
  }>;
  riskMetrics: {
    annualVolatility: number;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
    beta: number;
    maxDrawdown: number;
  };
  benchmarkRiskMetrics: {
    annualVolatility: number;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
    maxDrawdown: number;
    beta: number;
  };
  performanceMetrics5Y?: {
    cumulativeReturn5Y: number;
    cumulativeReturn5YBenchmark: number;
    cagr5Y: number;
    cagr5YBenchmark: number;
    maxDrawdown5Y: number;
    maxDrawdown5YBenchmark: number;
    sharpeRatio5Y: number;
    sharpeRatio5YBenchmark: number;
  };
  charts: {
    growthOf100: Array<{
      date: string;
      portfolio: number;
      benchmark: number;
    }>;
    drawdown: Array<{
      date: string;
      portfolio: number;
      benchmark: number;
    }>;
    rollingSharpe: Array<{
      date: string;
      portfolio: number;
      benchmark: number;
    }>;
    rollingVolatility?: Array<{
      date: string;
      portfolio: number;
      benchmark: number;
    }>;
    rollingBeta?: Array<{
      date: string;
      beta: number;
    }>;
    ytdContributions?: Array<{
      ticker: string;
      contribution: number;
    }>;
    ytdRiskContributions?: Array<{
      ticker: string;
      contribution: number;
    }>;
    monthlyReturnsHeatmap: {
      years: number[];
      months: string[];
      values: Array<{
        year: number;
        month: number;
        return: number;
      }>;
    };
    correlationMatrix: {
      tickers: string[];
      matrix: number[][];
    };
    riskReturnScatter: Array<{
      label: string;
      return: number;
      risk: number;
    }>;
    efficientFrontier: {
      points: Array<{
        risk: number;
        return: number;
      }>;
      current: {
        risk: number;
        return: number;
      };
      maxSharpe: {
        risk: number;
        return: number;
      };
      minVariance: {
        risk: number;
        return: number;
      };
    };
  };
  holdings: Array<{
    ticker: string;
    weight: number;
    cagr?: number | null;
    volatility?: number | null;
    bestDay?: number | null;
    worstDay?: number | null;
  }>;
  warnings: string[];
}

const PortfolioResults = () => {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [analysisData, setAnalysisData] = useState<PortfolioAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("summary");
  const [perfTab, setPerfTab] = useState<"cumulative" | "monthlyReturns" | "contributors" | "drawdown">("cumulative");
  const [riskTab, setRiskTab] = useState<"drawdowns" | "rollingBeta" | "riskContributions" | "riskReturn">("drawdowns");
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Convert holdings to CSV format for API
  const holdingsToCSV = (holdings: Holding[]): string => {
    return holdings.map(h => `${h.ticker},${h.weight}`).join('\n');
  };

  // Fetch portfolio analysis from Portfolio Analysis API
  const fetchPortfolioAnalysis = async (holdings: Holding[]) => {
    if (holdings.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const portfolioText = holdingsToCSV(holdings);
      const apiUrl = import.meta.env.VITE_PORTFOLIO_ANALYSIS_API_URL || 'http://localhost:8001';
      
      // Get requested start date and window label from sessionStorage
      const requestedStartDate = sessionStorage.getItem("requestedStartDate");
      const requestedWindowLabel = sessionStorage.getItem("requestedWindowLabel");
      
      const requestBody: any = { portfolioText };
      if (requestedStartDate) {
        requestBody.requested_start_date = requestedStartDate;
      }
      if (requestedWindowLabel) {
        requestBody.requested_window_label = requestedWindowLabel;
      }
      
      const response = await fetch(`${apiUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `API returned status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from API');
      }

      console.log('Portfolio analysis data received:', result.data);
      setAnalysisData(result.data);
    } catch (err: any) {
      console.error('Error fetching portfolio analysis:', err);
      const errorMessage = err.message || 'Failed to fetch portfolio analysis. Make sure the Portfolio Analysis API server is running on port 8001.';
      setError(errorMessage);
      // Fall back to mock data on error
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("portfolioHoldings");
    if (stored) {
      const parsedHoldings = JSON.parse(stored);
      setHoldings(parsedHoldings);
      fetchPortfolioAnalysis(parsedHoldings);
    } else {
      const defaultHoldings = [
        { ticker: "VTI", weight: 40 },
        { ticker: "VXUS", weight: 20 },
        { ticker: "BND", weight: 20 },
        { ticker: "QQQ", weight: 15 },
        { ticker: "VNQ", weight: 5 },
      ];
      setHoldings(defaultHoldings);
      fetchPortfolioAnalysis(defaultHoldings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Transform API data to component format (preserving null for insufficient history)
  const periodReturns = analysisData?.periodReturns ? [
    { 
      period: "1M", 
      portfolio: analysisData.periodReturns.portfolio?.['1M'] != null ? (analysisData.periodReturns.portfolio['1M'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['1M'] != null ? (analysisData.periodReturns.benchmark['1M'] * 100) : null 
    },
    { 
      period: "3M", 
      portfolio: analysisData.periodReturns.portfolio?.['3M'] != null ? (analysisData.periodReturns.portfolio['3M'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['3M'] != null ? (analysisData.periodReturns.benchmark['3M'] * 100) : null 
    },
    { 
      period: "YTD", 
      portfolio: analysisData.periodReturns.portfolio?.['YTD'] != null ? (analysisData.periodReturns.portfolio['YTD'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['YTD'] != null ? (analysisData.periodReturns.benchmark['YTD'] * 100) : null 
    },
    { 
      period: "1Y", 
      portfolio: analysisData.periodReturns.portfolio?.['1Y'] != null ? (analysisData.periodReturns.portfolio['1Y'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['1Y'] != null ? (analysisData.periodReturns.benchmark['1Y'] * 100) : null 
    },
    { 
      period: "3Y", 
      portfolio: analysisData.periodReturns.portfolio?.['3Y'] != null ? (analysisData.periodReturns.portfolio['3Y'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['3Y'] != null ? (analysisData.periodReturns.benchmark['3Y'] * 100) : null 
    },
    { 
      period: "5Y", 
      portfolio: analysisData.periodReturns.portfolio?.['5Y'] != null ? (analysisData.periodReturns.portfolio['5Y'] * 100) : null, 
      benchmark: analysisData.periodReturns.benchmark?.['5Y'] != null ? (analysisData.periodReturns.benchmark['5Y'] * 100) : null 
    },
  ] : [];

  // Generate performance summary narrative
  const generatePerformanceSummary = (): string => {
    if (!periodReturns || periodReturns.length === 0) {
      return "Performance data is not available.";
    }

    // Short-term periods: 1M, 3M, YTD, 1Y (cumulative returns) - filter out null values
    const shortTermPeriods = periodReturns.filter(p => 
      ['1M', '3M', 'YTD', '1Y'].includes(p.period) && 
      p.portfolio !== null && p.benchmark !== null
    );
    // Long-term periods: 3Y, 5Y (cumulative returns) - filter out null values
    const longTermPeriods = periodReturns.filter(p => 
      ['3Y', '5Y'].includes(p.period) && 
      p.portfolio !== null && p.benchmark !== null
    );

    if (shortTermPeriods.length === 0 && longTermPeriods.length === 0) {
      return "Performance comparison data is not available.";
    }

    // Calculate relative returns (portfolio - benchmark) for each horizon
    const shortTermDiffs = shortTermPeriods.map(p => p.portfolio! - p.benchmark!);
    const longTermDiffs = longTermPeriods.map(p => p.portfolio! - p.benchmark!);

    const avgShortTermDiff = shortTermPeriods.length > 0 
      ? shortTermDiffs.reduce((sum, diff) => sum + diff, 0) / shortTermDiffs.length 
      : 0;
    const avgLongTermDiff = longTermPeriods.length > 0 
      ? longTermDiffs.reduce((sum, diff) => sum + diff, 0) / longTermDiffs.length 
      : 0;

    const shortTermOutperforming = avgShortTermDiff > 0;
    const longTermOutperforming = avgLongTermDiff > 0;

    // Check for mixed results (some periods positive, some negative)
    const shortTermMixed = shortTermDiffs.some(d => d > 0) && shortTermDiffs.some(d => d < 0);
    const longTermMixed = longTermDiffs.some(d => d > 0) && longTermDiffs.some(d => d < 0);

    // Build narrative (2-3 sentences)
    const sentences: string[] = [];

    // First sentence: Short-term performance
    if (shortTermPeriods.length > 0) {
      if (shortTermMixed) {
        sentences.push(`Short-term cumulative returns (1M–1Y) relative to the benchmark show mixed results, with an average difference of ${avgShortTermDiff > 0 ? '+' : ''}${avgShortTermDiff.toFixed(1)} percentage points.`);
      } else if (shortTermOutperforming) {
        sentences.push(`Short-term cumulative returns (1M–1Y) exceed the benchmark by an average of ${avgShortTermDiff.toFixed(1)} percentage points.`);
      } else {
        sentences.push(`Short-term cumulative returns (1M–1Y) trail the benchmark by an average of ${Math.abs(avgShortTermDiff).toFixed(1)} percentage points.`);
      }
    }

    // Second sentence: Long-term performance
    if (longTermPeriods.length > 0) {
      if (longTermMixed) {
        sentences.push(`Long-term cumulative returns (3Y–5Y) relative to the benchmark are mixed, with an average difference of ${avgLongTermDiff > 0 ? '+' : ''}${avgLongTermDiff.toFixed(1)} percentage points.`);
      } else if (longTermOutperforming) {
        sentences.push(`Long-term cumulative returns (3Y–5Y) exceed the benchmark by an average of ${avgLongTermDiff.toFixed(1)} percentage points.`);
      } else {
        sentences.push(`Long-term cumulative returns (3Y–5Y) trail the benchmark by an average of ${Math.abs(avgLongTermDiff).toFixed(1)} percentage points.`);
      }
    }

    // Third sentence: Overall assessment (only if we have both horizons)
    if (shortTermPeriods.length > 0 && longTermPeriods.length > 0) {
      if (shortTermOutperforming && longTermOutperforming && !shortTermMixed && !longTermMixed) {
        sentences.push("Performance relative to the benchmark is positive across both time horizons.");
      } else if (!shortTermOutperforming && !longTermOutperforming && !shortTermMixed && !longTermMixed) {
        sentences.push("Performance relative to the benchmark is negative across both time horizons.");
      } else if (shortTermOutperforming && !longTermOutperforming) {
        sentences.push("Recent performance has been stronger relative to longer-term results.");
      } else if (!shortTermOutperforming && longTermOutperforming) {
        sentences.push("Longer-term performance has been stronger relative to recent results.");
      } else {
        sentences.push("Performance relative to the benchmark varies across time horizons.");
      }
    }

    return sentences.length > 0 ? sentences.join(' ') : "Performance comparison data is not available.";
  };

  const performanceSummary = generatePerformanceSummary();

  // Calculate 5Y metrics for Summary section (using 60-month period to match CAGR)
  const cumulativeReturn5Y = analysisData?.performanceMetrics5Y?.cumulativeReturn5Y ?? 0;
  const benchmarkCumulativeReturn5Y = analysisData?.performanceMetrics5Y?.cumulativeReturn5YBenchmark ?? 0;
  
  // Calculate Final Value: $1,000 * (1 + cumulativeReturn5Y/100)
  const finalValue5Y = 1000 * (1 + cumulativeReturn5Y / 100);
  const benchmarkFinalValue5Y = 1000 * (1 + benchmarkCumulativeReturn5Y / 100);
  
  // Calculate CAGR (5Y) (for Summary section) - use null if not available
  // Note: periodReturns may be decimals (0.1537 for 15.37%), but performanceMetrics5Y.cagr5Y is percentages
  // We use performanceMetrics5Y.cagr5Y which is already percentages
  const cagr5Y = analysisData?.performanceMetrics5Y?.cagr5Y;
  const benchmarkCagr5Y = analysisData?.performanceMetrics5Y?.cagr5YBenchmark;
  // Both values are already percentages from backend (e.g., 15.37 for 15.37%)
  const cagr = cagr5Y != null ? cagr5Y : null;
  const benchmarkCagr = benchmarkCagr5Y != null ? benchmarkCagr5Y : null;

  // Performance metrics - 5Y period only (using real data from API)
  const performanceMetrics = (() => {
    const metrics5Y = analysisData?.performanceMetrics5Y;
    
    if (!metrics5Y) {
      // Fallback to "N/A" if data not available
      return [
        { metric: "Cumulative Return (5Y)", portfolio: "N/A", benchmark: "N/A" },
        { metric: "CAGR (5Y)", portfolio: "N/A", benchmark: "N/A" },
        { metric: "Max Drawdown (5Y)", portfolio: "N/A", benchmark: "N/A" },
        { metric: "Sharpe Ratio (5Y)", portfolio: "N/A", benchmark: "N/A" },
      ];
    }
    
    return [
      { 
        metric: "Cumulative Return (5Y)", 
        portfolio: typeof metrics5Y.cumulativeReturn5Y === 'number' && !isNaN(metrics5Y.cumulativeReturn5Y)
          ? `${metrics5Y.cumulativeReturn5Y.toFixed(1)}%` 
          : "N/A", 
        benchmark: typeof metrics5Y.cumulativeReturn5YBenchmark === 'number' && !isNaN(metrics5Y.cumulativeReturn5YBenchmark)
          ? `${metrics5Y.cumulativeReturn5YBenchmark.toFixed(1)}%` 
          : "N/A" 
      },
      { 
        metric: "CAGR (5Y)", 
        portfolio: typeof metrics5Y.cagr5Y === 'number' && !isNaN(metrics5Y.cagr5Y)
          ? `${metrics5Y.cagr5Y.toFixed(2)}%` 
          : "N/A", 
        benchmark: typeof metrics5Y.cagr5YBenchmark === 'number' && !isNaN(metrics5Y.cagr5YBenchmark)
          ? `${metrics5Y.cagr5YBenchmark.toFixed(2)}%` 
          : "N/A" 
      },
      { 
        metric: "Max Drawdown (5Y)", 
        portfolio: typeof metrics5Y.maxDrawdown5Y === 'number' && !isNaN(metrics5Y.maxDrawdown5Y)
          ? `${(metrics5Y.maxDrawdown5Y || 0).toFixed(2)}%` 
          : "N/A", 
        benchmark: typeof metrics5Y.maxDrawdown5YBenchmark === 'number' && !isNaN(metrics5Y.maxDrawdown5YBenchmark)
          ? `${(metrics5Y.maxDrawdown5YBenchmark || 0).toFixed(2)}%` 
          : "N/A" 
      },
      { 
        metric: "Sharpe Ratio (5Y)", 
        portfolio: typeof metrics5Y.sharpeRatio5Y === 'number' && !isNaN(metrics5Y.sharpeRatio5Y)
          ? metrics5Y.sharpeRatio5Y.toFixed(2) 
          : "N/A", 
        benchmark: typeof metrics5Y.sharpeRatio5YBenchmark === 'number' && !isNaN(metrics5Y.sharpeRatio5YBenchmark)
          ? metrics5Y.sharpeRatio5YBenchmark.toFixed(2) 
          : "N/A" 
      },
    ];
  })();

  const riskMetrics = analysisData ? [
    { metric: "Annualized Volatility", portfolio: `${(analysisData.riskMetrics?.annualVolatility || 0).toFixed(2)}%`, benchmark: "N/A" },
    { metric: "Max Drawdown", portfolio: `${(analysisData.riskMetrics?.maxDrawdown || 0).toFixed(2)}%`, benchmark: "N/A" },
    { metric: "Longest Drawdown", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Beta", portfolio: analysisData.riskMetrics?.beta !== undefined && analysisData.riskMetrics?.beta !== null ? analysisData.riskMetrics.beta.toFixed(2) : "N/A", benchmark: analysisData.benchmarkRiskMetrics?.beta !== undefined && analysisData.benchmarkRiskMetrics?.beta !== null ? analysisData.benchmarkRiskMetrics.beta.toFixed(2) : "1.00" },
    { metric: "Value at Risk (95%)", portfolio: "N/A", benchmark: "N/A" },
    { metric: "CVaR", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Risk of Ruin", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Kelly Criterion", portfolio: "N/A", benchmark: "N/A" },
  ] : [
    { metric: "Annualized Volatility", portfolio: "0%", benchmark: "N/A" },
    { metric: "Max Drawdown", portfolio: "0%", benchmark: "N/A" },
    { metric: "Longest Drawdown", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Ulcer Index", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Value at Risk (95%)", portfolio: "N/A", benchmark: "N/A" },
    { metric: "CVaR", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Risk of Ruin", portfolio: "N/A", benchmark: "N/A" },
    { metric: "Kelly Criterion", portfolio: "N/A", benchmark: "N/A" },
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

  const benchmarkComparison = analysisData ? [
    { metric: "Alpha", portfolio: "N/A" },
    { metric: "Beta", portfolio: (analysisData.riskMetrics?.beta || 0).toFixed(2) },
    { metric: "Correlation", portfolio: "N/A" },
    { metric: "Treynor Ratio", portfolio: "N/A" },
    { metric: "Information Ratio", portfolio: "N/A" },
  ] : [
    { metric: "Alpha", portfolio: "N/A" },
    { metric: "Beta", portfolio: "0.00" },
    { metric: "Correlation", portfolio: "N/A" },
    { metric: "Treynor Ratio", portfolio: "N/A" },
    { metric: "Information Ratio", portfolio: "N/A" },
  ];

  const benchmarkStats = analysisData ? [
    { metric: "Alpha", value: "N/A" },
    { metric: "Beta", value: (analysisData.riskMetrics?.beta || 0).toFixed(2) },
    { metric: "Correlation", value: "N/A" },
    { metric: "Treynor", value: "N/A" },
    { metric: "Info Ratio", value: "N/A" },
  ] : [
    { metric: "Alpha", value: "N/A" },
    { metric: "Beta", value: "0.00" },
    { metric: "Correlation", value: "N/A" },
    { metric: "Treynor", value: "N/A" },
    { metric: "Info Ratio", value: "N/A" },
  ];

  const monteCarloMetrics = [
    { metric: "Expected Return", portfolio: "40.1%", benchmark: "15.8%" },
    { metric: "Volatility", portfolio: "31.8%", benchmark: "21.1%" },
    { metric: "Final (25th)", portfolio: "$16,793", benchmark: "$15,964" },
    { metric: "Final (Median)", portfolio: "$19,409", benchmark: "$17,451" },
    { metric: "Final (75th)", portfolio: "$22,749", benchmark: "$19,177" },
    { metric: "P(Positive)", portfolio: "82.3%", benchmark: "74.5%" },
  ];

  // Use holdings from API if available, otherwise use state
  const displayHoldings = analysisData?.holdings || holdings;
  
  // Generate unique colors if we have more holdings than predefined colors
  const getColorForIndex = (index: number) => {
    if (index < COLORS.length) {
      return COLORS[index];
    }
    // Generate colors dynamically for portfolios with many holdings
    // Use HSV color space to ensure distinct hues
    const hue = (index * 137.508) % 360; // Golden angle approximation for good distribution
    const saturation = 65 + (index % 3) * 10; // Vary saturation between 65-85
    const lightness = 45 + (index % 4) * 5; // Vary lightness between 45-60
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  };
  
  // Backend returns weights as percentages (46.0 for 46%), use directly
  const pieData = displayHoldings.map((h, i) => ({
    name: h.ticker,
    value: Math.round(h.weight || 0), // Already a percentage, just round
    color: getColorForIndex(i), // Each holding gets a unique color
  }));
  
  // Transform efficient frontier data from API (with safe access)
  const efficientFrontierDataTransformed = (analysisData?.charts?.efficientFrontier?.points && analysisData.charts.efficientFrontier.points.length > 0)
    ? analysisData.charts.efficientFrontier.points.map((p: any) => ({
        volatility: (p.risk || 0) * 100, // Convert to percentage
        return: (p.return || 0) * 100,
      }))
    : efficientFrontierData;
  
  // Transform risk-return scatter to asset points format
  const assetPointsTransformed = (analysisData?.charts?.riskReturnScatter && analysisData.charts.riskReturnScatter.length > 0)
    ? analysisData.charts.riskReturnScatter.map((p: any) => ({
        volatility: (p.risk || 0) * 100,
        return: (p.return || 0) * 100,
        name: p.label || 'Unknown',
        size: 180,
      }))
    : assetPoints;
  
  // Transform optimal points (min variance, max sharpe, current)
  const optimalPointsTransformed = (analysisData?.charts?.efficientFrontier) ? [
    {
      volatility: (analysisData.charts.efficientFrontier.minVariance?.risk || 0) * 100,
      return: (analysisData.charts.efficientFrontier.minVariance?.return || 0) * 100,
      name: "Min Variance",
      size: 220,
    },
    {
      volatility: (analysisData.charts.efficientFrontier.maxSharpe?.risk || 0) * 100,
      return: (analysisData.charts.efficientFrontier.maxSharpe?.return || 0) * 100,
      name: "Max Sharpe",
      size: 280,
    },
    {
      volatility: (analysisData.charts.efficientFrontier.current?.risk || 0) * 100,
      return: (analysisData.charts.efficientFrontier.current?.return || 0) * 100,
      name: "Current Portfolio",
      size: 400,
    },
  ].filter(p => p.volatility > 0 || p.return > 0) : optimalPoints;
  
  // Current portfolio point for scatter
  const myStrategyPointTransformed = (analysisData?.charts?.efficientFrontier?.current) ? [{
    volatility: (analysisData.charts.efficientFrontier.current.risk || 0) * 100,
    return: (analysisData.charts.efficientFrontier.current.return || 0) * 100,
    name: "My Strategy",
    size: 400,
  }] : myStrategyPoint;
  
  // Benchmark point
  const benchmarkPointTransformed = (analysisData?.charts?.riskReturnScatter && analysisData.charts.riskReturnScatter.length > 0)
    ? analysisData.charts.riskReturnScatter
        .filter((p: any) => p.label === analysisData.meta?.benchmarkTicker || p.label === 'SPY')
        .map((p: any) => ({
          volatility: (p.risk || 0) * 100,
          return: (p.return || 0) * 100,
          name: `${p.label} (Benchmark)`,
          size: 350,
        }))
    : benchmarkPoint;

  const formatDiff = (portfolio: number | null, benchmark: number | null) => {
    if (portfolio === null || benchmark === null) {
      return "—";
    }
    const diff = portfolio - benchmark;
    return diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;
  };

  // Correlation matrix data
  const correlationAssetsTransformed = analysisData?.charts?.correlationMatrix?.tickers || correlationAssets;
  const correlationMatrixData = analysisData?.charts?.correlationMatrix?.matrix || [];

  // Monthly returns heatmap data transformation
  const monthlyReturnsHeatmapData = analysisData?.charts?.monthlyReturnsHeatmap;
  const monthlyReturnsMatrix = (() => {
    if (!monthlyReturnsHeatmapData || !monthlyReturnsHeatmapData.values || monthlyReturnsHeatmapData.values.length === 0) {
      return null;
    }
    
    const years = monthlyReturnsHeatmapData.years || [];
    const months = monthlyReturnsHeatmapData.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create a map for quick lookup: year -> month -> return
    const dataMap = new Map<number, Map<number, number>>();
    monthlyReturnsHeatmapData.values.forEach((item: any) => {
      if (!dataMap.has(item.year)) {
        dataMap.set(item.year, new Map());
      }
      dataMap.get(item.year)!.set(item.month, item.return);
    });
    
    // Build matrix: rows = years, cols = months
    const matrix: (number | null)[][] = years.map(year => {
      return months.map((_, monthIdx) => {
        const monthNum = monthIdx + 1; // months are 1-indexed
        const yearMap = dataMap.get(year);
        return yearMap?.has(monthNum) ? yearMap.get(monthNum)! : null;
      });
    });
    
    return { years, months, matrix };
  })();

  // Transform API data for charts (with safe access)
  const returnsData = (analysisData?.charts?.growthOf100 && analysisData.charts.growthOf100.length > 0)
    ? analysisData.charts.growthOf100.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        portfolio: d.portfolio || 1000,
        benchmark: d.benchmark || 1000,
      }))
    : generateReturnsData();
  
  // Drawdown data - simplified from growth data (with safe access)
  const drawdownData = (analysisData?.charts?.growthOf100 && analysisData.charts.growthOf100.length > 0) ? (() => {
    const data = [];
    let portfolioPeak = 1000; // Start at $1,000 to match the initial investment
    let benchmarkPeak = 1000; // Start at $1,000 to match the initial investment
    for (const d of analysisData.charts.growthOf100) {
      if (d.portfolio > portfolioPeak) portfolioPeak = d.portfolio;
      if (d.benchmark > benchmarkPeak) benchmarkPeak = d.benchmark;
      const portfolioDD = ((d.portfolio - portfolioPeak) / portfolioPeak) * 100;
      const benchmarkDD = ((d.benchmark - benchmarkPeak) / benchmarkPeak) * 100;
      data.push({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        portfolio: portfolioDD,
        benchmark: benchmarkDD,
      });
    }
    return data;
  })() : generateDrawdownData();

  // Rolling data (mock for now)
  const rollingData = generateRollingData();
  
  // Rolling risk data (mock for now - used in Risk section)
  const rollingRiskData = generateRollingRiskData();

  // Rolling Volatility data (6-month rolling annualized volatility)
  const rollingVolatilityData = (analysisData?.charts?.rollingVolatility && analysisData.charts.rollingVolatility.length > 0)
    ? analysisData.charts.rollingVolatility.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        portfolio: d.portfolio || 0,
        benchmark: d.benchmark || 0,
      }))
    : [];

  // Rolling Beta data (6-month rolling beta vs SPY)
  const rollingBetaData = (analysisData?.charts?.rollingBeta && analysisData.charts.rollingBeta.length > 0)
    ? analysisData.charts.rollingBeta.map((d: any) => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        beta: d.beta || 0,
      }))
    : [];

  // YTD Risk Contributions data
  const riskContributionsData = (analysisData?.charts?.ytdRiskContributions && analysisData.charts.ytdRiskContributions.length > 0)
    ? (() => {
        const contributions = analysisData.charts.ytdRiskContributions;
        
        // Separate positive and negative contributors, sort them
        const positives = contributions
          .filter((c: any) => c.contribution > 0)
          .sort((a: any, b: any) => b.contribution - a.contribution)
          .slice(0, 5);
        const negatives = contributions
          .filter((c: any) => c.contribution < 0)
          .sort((a: any, b: any) => a.contribution - b.contribution)
          .slice(0, 5);
        
        // Combine: negatives first (top), positives later (bottom)
        return [...negatives, ...positives];
      })()
    : [];

  // Risk-Return Scatter data
  // Backend returns percentages (46.0 for 46%), use directly
  const riskReturnScatterData = (analysisData?.charts?.riskReturnScatter && analysisData.charts.riskReturnScatter.length > 0)
    ? analysisData.charts.riskReturnScatter.map((p: any) => ({
        risk: (p.risk || 0), // Already a percentage
        return: (p.return || 0), // Already a percentage
        label: p.label || 'Unknown',
      }))
    : [];
  
  // Helper function to get color for each point
  const getRiskReturnColor = (label: string): string => {
    if (label === 'Portfolio') return 'hsl(var(--success))';
    if (label === 'SPY') return 'hsl(280 65% 60%)';
    if (label === 'QQQ') return 'hsl(220 90% 56%)';
    if (label === 'AGG') return 'hsl(195 85% 55%)'; // Changed to cyan to avoid conflict with Portfolio
    if (label === 'ACWI') return 'hsl(38 92% 50%)';
    return 'hsl(var(--muted-foreground))';
  };

  // Generate Risk AI Insights (must be called after rollingVolatilityData, rollingBetaData, riskContributionsData, and riskReturnScatterData are defined)
  const generateRiskAIInsights = () => {
    if (!analysisData) {
      return {
        keyTakeaway: "Load a portfolio to see risk insights.",
        rollingVolatility: [],
        rollingBeta: [],
        riskContributions: [],
        riskReturn: [],
      };
    }

    // A) Key Takeaway
    let keyTakeaway = "";
    
    // Get latest rolling volatility values
    const latestVol = rollingVolatilityData.length > 0 
      ? rollingVolatilityData[rollingVolatilityData.length - 1] 
      : null;
    const portfolioVol = latestVol?.portfolio ?? 0;
    const benchmarkVol = latestVol?.benchmark ?? 0;
    
    // Get latest beta
    const latestBeta = rollingBetaData.length > 0 
      ? rollingBetaData[rollingBetaData.length - 1]?.beta ?? 1.0
      : (analysisData.riskMetrics?.beta ?? 1.0);
    
    // Get portfolio and benchmark from risk-return scatter
    const portfolioPoint = riskReturnScatterData.find((p: any) => p.label === 'Portfolio');
    const benchmarkPoint = riskReturnScatterData.find((p: any) => p.label === (analysisData.meta?.benchmarkTicker || 'SPY'));
    const portfolioReturn = portfolioPoint?.return ?? 0;
    const portfolioRisk = portfolioPoint?.risk ?? 0;
    const benchmarkReturn = benchmarkPoint?.return ?? 0;
    const benchmarkRisk = benchmarkPoint?.risk ?? 0;
    
    // Build key takeaway based on rules
    const volDiff = portfolioVol - benchmarkVol;
    const returnDiff = portfolioReturn - benchmarkReturn;
    const riskDiff = portfolioRisk - benchmarkRisk;
    
    if (Math.abs(volDiff) > 2 && latestBeta > 1.1) {
      keyTakeaway = `Higher risk than benchmark recently (${portfolioVol.toFixed(1)}% vs ${benchmarkVol.toFixed(1)}% volatility), with above-market sensitivity (beta ${latestBeta.toFixed(2)}).`;
    } else if (Math.abs(volDiff) <= 2 && Math.abs(latestBeta - 1.0) < 0.15) {
      keyTakeaway = `Risk has been similar to benchmark (${portfolioVol.toFixed(1)}% volatility) with market-like sensitivity (beta ${latestBeta.toFixed(2)}).`;
    } else if (returnDiff > 0 && riskDiff <= 2) {
      keyTakeaway = `More efficient risk/return profile than benchmark, achieving ${returnDiff.toFixed(1)}% higher return with similar or lower risk.`;
    } else if (volDiff < -2 && latestBeta <= 0.85) {
      keyTakeaway = `Lower risk than benchmark (${portfolioVol.toFixed(1)}% vs ${benchmarkVol.toFixed(1)}% volatility) with below-market sensitivity (beta ${latestBeta.toFixed(2)}).`;
    } else {
      keyTakeaway = `Portfolio risk profile shows ${portfolioVol.toFixed(1)}% volatility with beta of ${latestBeta.toFixed(2)}, indicating ${latestBeta > 1.0 ? 'above' : latestBeta < 0.85 ? 'below' : 'market-like'} sensitivity to market movements.`;
    }

    // B) Rolling Volatility section
    const rollingVolatilityInsights = [];
    if (rollingVolatilityData.length > 0) {
      // Always include description
      rollingVolatilityInsights.push("Rolling volatility shows how 'bumpy' returns have been over time, measured as the 6-month rolling standard deviation of returns.");
      
      // Compare latest portfolio vs benchmark
      const volDiffAbs = Math.abs(volDiff);
      if (volDiffAbs > 2) {
        if (volDiff > 0) {
          rollingVolatilityInsights.push(`Latest portfolio volatility is ${volDiff.toFixed(1)} percentage points higher than benchmark (${portfolioVol.toFixed(1)}% vs ${benchmarkVol.toFixed(1)}%), indicating more variable returns.`);
        } else {
          rollingVolatilityInsights.push(`Latest portfolio volatility is ${Math.abs(volDiff).toFixed(1)} percentage points lower than benchmark (${portfolioVol.toFixed(1)}% vs ${benchmarkVol.toFixed(1)}%), indicating more stable returns.`);
        }
      } else {
        rollingVolatilityInsights.push(`Latest portfolio volatility (${portfolioVol.toFixed(1)}%) is similar to benchmark (${benchmarkVol.toFixed(1)}%), suggesting comparable risk levels.`);
      }
      
      // Trend statement
      if (rollingVolatilityData.length >= 2) {
        const earliestVol = rollingVolatilityData[0].portfolio;
        const volChange = portfolioVol - earliestVol;
        if (Math.abs(volChange) > 2) {
          if (volChange > 0) {
            rollingVolatilityInsights.push(`Volatility has been rising over the period (from ${earliestVol.toFixed(1)}% to ${portfolioVol.toFixed(1)}%), indicating increasing risk.`);
          } else {
            rollingVolatilityInsights.push(`Volatility has been falling over the period (from ${earliestVol.toFixed(1)}% to ${portfolioVol.toFixed(1)}%), indicating decreasing risk.`);
          }
        } else {
          rollingVolatilityInsights.push(`Volatility has remained relatively stable over the 6-month period.`);
        }
      }
    } else {
      rollingVolatilityInsights.push("Rolling volatility measures the variability of returns over a rolling time window, helping assess how consistent performance has been.");
      rollingVolatilityInsights.push("Higher volatility indicates larger price swings, which can mean both higher potential returns and higher potential losses.");
      rollingVolatilityInsights.push("Comparing portfolio volatility to a benchmark helps understand relative risk levels over time.");
    }

    // C) Rolling Beta section
    const rollingBetaInsights = [];
    if (rollingBetaData.length > 0) {
      // Always include explanation
      rollingBetaInsights.push("Beta measures how much the portfolio tends to move with the market (SPY). A beta of 1.0 means the portfolio moves in line with the market.");
      
      // Interpret latest beta
      if (latestBeta >= 1.15) {
        rollingBetaInsights.push(`Latest beta is ${latestBeta.toFixed(2)}, indicating the portfolio is more sensitive than the market and tends to amplify market movements.`);
      } else if (latestBeta <= 0.85) {
        rollingBetaInsights.push(`Latest beta is ${latestBeta.toFixed(2)}, indicating the portfolio is less sensitive than the market and may provide some downside protection.`);
      } else {
        rollingBetaInsights.push(`Latest beta is ${latestBeta.toFixed(2)}, indicating the portfolio moves closely with the market, providing market-like exposure.`);
      }
      
      // Stability check
      if (rollingBetaData.length >= 2) {
        const betaValues = rollingBetaData.map((d: any) => d.beta).filter((b): b is number => typeof b === 'number');
        if (betaValues.length > 1) {
          const mean = betaValues.reduce((a, b) => a + b, 0) / betaValues.length;
          const variance = betaValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / betaValues.length;
          const stdDev = Math.sqrt(variance);
          
          if (stdDev > 0.15) {
            rollingBetaInsights.push(`Beta has been changing significantly over time (standard deviation ${stdDev.toFixed(2)}), suggesting the portfolio's market sensitivity is not stable.`);
          } else {
            rollingBetaInsights.push(`Beta has remained relatively stable over the period, indicating consistent market sensitivity.`);
          }
        }
      }
    } else {
      rollingBetaInsights.push("Beta measures the portfolio's sensitivity to market movements relative to a benchmark (typically SPY for US markets).");
      rollingBetaInsights.push("A beta greater than 1.0 means the portfolio tends to move more than the market, while a beta less than 1.0 means it moves less.");
      rollingBetaInsights.push("Understanding beta helps assess how much market risk the portfolio carries and how it might perform in different market conditions.");
    }

    // D) Risk Contributions section
    const riskContributionsInsights = [];
    if (riskContributionsData.length > 0) {
      // Always include explanation
      riskContributionsInsights.push("Shows which holdings drive most of the portfolio's volatility, helping identify concentration risks.");
      
      // Identify top contributor and concentration
      const sortedContribs = [...riskContributionsData].sort((a: any, b: any) => Math.abs(b.contribution) - Math.abs(a.contribution));
      const topContrib = sortedContribs[0];
      
      if (Math.abs(topContrib.contribution) >= 35) {
        riskContributionsInsights.push(`${topContrib.ticker} accounts for ${Math.abs(topContrib.contribution).toFixed(1)}% of total risk, indicating risk is concentrated in this holding.`);
      } else {
        riskContributionsInsights.push(`${topContrib.ticker} is the largest risk driver at ${Math.abs(topContrib.contribution).toFixed(1)}%, but risk is spread across multiple holdings.`);
      }
      
      // Top 3 combined
      const top3Sum = sortedContribs.slice(0, 3).reduce((sum: number, c: any) => sum + Math.abs(c.contribution), 0);
      if (top3Sum >= 70) {
        const top3Tickers = sortedContribs.slice(0, 3).map((c: any) => c.ticker).join(', ');
        riskContributionsInsights.push(`The top 3 holdings (${top3Tickers}) explain ${top3Sum.toFixed(1)}% of total risk, indicating significant concentration.`);
      } else {
        riskContributionsInsights.push(`Risk is diversified across holdings, with the top 3 accounting for ${top3Sum.toFixed(1)}% of total risk.`);
      }
    } else {
      riskContributionsInsights.push("Risk contributions break down how each holding contributes to the portfolio's overall volatility.");
      riskContributionsInsights.push("Holdings with higher contributions drive more of the portfolio's risk, while diversified portfolios spread risk more evenly.");
      riskContributionsInsights.push("Understanding risk contributions helps identify concentration and opportunities for better diversification.");
    }

    // E) Risk-Return Analysis section
    const riskReturnInsights = [];
    if (riskReturnScatterData.length > 0 && portfolioPoint && benchmarkPoint) {
      // Always include explanation
      riskReturnInsights.push("Compares return vs risk; portfolios in the upper-left (higher return, lower risk) show better efficiency than those in the lower-right.");
      
      // Compare portfolio vs benchmark quadrant
      const returnAdvantage = portfolioReturn > benchmarkReturn;
      const riskAdvantage = portfolioRisk < benchmarkRisk;
      
      if (returnAdvantage && riskAdvantage) {
        riskReturnInsights.push(`Portfolio achieves better efficiency with ${(portfolioReturn - benchmarkReturn).toFixed(1)}% higher return and ${(benchmarkRisk - portfolioRisk).toFixed(1)}% lower risk than the benchmark.`);
      } else if (returnAdvantage && !riskAdvantage) {
        riskReturnInsights.push(`Portfolio delivers ${(portfolioReturn - benchmarkReturn).toFixed(1)}% higher return but with ${(portfolioRisk - benchmarkRisk).toFixed(1)}% higher risk, indicating higher return comes with more volatility.`);
      } else if (!returnAdvantage && riskAdvantage) {
        riskReturnInsights.push(`Portfolio has ${(benchmarkReturn - portfolioReturn).toFixed(1)}% lower return but ${(benchmarkRisk - portfolioRisk).toFixed(1)}% lower risk, indicating a more conservative risk/return tradeoff.`);
      } else {
        riskReturnInsights.push(`Portfolio shows ${(benchmarkReturn - portfolioReturn).toFixed(1)}% lower return with ${(portfolioRisk - benchmarkRisk).toFixed(1)}% higher risk, suggesting a less efficient risk/return profile.`);
      }
      
      // Practical implication
      if (!returnAdvantage && !riskAdvantage) {
        // Worse tradeoff - suggest diversification
        if (riskContributionsData.length > 0) {
          const topContrib = [...riskContributionsData].sort((a: any, b: any) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];
          riskReturnInsights.push(`Consider reducing exposure to ${topContrib.ticker} (largest risk driver at ${Math.abs(topContrib.contribution).toFixed(1)}%) to improve the risk/return tradeoff.`);
        } else {
          riskReturnInsights.push(`Consider diversification strategies to improve the risk/return efficiency relative to the benchmark.`);
        }
      } else if (riskContributionsData.length > 0) {
        const topContrib = [...riskContributionsData].sort((a: any, b: any) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];
        if (Math.abs(topContrib.contribution) >= 35) {
          riskReturnInsights.push(`Risk profile is broadly in line with the benchmark, though concentration in ${topContrib.ticker} (${Math.abs(topContrib.contribution).toFixed(1)}% of risk) warrants monitoring.`);
        } else {
          riskReturnInsights.push(`Risk profile is broadly in line with the benchmark with well-diversified risk contributions.`);
        }
      } else {
        riskReturnInsights.push(`Risk profile is broadly in line with the benchmark.`);
      }
    } else {
      riskReturnInsights.push("The risk-return scatterplot shows how different investments compare on two key dimensions: return (vertical axis) and risk/volatility (horizontal axis).");
      riskReturnInsights.push("Portfolios positioned in the upper-left quadrant offer the best risk-adjusted returns, while those in the lower-right have less favorable profiles.");
      riskReturnInsights.push("Comparing your portfolio to benchmarks helps assess whether you're being adequately compensated for the risk you're taking.");
    }

    return {
      keyTakeaway,
      rollingVolatility: rollingVolatilityInsights,
      rollingBeta: rollingBetaInsights,
      riskContributions: riskContributionsInsights,
      riskReturn: riskReturnInsights,
    };
  };

  const riskAIInsights = generateRiskAIInsights();

  // YTD Contributors data (similar to returnsData and drawdownData pattern)
  const contributorsData = (analysisData?.charts?.ytdContributions && analysisData.charts.ytdContributions.length > 0) ? (() => {
    const contributions = analysisData.charts.ytdContributions;
    
    // Separate positive and negative contributors, sort them
    const positives = contributions
      .filter((c: any) => c.contribution > 0)
      .sort((a: any, b: any) => b.contribution - a.contribution)
      .slice(0, 5);
    const negatives = contributions
      .filter((c: any) => c.contribution < 0)
      .sort((a: any, b: any) => a.contribution - b.contribution)
      .slice(0, 5);
    
    // Combine: negatives first (top), positives later (bottom)
    return [...negatives, ...positives];
  })() : [];

  // Generate AI Insights based on computed metrics (must be called after contributorsData and monthlyReturnsMatrix are defined)
  const generateAIInsights = () => {
    if (!analysisData) {
      return {
        keyTakeaway: "Load a portfolio to see insights.",
        cumulativeReturns: [],
        monthlyReturns: [],
        contributors: [],
        drawdown: [],
        riskNote: "",
      };
    }

    const metrics5Y = analysisData.performanceMetrics5Y;
    const portfolioCumRet = metrics5Y?.cumulativeReturn5Y ?? 0;
    const benchmarkCumRet = metrics5Y?.cumulativeReturn5YBenchmark ?? 0;
    // Both values are already percentages from backend
    const portfolioCagr = metrics5Y?.cagr5Y ? metrics5Y.cagr5Y : 0;
    const benchmarkCagr = metrics5Y?.cagr5YBenchmark ? metrics5Y.cagr5YBenchmark : 0;
    const portfolioMaxDD = metrics5Y?.maxDrawdown5Y ? Math.abs(metrics5Y.maxDrawdown5Y) : 0;
    const benchmarkMaxDD = metrics5Y?.maxDrawdown5YBenchmark ? Math.abs(metrics5Y.maxDrawdown5YBenchmark) : 0;
    const cumRetDiff = portfolioCumRet - benchmarkCumRet;
    const cagrDiff = portfolioCagr - benchmarkCagr;

    // Key Takeaway
    let keyTakeaway = "";
    if (cumRetDiff > 5) {
      keyTakeaway = `Your portfolio has outperformed the benchmark by ${cumRetDiff.toFixed(1)} percentage points over the past 5 years, demonstrating strong relative performance.`;
    } else if (cumRetDiff < -5) {
      keyTakeaway = `Your portfolio has underperformed the benchmark by ${Math.abs(cumRetDiff).toFixed(1)} percentage points over the past 5 years.`;
    } else {
      keyTakeaway = `Your portfolio's 5-year performance is closely aligned with the benchmark, with a difference of ${Math.abs(cumRetDiff).toFixed(1)} percentage points.`;
    }

    // Cumulative Returns Insights
    const cumulativeReturnsInsights = [
      cumRetDiff > 0 
        ? `Portfolio generated ${portfolioCumRet.toFixed(1)}% total return vs ${benchmarkCumRet.toFixed(1)}% for the benchmark, outperforming by ${cumRetDiff.toFixed(1)} percentage points.`
        : `Portfolio generated ${portfolioCumRet.toFixed(1)}% total return vs ${benchmarkCumRet.toFixed(1)}% for the benchmark, underperforming by ${Math.abs(cumRetDiff).toFixed(1)} percentage points.`,
      portfolioCagr > 0 && benchmarkCagr > 0
        ? `Annualized return of ${portfolioCagr.toFixed(2)}% compares to ${benchmarkCagr.toFixed(2)}% for the benchmark${cagrDiff > 0 ? ', indicating consistent outperformance' : ', showing room for improvement'}.`
        : `Portfolio achieved an annualized return of ${portfolioCagr.toFixed(2)}% over the 5-year period.`,
      `The cumulative returns chart shows how $1,000 invested would have grown over time, with both portfolio and benchmark lines reflecting market fluctuations.`,
    ];

    // Monthly Returns Insights
    const monthlyReturnsInsights = [];
    if (monthlyReturnsMatrix && monthlyReturnsMatrix.matrix && monthlyReturnsMatrix.matrix.length > 0) {
      // Find best and worst months
      let bestMonth = { value: -Infinity, month: '', year: 0 };
      let worstMonth = { value: Infinity, month: '', year: 0 };
      try {
        monthlyReturnsMatrix.matrix.forEach((row, yearIdx) => {
          if (row && Array.isArray(row)) {
            row.forEach((value, monthIdx) => {
              if (value !== null && typeof value === 'number') {
                if (value > bestMonth.value) {
                  bestMonth = { value: value, month: monthlyReturnsMatrix.months?.[monthIdx] || '', year: monthlyReturnsMatrix.years?.[yearIdx] || 0 };
                }
                if (value < worstMonth.value) {
                  worstMonth = { value: value, month: monthlyReturnsMatrix.months?.[monthIdx] || '', year: monthlyReturnsMatrix.years?.[yearIdx] || 0 };
                }
              }
            });
          }
        });
      } catch (e) {
        // If there's an error, just use fallback insights
      }

      if (bestMonth.value > -Infinity) {
        monthlyReturnsInsights.push(`Best performing month was ${bestMonth.month} ${bestMonth.year} with a return of ${(bestMonth.value * 100).toFixed(1)}%.`);
      }
      if (worstMonth.value < Infinity) {
        monthlyReturnsInsights.push(`Worst performing month was ${worstMonth.month} ${worstMonth.year} with a return of ${(worstMonth.value * 100).toFixed(1)}%.`);
      }
      monthlyReturnsInsights.push(`The heatmap reveals monthly return patterns, with green indicating positive months and red showing negative periods, helping identify seasonal trends and volatility clusters.`);
    } else {
      monthlyReturnsInsights.push(`Monthly returns data shows the performance breakdown by month and year, with color intensity indicating the magnitude of returns.`);
      monthlyReturnsInsights.push(`Analyze the heatmap to identify which months have historically been strongest or weakest for your portfolio.`);
      monthlyReturnsInsights.push(`Consistent patterns in the monthly data can help inform timing decisions and risk management strategies.`);
    }

    // Contributors Insights
    const contributorsInsights = [];
    if (contributorsData.length > 0) {
      const topPositive = contributorsData.filter((c: any) => c.contribution > 0).slice(0, 2);
      const topNegative = contributorsData.filter((c: any) => c.contribution < 0).slice(0, 2);
      
      if (topPositive.length > 0) {
        const topContributor = topPositive[0];
        contributorsInsights.push(`${topContributor.ticker} contributed the most to YTD returns at ${topContributor.contribution >= 0 ? '+' : ''}${topContributor.contribution.toFixed(2)} percentage points, representing its share of the portfolio's total return.`);
      }
      if (topNegative.length > 0) {
        const worstContributor = topNegative[0];
        contributorsInsights.push(`${worstContributor.ticker} had the largest negative impact at ${worstContributor.contribution.toFixed(2)} percentage points, dragging down overall performance.`);
      }
      contributorsInsights.push(`Contributions represent each holding's percentage-point impact on total portfolio return (weight × return), not the holding's standalone return.`);
    } else {
      contributorsInsights.push(`YTD contributions break down how each holding in your portfolio has affected total returns.`);
      contributorsInsights.push(`Positive contributors (green bars) added to performance, while negative contributors (red bars) reduced it.`);
      contributorsInsights.push(`Each bar shows the percentage-point contribution, calculated as the holding's weight multiplied by its return.`);
    }

    // Drawdown Insights
    const drawdownInsights = [];
    if (portfolioMaxDD > 0) {
      drawdownInsights.push(`Maximum drawdown reached ${portfolioMaxDD.toFixed(1)}%${portfolioMaxDD < benchmarkMaxDD ? `, which is lower than the benchmark's ${benchmarkMaxDD.toFixed(1)}%, indicating better downside protection` : `, compared to ${benchmarkMaxDD.toFixed(1)}% for the benchmark`}.`);
      drawdownInsights.push(`The drawdown chart shows periods when portfolio value declined from previous peaks, helping identify how long recoveries took.`);
      drawdownInsights.push(`Lower and shorter drawdowns indicate better risk management and smoother performance over time.`);
    } else {
      drawdownInsights.push(`Drawdown measures the decline from peak portfolio value, showing the worst peak-to-trough decline experienced.`);
      drawdownInsights.push(`Understanding drawdown patterns helps assess how your portfolio handles market downturns and recovery periods.`);
      drawdownInsights.push(`A portfolio with lower maximum drawdowns typically provides a smoother investment experience.`);
    }

    // Risk Note
    let riskNote = "";
    if (portfolioMaxDD > 20) {
      riskNote = `The portfolio experienced significant drawdowns (over ${portfolioMaxDD.toFixed(1)}%), which may indicate higher volatility and potential for large losses during market downturns.`;
    } else if (portfolioMaxDD > 10) {
      riskNote = `While the portfolio has shown drawdowns of up to ${portfolioMaxDD.toFixed(1)}%, this level of volatility is common in equity investments and requires appropriate risk tolerance.`;
    } else {
      riskNote = `The portfolio has maintained relatively low drawdowns, suggesting more stable performance with reduced downside risk compared to more volatile strategies.`;
    }

    return {
      keyTakeaway,
      cumulativeReturns: cumulativeReturnsInsights,
      monthlyReturns: monthlyReturnsInsights,
      contributors: contributorsInsights,
      drawdown: drawdownInsights,
      riskNote,
    };
  };

  const aiInsights = generateAIInsights();

  // Generate Summary Insights
  const generateSummaryInsights = () => {
    if (!analysisData) {
      return {
        headline: "Load a portfolio to see insights.",
        returns: [],
        risk: [],
        allocation: [],
        whatToWatch: [],
      };
    }

    const metrics5Y = analysisData.performanceMetrics5Y;
    // Both CAGR values are already percentages from backend (e.g., 15.37 for 15.37%)
    const portfolioCagr5Y = metrics5Y?.cagr5Y ? metrics5Y.cagr5Y : 0;
    const benchmarkCagr5Y = metrics5Y?.cagr5YBenchmark ? metrics5Y.cagr5YBenchmark : 0;
    const portfolioSharpe3Y = analysisData.riskMetrics?.sharpeRatio ?? 0;
    const benchmarkSharpe3Y = analysisData.benchmarkRiskMetrics?.sharpeRatio ?? 0;

    // Headline based on 5Y CAGR and 3Y Sharpe
    // Note: cagrDiff comparison uses percentage values directly (e.g., 15.37 vs 14.66)
    let headline = "";
    const cagrDiff = portfolioCagr5Y - benchmarkCagr5Y;
    const sharpeDiff = portfolioSharpe3Y - benchmarkSharpe3Y;
    
    if (cagrDiff > 0.02 && sharpeDiff > 0.2) {
      headline = "On track: Your portfolio is outperforming the benchmark with strong risk-adjusted returns.";
    } else if (cagrDiff < -0.02 && sharpeDiff < -0.2) {
      headline = "Needs attention: Your portfolio is underperforming the benchmark with lower risk-adjusted returns.";
    } else {
      headline = "Mixed: Your portfolio shows mixed results compared to the benchmark across returns and risk-adjusted performance.";
    }

    const insights: {
      returns: string[];
      risk: string[];
      allocation: string[];
      whatToWatch: string[];
    } = {
      returns: [],
      risk: [],
      allocation: [],
      whatToWatch: [],
    };

    // Returns insights (5Y)
    if (typeof finalValue5Y === 'number' && !isNaN(finalValue5Y) && typeof benchmarkFinalValue5Y === 'number' && !isNaN(benchmarkFinalValue5Y)) {
      const valueDiff = finalValue5Y - benchmarkFinalValue5Y;
      if (valueDiff > 0) {
        insights.returns.push(`Your $1,000 investment grew to $${finalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })} over 5 years, ${valueDiff > 50 ? 'significantly' : 'slightly'} outperforming the benchmark's $${benchmarkFinalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`);
      } else {
        insights.returns.push(`Your $1,000 investment grew to $${finalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })} over 5 years, ${Math.abs(valueDiff) > 50 ? 'significantly' : 'slightly'} underperforming the benchmark's $${benchmarkFinalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`);
      }
    }
    
    if (typeof cumulativeReturn5Y === 'number' && !isNaN(cumulativeReturn5Y) && typeof benchmarkCumulativeReturn5Y === 'number' && !isNaN(benchmarkCumulativeReturn5Y)) {
      const cumRetDiff = cumulativeReturn5Y - benchmarkCumulativeReturn5Y;
      if (Math.abs(cumRetDiff) > 1) {
        insights.returns.push(`5-year cumulative return of ${cumulativeReturn5Y.toFixed(1)}% ${cumRetDiff > 0 ? 'exceeds' : 'trails'} the benchmark's ${benchmarkCumulativeReturn5Y.toFixed(1)}% by ${Math.abs(cumRetDiff).toFixed(1)} percentage points.`);
      }
    }

    if (typeof portfolioCagr5Y === 'number' && !isNaN(portfolioCagr5Y) && portfolioCagr5Y !== 0) {
      // portfolioCagr5Y is already a percentage from backend (e.g., 15.37 for 15.37%)
      const portfolioCagrPct = portfolioCagr5Y;
      if (typeof benchmarkCagr5Y === 'number' && !isNaN(benchmarkCagr5Y)) {
        // benchmarkCagr5Y is already a percentage from backend
        const benchmarkCagrPct = benchmarkCagr5Y;
        const cagrDiff5Y = portfolioCagrPct - benchmarkCagrPct;
        insights.returns.push(`Annualized return over 5 years is ${portfolioCagrPct.toFixed(2)}%${Math.abs(cagrDiff5Y) > 1 ? `, ${cagrDiff5Y > 0 ? 'above' : 'below'} the benchmark's ${benchmarkCagrPct.toFixed(2)}%` : ''}.`);
      } else {
        insights.returns.push(`Annualized return over 5 years is ${portfolioCagrPct.toFixed(2)}%.`);
      }
    }

    // Risk insights (3Y)
    // Both volatility values are already percentages from backend (e.g., 16.55 for 16.55%)
    const portfolioVol3Y = analysisData.riskMetrics?.annualVolatility;
    const benchmarkVol3Y = analysisData.benchmarkRiskMetrics?.annualVolatility;
    if (typeof portfolioVol3Y === 'number' && !isNaN(portfolioVol3Y) && typeof benchmarkVol3Y === 'number' && !isNaN(benchmarkVol3Y)) {
      const volDiff = portfolioVol3Y - benchmarkVol3Y;
      if (Math.abs(volDiff) > 0.01) {
        insights.risk.push(`Volatility over the past 3 years is ${portfolioVol3Y.toFixed(1)}%${volDiff > 0 ? ', higher' : ', lower'} than the benchmark's ${benchmarkVol3Y.toFixed(1)}%, indicating ${volDiff > 0 ? 'more' : 'less'} price fluctuation.`);
      }
    }

    // Both max drawdown values are already percentages from backend (e.g., 29.73 for 29.73%)
    const portfolioMaxDD3Y = analysisData.riskMetrics?.maxDrawdown;
    const benchmarkMaxDD3Y = analysisData.benchmarkRiskMetrics?.maxDrawdown;
    if (typeof portfolioMaxDD3Y === 'number' && !isNaN(portfolioMaxDD3Y) && typeof benchmarkMaxDD3Y === 'number' && !isNaN(benchmarkMaxDD3Y)) {
      const ddDiff = Math.abs(portfolioMaxDD3Y) - Math.abs(benchmarkMaxDD3Y);
      if (Math.abs(ddDiff) > 0.01) {
        insights.risk.push(`Maximum decline from peak over 3 years reached ${Math.abs(portfolioMaxDD3Y).toFixed(1)}%${ddDiff > 0 ? ', more' : ', less'} than the benchmark's ${Math.abs(benchmarkMaxDD3Y).toFixed(1)}%.`);
      }
    }

    const portfolioBeta3Y = analysisData.riskMetrics?.beta;
    if (typeof portfolioBeta3Y === 'number' && !isNaN(portfolioBeta3Y)) {
      if (portfolioBeta3Y > 1.1) {
        insights.risk.push(`Beta of ${portfolioBeta3Y.toFixed(2)} indicates the portfolio is more sensitive to market movements than the benchmark.`);
      } else if (portfolioBeta3Y < 0.9) {
        insights.risk.push(`Beta of ${portfolioBeta3Y.toFixed(2)} indicates the portfolio is less sensitive to market movements than the benchmark.`);
      }
    }

    if (typeof portfolioSharpe3Y === 'number' && !isNaN(portfolioSharpe3Y) && typeof benchmarkSharpe3Y === 'number' && !isNaN(benchmarkSharpe3Y)) {
      const sharpeDiff3Y = portfolioSharpe3Y - benchmarkSharpe3Y;
      if (Math.abs(sharpeDiff3Y) > 0.1) {
        insights.risk.push(`Sharpe ratio of ${portfolioSharpe3Y.toFixed(2)} over 3 years ${sharpeDiff3Y > 0 ? 'exceeds' : 'trails'} the benchmark's ${benchmarkSharpe3Y.toFixed(2)}, indicating ${sharpeDiff3Y > 0 ? 'better' : 'weaker'} risk-adjusted performance.`);
      }
    }

    // Allocation insights
    const holdings = analysisData.holdings || [];
    if (holdings.length > 0) {
      const sortedHoldings = [...holdings].sort((a, b) => b.weight - a.weight);
      const topHolding = sortedHoldings[0];
      const topTwoWeight = sortedHoldings.slice(0, 2).reduce((sum, h) => sum + h.weight, 0);
      
      if (sortedHoldings.length > 0) {
        const topTickers = sortedHoldings.slice(0, Math.min(3, sortedHoldings.length)).map(h => h.ticker);
        if (topTickers.length === 1) {
          // Backend returns weights as percentages (46.0 for 46%), use directly
          insights.allocation.push(`${topTickers[0]} represents ${(topHolding.weight || 0).toFixed(1)}% of the portfolio.`);
        } else if (topTickers.length === 2) {
          insights.allocation.push(`Top holdings are ${topTickers[0]} (${(sortedHoldings[0].weight || 0).toFixed(1)}%) and ${topTickers[1]} (${(sortedHoldings[1].weight || 0).toFixed(1)}%).`);
        } else {
          insights.allocation.push(`Top holdings are ${topTickers[0]} (${(sortedHoldings[0].weight || 0).toFixed(1)}%), ${topTickers[1]} (${(sortedHoldings[1].weight || 0).toFixed(1)}%), and ${topTickers[2]} (${(sortedHoldings[2].weight || 0).toFixed(1)}%).`);
        }
      }

      if (topHolding.weight > 0.35) {
        insights.allocation.push(`High concentration: ${topHolding.ticker} makes up over 35% of the portfolio, increasing exposure to a single holding.`);
      } else if (topTwoWeight > 0.60) {
        insights.allocation.push(`Moderate concentration: Top two holdings account for over 60% of the portfolio.`);
      }
    }

    // What to Watch
    if (typeof portfolioBeta3Y === 'number' && !isNaN(portfolioBeta3Y)) {
      if (portfolioBeta3Y > 1.1) {
        insights.whatToWatch.push(`The portfolio's high beta (${portfolioBeta3Y.toFixed(2)}) means it will likely move more than the market during volatility—both up and down.`);
      } else if (portfolioBeta3Y < 0.9) {
        insights.whatToWatch.push(`The portfolio's low beta (${portfolioBeta3Y.toFixed(2)}) suggests it may move less than the market during volatility.`);
      }
    }

    if (holdings.length > 0) {
      const sortedHoldings = [...holdings].sort((a, b) => b.weight - a.weight);
      const topHolding = sortedHoldings[0];
      if (topHolding.weight > 0.35) {
        insights.whatToWatch.push(`Monitor concentration risk: ${topHolding.ticker} represents a significant portion of the portfolio, so its performance will heavily impact overall results.`);
      }
    }

    if (insights.whatToWatch.length === 0 && typeof portfolioBeta3Y === 'number' && !isNaN(portfolioBeta3Y)) {
      insights.whatToWatch.push(`Keep an eye on how the portfolio performs relative to the market during different market conditions given its beta of ${portfolioBeta3Y.toFixed(2)}.`);
    }

    return {
      headline,
      ...insights,
    };
  };

  const summaryInsights = generateSummaryInsights();

  return (
    <DashboardLayout title="Portfolio Analysis" description="Complete analysis report">
      {/* Loading/Error States */}
      {isLoading && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg text-center">
          <p className="text-muted-foreground">Loading portfolio analysis from Portfolio Analysis API...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-destructive font-medium">Error: {error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure the Portfolio Analysis API server is running: <code className="bg-muted px-1 rounded">cd "/Users/edmundo/Desktop/Projects/Portfolio Analysis" && python api_server.py</code>
          </p>
        </div>
      )}

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
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid hsl(var(--border))' }}>
          <PieChart className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display">Summary</h2>
        </div>

        {/* Summary Header */}
        <div className="bg-muted/30 rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
          <div>
            <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Start Date</span>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Calculations use a 5-year (60-month) lookback period by default, but automatically default to the latest date for which price data is available for all portfolio holdings. This ensures consistent calculations when securities have different start dates (e.g., IPOs).
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <span className="block font-medium">
              {analysisData?.meta?.effectiveStartDate 
                ? new Date(analysisData.meta.effectiveStartDate).toLocaleDateString()
                : (analysisData?.charts?.growthOf100 && analysisData.charts.growthOf100.length > 0
                  ? new Date(analysisData.charts.growthOf100[0].date).toLocaleDateString()
                  : 'N/A')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">End Date</span>
            <span className="block font-medium">
              {analysisData?.charts?.growthOf100 && analysisData.charts.growthOf100.length > 0
                ? new Date(analysisData.charts.growthOf100[analysisData.charts.growthOf100.length - 1].date).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          {analysisData && (
            <>
          <div>
            <span className="text-muted-foreground">Benchmark</span>
                <span className="block font-medium">{analysisData.meta?.benchmarkTicker || 'SPY'}</span>
          </div>
              <div>
                <span className="text-muted-foreground">Risk-Free Rate</span>
                <span className="block font-medium">{((analysisData.meta?.riskFreeRate || 0) * 100).toFixed(2)}%</span>
              </div>
            </>
          )}
          <div>
            <span className="text-muted-foreground">Currency</span>
            <span className="block font-medium">USD</span>
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
                <p className="text-xl font-display font-bold">
                  ${finalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  (finalValue5Y - benchmarkFinalValue5Y) >= 0
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                  }`}>
                  {(() => {
                    const diff = finalValue5Y - benchmarkFinalValue5Y;
                    return diff >= 0 ? `+$${diff.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `-$${Math.abs(diff).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
                  })()}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: ${benchmarkFinalValue5Y.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Cumulative Return" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">{cumulativeReturn5Y.toFixed(1)}%</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  (cumulativeReturn5Y - benchmarkCumulativeReturn5Y) >= 0 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {formatDiff(cumulativeReturn5Y, benchmarkCumulativeReturn5Y)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Benchmark: {benchmarkCumulativeReturn5Y.toFixed(1)}%</p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="CAGR" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">{cagr !== null ? `${cagr.toFixed(2)}%` : "—"}</p>
                {cagr !== null && benchmarkCagr !== null && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    (cagr - benchmarkCagr) >= 0 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {formatDiff(cagr, benchmarkCagr)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {benchmarkCagr !== null ? `${benchmarkCagr.toFixed(2)}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Risk Metrics Cards */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-1">Risk</h3>
          <p className="text-xs text-muted-foreground mb-3">Risk metrics calculated over the most recent 3-year period</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Annualized Volatility" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">
                  {analysisData?.riskMetrics?.annualVolatility ? `${(analysisData.riskMetrics.annualVolatility).toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.annualVolatility !== undefined && analysisData?.benchmarkRiskMetrics?.annualVolatility !== null
                  ? `${(analysisData.benchmarkRiskMetrics.annualVolatility).toFixed(2)}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Max Drawdown" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold text-destructive">
                  {analysisData?.riskMetrics?.maxDrawdown ? `${(analysisData.riskMetrics.maxDrawdown).toFixed(2)}%` : 'N/A'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.maxDrawdown !== undefined && analysisData?.benchmarkRiskMetrics?.maxDrawdown !== null
                  ? `${(analysisData.benchmarkRiskMetrics.maxDrawdown).toFixed(2)}%`
                  : 'N/A'}
              </p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Beta" /></p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-display font-bold">
                  {analysisData?.riskMetrics?.beta !== undefined && analysisData?.riskMetrics?.beta !== null
                    ? analysisData.riskMetrics.beta.toFixed(2)
                    : 'N/A'}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.beta !== undefined && analysisData?.benchmarkRiskMetrics?.beta !== null
                  ? analysisData.benchmarkRiskMetrics.beta.toFixed(2)
                  : '1.00'}
              </p>
            </div>
          </div>
        </div>

        {/* Ratio Metrics Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Sharpe Ratio" /></p>
              <div className="flex items-center gap-2">
                {analysisData?.riskMetrics?.sharpeRatio === null || analysisData?.riskMetrics?.sharpeRatio === undefined ? (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xl font-display font-bold text-muted-foreground cursor-help inline-flex items-center gap-1">
                          — <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        <p>Not enough data to compute a reliable estimate.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                ) : (
                  <p className="text-xl font-display font-bold">
                    {analysisData?.riskMetrics?.sharpeRatio !== undefined && analysisData?.riskMetrics?.sharpeRatio !== null
                      ? analysisData.riskMetrics.sharpeRatio.toFixed(2)
                      : '—'}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.sharpeRatio !== undefined && analysisData?.benchmarkRiskMetrics?.sharpeRatio !== null
                  ? analysisData.benchmarkRiskMetrics.sharpeRatio.toFixed(2)
                  : '—'}
              </p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Sortino Ratio" /></p>
              <div className="flex items-center gap-2">
                {analysisData?.riskMetrics?.sortinoRatio === null || analysisData?.riskMetrics?.sortinoRatio === undefined ? (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xl font-display font-bold text-muted-foreground cursor-help inline-flex items-center gap-1">
                          — <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        <p>Not enough data to compute a reliable estimate.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                ) : (
                  <p className="text-xl font-display font-bold">
                    {analysisData?.riskMetrics?.sortinoRatio !== undefined && analysisData?.riskMetrics?.sortinoRatio !== null
                      ? analysisData.riskMetrics.sortinoRatio.toFixed(2)
                      : '—'}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.sortinoRatio !== undefined && analysisData?.benchmarkRiskMetrics?.sortinoRatio !== null
                  ? analysisData.benchmarkRiskMetrics.sortinoRatio.toFixed(2)
                  : '—'}
              </p>
            </div>
            <div className="stat-card border border-border">
              <p className="text-xs text-muted-foreground mb-1"><MetricTooltip metric="Calmar Ratio" /></p>
              <div className="flex items-center gap-2">
                {analysisData?.riskMetrics?.calmarRatio === null || analysisData?.riskMetrics?.calmarRatio === undefined ? (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xl font-display font-bold text-muted-foreground cursor-help inline-flex items-center gap-1">
                          — <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[280px] text-xs">
                        <p>Not enough data to compute a reliable estimate.</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                ) : (
                  <p className="text-xl font-display font-bold">
                    {analysisData?.riskMetrics?.calmarRatio !== undefined && analysisData?.riskMetrics?.calmarRatio !== null
                      ? analysisData.riskMetrics.calmarRatio.toFixed(2)
                      : 'N/A'}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Benchmark: {analysisData?.benchmarkRiskMetrics?.calmarRatio !== undefined && analysisData?.benchmarkRiskMetrics?.calmarRatio !== null
                  ? analysisData.benchmarkRiskMetrics.calmarRatio.toFixed(2)
                  : '—'}
              </p>
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
                      color: "white",
                    }}
                    itemStyle={{
                      color: "white",
                    }}
                    labelStyle={{
                      color: "white",
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
                  <span className="text-muted-foreground">{Math.round(item.value)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Period Returns */}
          <div className="card-elevated p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium">Period Returns vs Benchmark</h3>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs">
                    <p>3Y and 5Y results are annualized for comparability across different time horizons</p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {periodReturns.map((item) => {
                const hasTooltip = ['1Y', '3Y', '5Y'].includes(item.period);
                const periodLabel = item.period === '1Y' ? '1-year' : item.period === '3Y' ? '3-year' : item.period === '5Y' ? '5-year' : item.period;
                
                return (
                <div key={item.period} className="text-center p-2 rounded-lg bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block mb-1">{item.period}</span>
                    {item.portfolio === null && hasTooltip ? (
                      <TooltipProvider>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-sm font-medium block text-muted-foreground cursor-help inline-flex items-center justify-center gap-1">
                              — <Info className="h-3 w-3" />
                  </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px] text-xs">
                            <p>Unavailable: Some holdings are newer than this time horizon, so a full {periodLabel} return can't be calculated.</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    ) : (
                      <span className={`font-mono text-sm font-medium block ${
                        item.portfolio === null 
                          ? "text-muted-foreground" 
                          : (item.portfolio >= 0 ? "text-success" : "text-destructive")
                      }`}>
                        {item.portfolio === null 
                          ? "—" 
                          : `${item.portfolio >= 0 ? "+" : ""}${item.portfolio.toFixed(1)}%`
                        }
                      </span>
                    )}
                    <span className={`text-[10px] block mt-1 ${
                      item.portfolio === null || item.benchmark === null
                        ? "text-muted-foreground"
                        : (item.portfolio > item.benchmark ? "text-success" : "text-destructive")
                    }`}>
                    {formatDiff(item.portfolio, item.benchmark)}
                  </span>
                </div>
                );
              })}
            </div>
            
            {/* Performance Summary */}
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-3">Performance Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {performanceSummary}
              </p>
                </div>
          </div>
        </div>

        {/* Summary Insights */}
        <div className="card-elevated p-6 mt-6">
          <h3 className="text-sm font-medium mb-4">Summary Insights</h3>
          
          {/* Headline */}
          <div className="mb-5 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-foreground">{summaryInsights.headline}</p>
          </div>

          <div className="space-y-4">
            {/* Returns */}
            {summaryInsights.returns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Returns</h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {summaryInsights.returns.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
            </div>
            )}

            {/* Risk */}
            {summaryInsights.risk.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Risk</h4>
                <p className="text-xs text-muted-foreground mb-2 italic">Risk metrics based on the most recent 3 years</p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {summaryInsights.risk.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
                </div>
            )}

            {/* Allocation */}
            {summaryInsights.allocation.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Allocation</h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {summaryInsights.allocation.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
            </div>
            )}

            {/* What to Watch */}
            {summaryInsights.whatToWatch.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">What to Watch</h4>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {summaryInsights.whatToWatch.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            { id: "monthlyReturns", label: "Monthly Returns" },
            { id: "contributors", label: "Contributors to Return" },
            { id: "drawdown", label: "Drawdown" },
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
              {perfTab === "monthlyReturns" && "Monthly Returns Heatmap"}
              {perfTab === "contributors" && "Contributors to Return (YTD)"}
              {perfTab === "drawdown" && "Drawdown"}
            </h3>
            {perfTab !== "monthlyReturns" && (
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
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {perfTab === "cumulative" ? (
                <AreaChart data={returnsData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                    tickFormatter={(v) => {
                      if (v >= 1000) {
                        return `$${(v/1000).toFixed(0)}k`;
                      } else {
                        return `$${v.toFixed(0)}`;
                      }
                    }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const color = entry.dataKey === 'portfolio' 
                                ? 'hsl(var(--success))' 
                                : 'hsl(280 65% 60%)';
                              const name = entry.dataKey === 'portfolio' ? 'Portfolio' : 'SPY';
                              const roundedValue = typeof entry.value === 'number' 
                                ? Math.round(entry.value).toLocaleString() 
                                : entry.value;
                              return (
                                <p key={index} style={{ color }} className="text-xs font-medium">
                                  {name}: ${roundedValue}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="benchmark" stroke="hsl(280 65% 60%)" strokeWidth={1.5} fill="transparent" name="SPY" />
                  <Area type="monotone" dataKey="portfolio" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#portfolioGradient)" name="Portfolio" />
                </AreaChart>
              ) : perfTab === "monthlyReturns" && monthlyReturnsMatrix ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-full h-full overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="p-1.5 sticky left-0 bg-background z-10"></th>
                          {monthlyReturnsMatrix.months.map((month) => (
                            <th key={month} className="p-1.5 text-center font-mono font-medium">{month}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyReturnsMatrix.years.map((year, yearIdx) => {
                          // Calculate min/max for color scaling
                          const rowValues = monthlyReturnsMatrix.matrix[yearIdx].filter((v): v is number => v !== null);
                          const minReturn = rowValues.length > 0 ? Math.min(...rowValues) : 0;
                          const maxReturn = rowValues.length > 0 ? Math.max(...rowValues) : 0;
                          const maxAbs = Math.max(Math.abs(minReturn), Math.abs(maxReturn));
                          
                          return (
                            <tr key={year}>
                              <td className="p-1.5 font-mono font-medium sticky left-0 bg-background z-10">{year}</td>
                              {monthlyReturnsMatrix.matrix[yearIdx].map((value, monthIdx) => {
                                if (value === null) {
                                  return (
                                    <td key={monthIdx} className="p-1.5 text-center font-mono bg-muted/20">
                                      —
                                    </td>
                                  );
                                }
                                
                                // Color calculation: green for positive, red for negative, intensity based on magnitude
                                const normalizedValue = maxAbs > 0 ? value / maxAbs : 0;
                                const isPositive = value >= 0;
                                const intensity = Math.min(Math.abs(normalizedValue), 1);
                                
                                // Use success color for positive, destructive for negative
                                const bgColor = isPositive
                                  ? `hsl(142 76% ${36 + (1 - intensity) * 40}% / ${0.3 + intensity * 0.4})` // Green with varying intensity
                                  : `hsl(0 84% ${60 + (1 - intensity) * 20}% / ${0.3 + intensity * 0.4})`; // Red with varying intensity
                                
                                return (
                                  <td
                                    key={monthIdx}
                                    className="p-1.5 text-center font-mono"
                                    style={{
                                      backgroundColor: bgColor,
                                    }}
                                  >
                                    {(value * 100).toFixed(1)}%
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : perfTab === "drawdown" ? (
                <ComposedChart data={drawdownData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="perfDrawdownFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} domain={['dataMin', 0]} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const color = entry.dataKey === 'portfolio' 
                                ? 'hsl(var(--success))' 
                                : 'hsl(280 65% 60%)';
                              const name = entry.dataKey === 'portfolio' ? 'Portfolio' : 'SPY';
                              return (
                                <p key={index} style={{ color }} className="text-xs font-medium">
                                  {name}: {typeof entry.value === 'number' ? `${entry.value.toFixed(2)}%` : entry.value}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="benchmark" stroke="hsl(280 65% 60%)" strokeWidth={1.5} fill="transparent" name="SPY" />
                  <Area type="monotone" dataKey="portfolio" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#perfDrawdownFill)" name="Portfolio" />
                </ComposedChart>
              ) : perfTab === "contributors" && contributorsData.length > 0 ? (
                <BarChart data={contributorsData} layout="vertical" margin={{ top: 5, right: 80, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(2)}%`} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="ticker" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    itemStyle={{
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, "Contribution"]}
                    labelFormatter={(label) => `Ticker: ${label}`}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Bar 
                    dataKey="contribution" 
                    radius={[0, 4, 4, 0]}
                  >
                    {contributorsData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.contribution >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} 
                      />
                    ))}
                    <LabelList 
                      dataKey="contribution" 
                      position="right"
                      formatter={(value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`}
                      style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                  </Bar>
                </BarChart>
              ) : perfTab === "contributors" ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No contribution data available
                </div>
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
                    dataKey="benchmarkSharpe" 
                    stroke="hsl(280 65% 60%)" 
                    strokeWidth={1.5} 
                    dot={false} 
                    name="SPY" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="portfolioSharpe" 
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

        {/* AI Insights Card */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">AI Insights</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Automated Analysis</span>
            </div>
            </div>

          {/* Key Takeaway */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-foreground">{aiInsights.keyTakeaway}</p>
                </div>

          <div className="space-y-6">
            {/* Cumulative Returns Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Cumulative Returns</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {aiInsights.cumulativeReturns.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Monthly Returns Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Monthly Returns Heatmap</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {aiInsights.monthlyReturns.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
          </div>

            {/* Contributors Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold">Contributors to Return (YTD)</h4>
                <MetricTooltip metric="Return Contribution" />
            </div>
              <p className="text-xs text-muted-foreground mb-2 italic">
                How it's calculated: Each holding's contribution is its weight multiplied by its return, shown as percentage points added to (or subtracted from) total portfolio return.
              </p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {aiInsights.contributors.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Drawdown Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Drawdown</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {aiInsights.drawdown.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Note */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Risk note:</span> {aiInsights.riskNote}
              </p>
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
            { id: "drawdowns", label: "Rolling Volatility" },
            { id: "rollingBeta", label: "Rolling Beta" },
            { id: "riskContributions", label: "Risk Contributions" },
            { id: "riskReturn", label: "Risk-Return Analysis" },
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
              {riskTab === "drawdowns" && "Rolling Volatility (6-Months)"}
              {riskTab === "rollingBeta" && "Rolling Beta (6-Months) vs SPY"}
              {riskTab === "riskContributions" && "Risk Contributions (YTD)"}
              {riskTab === "riskReturn" && "Risk-Return Analysis (5 Years)"}
            </h3>
            {riskTab === "drawdowns" && (
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
              )}
            {riskTab === "rollingBeta" && (
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-success" />
                  <span>Beta</span>
            </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5" style={{ backgroundColor: "hsl(280 65% 60%)" }} />
                  <span className="text-muted-foreground">Market Beta (1.0)</span>
                </div>
                </div>
              )}
            {riskTab === "riskReturn" && riskReturnScatterData.length > 0 && (
              <div className="flex items-center gap-4 text-xs flex-wrap">
                {Array.from(new Map(riskReturnScatterData.map((entry: any) => [entry.label, entry])).values()).map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getRiskReturnColor(entry.label) }} />
                    <span className="text-muted-foreground">{entry.label}</span>
            </div>
                ))}
          </div>
            )}
          </div>
          {riskTab === "riskReturn" && riskReturnScatterData.length > 0 ? (
            <div className="grid lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 5, right: 20, bottom: 40, left: 40 }}>
                      <XAxis
                        type="number"
                        dataKey="risk"
                        name="Risk"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
                        label={{ value: "Annualized Volatility (%)", position: "bottom", offset: 15, fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="return"
                        name="Return"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 }}
                        label={{ value: "Annualized Return (%)", angle: -90, position: "insideLeft", offset: 10, fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          return [`${value.toFixed(2)}%`, name === "risk" ? "Volatility" : "Return"];
                        }}
                        labelFormatter={(label) => label}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const risk = payload.find((p: any) => p.dataKey === 'risk')?.value;
                            const ret = payload.find((p: any) => p.dataKey === 'return')?.value;
                            return (
                              <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                                <p className="text-xs font-medium text-foreground mb-1">{data.label}</p>
                                <p className="text-xs text-muted-foreground">Volatility: {typeof risk === 'number' ? `${risk.toFixed(2)}%` : risk}</p>
                                <p className="text-xs text-muted-foreground">Return: {typeof ret === 'number' ? `${ret.toFixed(2)}%` : ret}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {riskReturnScatterData.reduce((acc: any[], entry: any) => {
                        const existingGroup = acc.find((group: any) => group.label === entry.label);
                        if (existingGroup) {
                          existingGroup.data.push(entry);
                        } else {
                          acc.push({ label: entry.label, data: [entry], color: getRiskReturnColor(entry.label) });
                        }
                        return acc;
                      }, []).map((group: any, groupIndex: number) => (
                        <Scatter 
                          key={groupIndex}
                          data={group.data}
                          fill={group.color}
                          name={group.label}
                        >
                          <LabelList dataKey="label" position="right" fontSize={9} fill={group.color} />
                        </Scatter>
                      ))}
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-3 h-[400px] flex flex-col">
                <h4 className="text-sm font-semibold text-foreground mb-3">Benchmark Descriptions</h4>
                <div className="flex-1 space-y-3 overflow-y-auto">
                {Array.from(new Map(riskReturnScatterData.map((entry: any) => [entry.label, entry])).values()).map((entry: any, index: number) => {
                  const descriptions: { [key: string]: string } = {
                    'Portfolio': 'Your portfolio\'s risk-return profile over the last 5 years.',
                    'SPY': 'S&P 500 Index - A broad measure of U.S. large-cap equity performance, representing 500 of the largest publicly traded companies.',
                    'QQQ': 'Nasdaq-100 Index - Tracks 100 of the largest non-financial companies listed on the Nasdaq, heavily weighted toward technology and growth stocks.',
                    'AGG': 'Investment-Grade Bonds - A diversified bond index representing investment-grade U.S. bonds, typically offering lower risk and lower returns than equities.',
                    'ACWI': 'All Country World Index - A comprehensive global equity index covering developed and emerging markets, providing worldwide market exposure.'
                  };
                  return (
                    <div key={index} className="flex items-start gap-2.5">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: getRiskReturnColor(entry.label) }} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground mb-0.5">{entry.label}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {descriptions[entry.label] || 'Benchmark comparison point.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          ) : riskTab === "riskReturn" ? (
            <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
              No risk-return data available
            </div>
          ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {riskTab === "drawdowns" && rollingVolatilityData.length > 0 ? (
                <LineChart data={rollingVolatilityData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(1)}%`} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            {payload.map((entry: any, index: number) => {
                              const color = entry.dataKey === 'portfolio' 
                                ? 'hsl(var(--success))' 
                                : 'hsl(280 65% 60%)';
                              const name = entry.dataKey === 'portfolio' ? 'Portfolio' : 'SPY';
                              return (
                                <p key={index} style={{ color }} className="text-xs font-medium">
                                  {name}: {typeof entry.value === 'number' ? `${entry.value.toFixed(2)}%` : entry.value}
                                </p>
                              );
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="benchmark" stroke="hsl(280 65% 60%)" strokeWidth={1.5} dot={false} name="SPY" />
                  <Line type="monotone" dataKey="portfolio" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Portfolio" />
                </LineChart>
              ) : riskTab === "drawdowns" ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No rolling volatility data available
                </div>
              ) : riskTab === "rollingBeta" && rollingBetaData.length > 0 ? (
                <LineChart data={rollingBetaData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => v.toFixed(2)} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const entry = payload[0];
                        return (
                          <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p style={{ color: 'hsl(var(--success))' }} className="text-xs font-medium">
                              Beta: {typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine 
                    y={1} 
                    stroke="hsl(280 65% 60%)" 
                    strokeDasharray="3 3" 
                    strokeOpacity={0.8}
                  />
                  <Line type="monotone" dataKey="beta" stroke="hsl(var(--success))" strokeWidth={2} dot={false} name="Beta" />
                </LineChart>
              ) : riskTab === "rollingBeta" ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No rolling beta data available
                </div>
              ) : riskTab === "riskContributions" && riskContributionsData.length > 0 ? (
                <BarChart data={riskContributionsData} layout="vertical" margin={{ top: 5, right: 80, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(1)}%`} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="ticker" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    itemStyle={{
                      color: "hsl(var(--foreground))",
                    }}
                    labelStyle={{
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`, "Risk Contribution"]}
                    labelFormatter={(label) => `Ticker: ${label}`}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                    {riskContributionsData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.contribution >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                    ))}
                    <LabelList 
                      dataKey="contribution" 
                      position="right"
                      formatter={(value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`}
                      style={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                  </Bar>
                </BarChart>
              ) : riskTab === "riskContributions" ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No risk contribution data available
                </div>
              ) : null}
            </ResponsiveContainer>
          </div>
          )}
        </div>

        {/* AI Insights Card */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">AI Insights</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>Automated Analysis</span>
            </div>
            </div>

          {/* Key Takeaway */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-foreground">{riskAIInsights.keyTakeaway}</p>
                </div>

          <div className="space-y-6">
            {/* Rolling Volatility Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Rolling Volatility (6M)</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {riskAIInsights.rollingVolatility.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Rolling Beta Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Rolling Beta (6M)</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {riskAIInsights.rollingBeta.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
          </div>

            {/* Risk Contributions Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Risk Contributions</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {riskAIInsights.riskContributions.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk-Return Analysis Section */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Risk–Return Analysis</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {riskAIInsights.riskReturn.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
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
                    <th className="text-right">CAGR</th>
                    <th className="text-right">Volatility</th>
                    <th className="text-right">Best Day</th>
                    <th className="text-right">Worst Day</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHoldings && displayHoldings.length > 0 ? (
                    displayHoldings.map((holding, i) => (
                      <tr key={holding.ticker}>
                        <td className="font-mono font-medium flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {holding.ticker}
                        </td>
                        <td className="text-right font-mono">{holding.weight?.toFixed(2) || '0.00'}%</td>
                        <td className="text-right font-mono">
                          {holding.cagr !== null && holding.cagr !== undefined 
                            ? `${holding.cagr >= 0 ? '+' : ''}${holding.cagr.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="text-right font-mono">
                          {holding.volatility !== null && holding.volatility !== undefined 
                            ? `${holding.volatility.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="text-right font-mono text-success">
                          {holding.bestDay !== null && holding.bestDay !== undefined 
                            ? `+${holding.bestDay.toFixed(2)}%`
                            : '—'}
                        </td>
                        <td className="text-right font-mono text-destructive">
                          {holding.worstDay !== null && holding.worstDay !== undefined 
                            ? `${holding.worstDay.toFixed(2)}%`
                            : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-muted-foreground py-4">
                        No holdings data available
                      </td>
                    </tr>
                  )}
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
                    {correlationAssetsTransformed.map((asset) => (
                      <th key={asset} className="p-1.5 text-center font-mono">{asset}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationAssetsTransformed.map((row, i) => (
                    <tr key={row}>
                      <td className="p-1.5 font-mono font-medium">{row}</td>
                      {correlationAssetsTransformed.map((col, j) => {
                        const value = correlationMatrixData.length > i && correlationMatrixData[i].length > j 
                          ? correlationMatrixData[i][j] 
                          : (i === j ? 1 : 0);
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
                    data={efficientFrontierDataTransformed} 
                    fill="transparent" 
                    line={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 }} 
                    shape={() => null}
                  />
                  {/* Individual Assets */}
                  <Scatter 
                    data={assetPointsTransformed} 
                    fill="hsl(var(--destructive))"
                    opacity={0.8}
                  >
                    <LabelList dataKey="name" position="top" fontSize={9} fill="hsl(var(--muted-foreground))" />
                  </Scatter>
                  {/* Optimal Portfolio Points */}
                  <Scatter 
                    data={optimalPointsTransformed} 
                    fill="hsl(var(--success))"
                  >
                    <LabelList dataKey="name" position="bottom" fontSize={8} fill="hsl(var(--success))" />
                  </Scatter>
                  {/* My Strategy */}
                  <Scatter 
                    data={myStrategyPointTransformed} 
                    fill="hsl(var(--primary))"
                  >
                    <LabelList dataKey="name" position="top" fontSize={10} fontWeight={600} fill="hsl(var(--primary))" />
                  </Scatter>
                  {/* Benchmark */}
                  <Scatter 
                    data={benchmarkPointTransformed} 
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
