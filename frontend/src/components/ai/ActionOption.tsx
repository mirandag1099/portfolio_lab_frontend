import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionOptionProps {
  title: string;
  description: string;
  impact: {
    label: string;
    value: string;
    direction?: "positive" | "negative" | "neutral";
  }[];
  constraints?: string[];
  consequences?: string[];
  reversible?: boolean;
  complexity?: "low" | "medium" | "high";
  onSelect?: () => void;
  className?: string;
}

const complexityLabels = {
  low: { label: "Simple", color: "text-success bg-success/10" },
  medium: { label: "Moderate", color: "text-warning bg-warning/10" },
  high: { label: "Complex", color: "text-destructive bg-destructive/10" },
};

export function ActionOption({
  title,
  description,
  impact,
  constraints,
  consequences,
  reversible = true,
  complexity = "low",
  onSelect,
  className,
}: ActionOptionProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-5 space-y-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-foreground">{title}</h4>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                complexityLabels[complexity].color
              )}
            >
              {complexityLabels[complexity].label}
            </span>
            {!reversible && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Irreversible
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">This action cannot be undone</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Impact metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {impact.map((item, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
            <p
              className={cn(
                "text-sm font-semibold font-mono",
                item.direction === "positive" && "text-success",
                item.direction === "negative" && "text-destructive"
              )}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Constraints and consequences */}
      {(constraints || consequences) && (
        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
          {constraints && constraints.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Constraints
                </span>
              </div>
              <ul className="space-y-1">
                {constraints.map((c, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {consequences && consequences.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Considerations
                </span>
              </div>
              <ul className="space-y-1">
                {consequences.map((c, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-muted-foreground/50">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={onSelect}>
          Review Details
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
