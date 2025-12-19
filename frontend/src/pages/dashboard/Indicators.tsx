import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfessionalChart, CHART_COLORS } from "@/components/charts/ProfessionalChart";
import { IndicatorOverlay, Indicator } from "@/components/charts/IndicatorOverlay";
import { ToolIntro } from "@/components/dashboard/ToolIntro";
import { 
  LineChart, 
  Settings2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Generate sample data
const generateChartData = () => {
  const data = [];
  let portfolioValue = 10000;
  let benchmarkValue = 10000;
  
  for (let i = 0; i < 252; i++) { // ~1 year of trading days
    const date = new Date();
    date.setDate(date.getDate() - (252 - i));
    
    const portfolioReturn = (Math.random() - 0.48) * 0.02;
    const benchmarkReturn = (Math.random() - 0.47) * 0.022;
    
    portfolioValue *= (1 + portfolioReturn);
    benchmarkValue *= (1 + benchmarkReturn);
    
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      portfolio: Math.round(portfolioValue),
      benchmark: Math.round(benchmarkValue),
      portfolioReturn: portfolioReturn * 100,
      benchmarkReturn: benchmarkReturn * 100,
    });
  }
  
  return data;
};

// Calculate moving average
const calculateMA = (data: any[], key: string, period: number) => {
  return data.map((d, i) => {
    if (i < period - 1) return { ...d, [`ma${period}`]: null };
    const slice = data.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, item) => sum + item[key], 0) / period;
    return { ...d, [`ma${period}`]: Math.round(avg) };
  });
};

// Calculate drawdown
const calculateDrawdown = (data: any[], key: string) => {
  let peak = data[0][key];
  return data.map((d) => {
    if (d[key] > peak) peak = d[key];
    const drawdown = ((d[key] - peak) / peak) * 100;
    return { ...d, drawdown };
  });
};

export default function Indicators() {
  const [baseData] = useState(generateChartData);
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>([]);
  const [showPanel, setShowPanel] = useState(true);

  const processedData = useMemo(() => {
    let data = [...baseData];
    
    // Apply active indicators
    activeIndicators.forEach((ind) => {
      if (!ind.enabled) return;
      
      if (ind.id.startsWith("ma") && ind.params?.period) {
        data = calculateMA(data, "portfolio", ind.params.period);
      }
      if (ind.id === "drawdown") {
        data = calculateDrawdown(data, "portfolio");
      }
    });
    
    return data;
  }, [baseData, activeIndicators]);

  const chartSeries = useMemo(() => {
    const series = [
      {
        key: "portfolio",
        name: "Portfolio",
        color: CHART_COLORS.portfolio,
        strokeWidth: 1.5,
        showArea: true,
      },
      {
        key: "benchmark",
        name: "Benchmark",
        color: CHART_COLORS.benchmark,
        strokeWidth: 1,
      },
    ];

    // Add indicator series
    activeIndicators.forEach((ind) => {
      if (!ind.enabled) return;
      
      if (ind.id === "ma50" || ind.id === "ma100" || ind.id === "ma200") {
        const period = ind.params?.period || 50;
        series.push({
          key: `ma${period}`,
          name: `MA ${period}`,
          color: ind.id === "ma50" ? "hsl(38 70% 50%)" : ind.id === "ma100" ? "hsl(280 40% 50%)" : "hsl(0 50% 50%)",
          strokeWidth: 1,
        });
      }
    });

    return series;
  }, [activeIndicators]);

  return (
    <DashboardLayout 
      title="Indicators & Charts" 
      description="Technical analysis and chart overlays"
    >
      <ToolIntro
        icon={LineChart}
        title="Indicators & Charts"
        description="Analyze your portfolio with technical indicators, moving averages, and custom overlays. Toggle indicators on and off to build custom chart views for detailed analysis."
        benefits={[
          "Overlay moving averages (MA50, MA100, MA200)",
          "View rolling returns and volatility",
          "Analyze drawdowns and relative performance",
          "Customize indicator parameters",
        ]}
      />

      <div className="flex gap-4">
        {/* Main chart area */}
        <div className="flex-1">
          <div className="card-elevated p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Portfolio Performance</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPanel(!showPanel)}
                  className="h-7"
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1" />
                  Indicators
                </Button>
                <Button variant="ghost" size="sm" className="h-7">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            
            <ProfessionalChart
              data={processedData}
              series={chartSeries}
              yAxisFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              tooltipFormatter={(v) => `$${v.toLocaleString()}`}
              showTimeline={true}
              height={320}
            />
          </div>

          {/* Drawdown chart if enabled */}
          {activeIndicators.find((i) => i.id === "drawdown" && i.enabled) && (
            <div className="card-elevated p-4 mb-4">
              <h3 className="text-sm font-medium mb-4">Drawdown Analysis</h3>
              <ProfessionalChart
                data={processedData}
                series={[
                  {
                    key: "drawdown",
                    name: "Drawdown",
                    color: CHART_COLORS.negative,
                    strokeWidth: 1.5,
                    showArea: true,
                  },
                ]}
                yAxisFormatter={(v) => `${v.toFixed(0)}%`}
                tooltipFormatter={(v) => `${v.toFixed(2)}%`}
                showTimeline={false}
                showReferenceLine={true}
                referenceValue={0}
                height={160}
              />
            </div>
          )}

          {/* Rolling returns if enabled */}
          {activeIndicators.find((i) => i.id === "rollingReturns" && i.enabled) && (
            <div className="card-elevated p-4">
              <h3 className="text-sm font-medium mb-4">Rolling Returns (21-day)</h3>
              <ProfessionalChart
                data={processedData}
                series={[
                  {
                    key: "portfolioReturn",
                    name: "Portfolio",
                    color: CHART_COLORS.portfolio,
                    strokeWidth: 1.5,
                  },
                  {
                    key: "benchmarkReturn",
                    name: "Benchmark",
                    color: CHART_COLORS.benchmark,
                    strokeWidth: 1,
                  },
                ]}
                yAxisFormatter={(v) => `${v.toFixed(1)}%`}
                tooltipFormatter={(v) => `${v.toFixed(2)}%`}
                showTimeline={false}
                showReferenceLine={true}
                referenceValue={0}
                height={160}
              />
            </div>
          )}
        </div>

        {/* Indicator panel */}
        {showPanel && (
          <div className="w-64 shrink-0">
            <div className="card-elevated p-4 sticky top-20">
              <h3 className="text-sm font-medium mb-3">Indicators</h3>
              <IndicatorOverlay onIndicatorsChange={setActiveIndicators} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
