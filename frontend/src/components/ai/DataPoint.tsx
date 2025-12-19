import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataPointProps {
  label: string;
  value: string | number;
  subValue?: string;
  tooltip?: string;
  trend?: "up" | "down" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DataPoint({
  label,
  value,
  subValue,
  tooltip,
  trend,
  size = "md",
  className,
}: DataPointProps) {
  const sizeStyles = {
    sm: { label: "text-xs", value: "text-lg", sub: "text-xs" },
    md: { label: "text-xs", value: "text-2xl", sub: "text-sm" },
    lg: { label: "text-sm", value: "text-3xl", sub: "text-sm" },
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-foreground",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        <span className={cn("text-muted-foreground", sizeStyles[size].label)}>
          {label}
        </span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p
        className={cn(
          "font-semibold font-mono",
          sizeStyles[size].value,
          trend ? trendColors[trend] : "text-foreground"
        )}
      >
        {value}
      </p>
      {subValue && (
        <p className={cn("text-muted-foreground", sizeStyles[size].sub)}>
          {subValue}
        </p>
      )}
    </div>
  );
}
