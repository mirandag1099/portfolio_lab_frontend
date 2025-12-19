import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface InsightCardProps {
  title: string;
  summary: string;
  details?: ReactNode;
  metric?: {
    label: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  };
  severity?: "info" | "warning" | "critical" | "success";
  source?: string;
  assumptions?: string[];
  className?: string;
}

const severityStyles = {
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
  critical: "border-l-red-500",
  success: "border-l-emerald-500",
};

export function InsightCard({
  title,
  summary,
  details,
  metric,
  severity = "info",
  source,
  assumptions,
  className,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "glass rounded-lg border-l-4 p-4",
        severityStyles[severity],
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{summary}</p>
        </div>
        {metric && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="text-lg font-semibold font-mono">{metric.value}</p>
            {metric.change && (
              <p
                className={cn(
                  "text-xs font-mono",
                  metric.isPositive ? "text-success" : "text-destructive"
                )}
              >
                {metric.change}
              </p>
            )}
          </div>
        )}
      </div>

      {(details || assumptions || source) && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              Show details
            </>
          )}
        </button>
      )}

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
          {details && <div className="text-sm text-muted-foreground">{details}</div>}
          
          {assumptions && assumptions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Assumptions:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {assumptions.map((assumption, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {source && (
            <p className="text-xs text-muted-foreground/70">
              Data source: {source}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
