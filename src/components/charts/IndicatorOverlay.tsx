import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Activity,
  BarChart3,
  LineChart,
  Target,
  AlertTriangle,
} from "lucide-react";

export interface Indicator {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  params?: Record<string, number>;
  category: "trend" | "volatility" | "momentum" | "risk";
}

const DEFAULT_INDICATORS: Indicator[] = [
  {
    id: "ma50",
    name: "MA 50",
    description: "50-period moving average",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    enabled: false,
    params: { period: 50 },
    category: "trend",
  },
  {
    id: "ma100",
    name: "MA 100",
    description: "100-period moving average",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    enabled: false,
    params: { period: 100 },
    category: "trend",
  },
  {
    id: "ma200",
    name: "MA 200",
    description: "200-period moving average",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    enabled: false,
    params: { period: 200 },
    category: "trend",
  },
  {
    id: "rollingReturns",
    name: "Rolling Returns",
    description: "Rolling period returns",
    icon: <Activity className="w-3.5 h-3.5" />,
    enabled: false,
    params: { period: 21 },
    category: "momentum",
  },
  {
    id: "rollingVol",
    name: "Rolling Volatility",
    description: "Rolling annualized volatility",
    icon: <BarChart3 className="w-3.5 h-3.5" />,
    enabled: false,
    params: { period: 21 },
    category: "volatility",
  },
  {
    id: "drawdown",
    name: "Drawdown",
    description: "Underwater chart from peak",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    enabled: false,
    category: "risk",
  },
  {
    id: "cumulativeReturns",
    name: "Cumulative Returns",
    description: "Total return since inception",
    icon: <LineChart className="w-3.5 h-3.5" />,
    enabled: true,
    category: "momentum",
  },
  {
    id: "benchmarkRelative",
    name: "Benchmark Relative",
    description: "Performance relative to benchmark",
    icon: <Target className="w-3.5 h-3.5" />,
    enabled: false,
    category: "momentum",
  },
];

interface IndicatorOverlayProps {
  onIndicatorsChange: (indicators: Indicator[]) => void;
  className?: string;
}

export function IndicatorOverlay({ onIndicatorsChange, className }: IndicatorOverlayProps) {
  const [indicators, setIndicators] = useState<Indicator[]>(DEFAULT_INDICATORS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    const updated = indicators.map((ind) =>
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    );
    setIndicators(updated);
    onIndicatorsChange(updated);
  };

  const handleParamChange = (id: string, param: string, value: number) => {
    const updated = indicators.map((ind) =>
      ind.id === id
        ? { ...ind, params: { ...ind.params, [param]: value } }
        : ind
    );
    setIndicators(updated);
    onIndicatorsChange(updated);
  };

  const categories = [
    { id: "trend", label: "Trend" },
    { id: "volatility", label: "Volatility" },
    { id: "momentum", label: "Momentum" },
    { id: "risk", label: "Risk" },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {categories.map((cat) => {
        const catIndicators = indicators.filter((ind) => ind.category === cat.id);
        if (catIndicators.length === 0) return null;

        return (
          <div key={cat.id}>
            <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              {cat.label}
            </h4>
            <div className="space-y-1">
              {catIndicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className={cn(
                    "rounded-lg border border-border transition-colors",
                    indicator.enabled ? "bg-muted/30" : "bg-transparent"
                  )}
                >
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === indicator.id ? null : indicator.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{indicator.icon}</span>
                      <div>
                        <span className="text-xs font-medium">{indicator.name}</span>
                        {indicator.enabled && indicator.params && (
                          <span className="text-[10px] text-muted-foreground ml-1.5">
                            ({Object.values(indicator.params).join(", ")})
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={indicator.enabled}
                      onCheckedChange={() => handleToggle(indicator.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="scale-75"
                    />
                  </div>
                  
                  {expandedId === indicator.id && indicator.params && (
                    <div className="px-2 pb-2 pt-0 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-2 mt-2">
                        {indicator.description}
                      </p>
                      {Object.entries(indicator.params).map(([param, value]) => (
                        <div key={param} className="flex items-center gap-2">
                          <Label className="text-[10px] text-muted-foreground capitalize w-12">
                            {param}
                          </Label>
                          <Slider
                            value={[value]}
                            onValueChange={([v]) => handleParamChange(indicator.id, param, v)}
                            min={5}
                            max={250}
                            step={5}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-mono w-8 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
