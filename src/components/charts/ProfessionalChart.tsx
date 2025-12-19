import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { TimelineControl } from "./TimelineControl";
import { cn } from "@/lib/utils";

// Professional muted color palette
export const CHART_COLORS = {
  portfolio: "hsl(220 15% 35%)", // Muted dark blue-grey
  benchmark: "hsl(220 10% 55%)", // Lighter grey
  positive: "hsl(142 40% 40%)", // Muted green
  negative: "hsl(0 45% 45%)", // Muted red
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  reference: "hsl(var(--muted-foreground))",
};

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface ChartSeries {
  key: string;
  name: string;
  color: string;
  strokeWidth?: number;
  showArea?: boolean;
}

interface ProfessionalChartProps {
  data: DataPoint[];
  series: ChartSeries[];
  title?: string;
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  showTimeline?: boolean;
  showReferenceLine?: boolean;
  referenceValue?: number;
  height?: number;
  className?: string;
}

export function ProfessionalChart({
  data,
  series,
  title,
  yAxisFormatter = (v) => v.toLocaleString(),
  tooltipFormatter = (v) => v.toLocaleString(),
  showTimeline = true,
  showReferenceLine = false,
  referenceValue = 0,
  height = 280,
  className,
}: ProfessionalChartProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: data.length - 1 });

  const handleRangeChange = useCallback((start: number, end: number) => {
    setVisibleRange({ start, end });
  }, []);

  const visibleData = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end + 1);
  }, [data, visibleRange]);

  return (
    <div className={cn("", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <div className="flex items-center gap-4 text-[10px]">
            {series.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <div 
                  className="w-4 h-0.5" 
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={visibleData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={CHART_COLORS.grid}
              opacity={0.4}
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} 
              tickLine={false} 
              axisLine={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
              tickMargin={8}
            />
            <YAxis 
              tick={{ fill: CHART_COLORS.axis, fontSize: 9 }} 
              tickFormatter={yAxisFormatter}
              tickLine={false} 
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                fontSize: "11px",
                padding: "8px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, name: string) => [tooltipFormatter(value), name]}
              labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
            />
            {showReferenceLine && (
              <ReferenceLine 
                y={referenceValue} 
                stroke={CHART_COLORS.reference}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            )}
            {series.map((s) => (
              s.showArea ? (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth || 1.5}
                  fill={s.color}
                  fillOpacity={0.1}
                  name={s.name}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={s.strokeWidth || 1.5}
                  name={s.name}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {showTimeline && data.length > 1 && (
        <TimelineControl 
          data={data} 
          onRangeChange={handleRangeChange}
        />
      )}
    </div>
  );
}
