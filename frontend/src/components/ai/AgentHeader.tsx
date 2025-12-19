import { LucideIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  capabilities: string[];
  limitations: string[];
  lastUpdated?: string;
  className?: string;
}

const agentColors: Record<string, string> = {
  Analyst: "bg-blue-500/10 text-blue-500",
  Planner: "bg-purple-500/10 text-purple-500",
  Auditor: "bg-amber-500/10 text-amber-500",
  Coach: "bg-emerald-500/10 text-emerald-500",
};

export function AgentHeader({
  icon: Icon,
  title,
  description,
  capabilities,
  limitations,
  lastUpdated,
  className,
}: AgentHeaderProps) {
  return (
    <div className={cn("glass rounded-xl p-6", className)}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            agentColors[title] || "bg-primary/10 text-primary"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                  <Info className="w-4 h-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-[320px]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-1">This agent can:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {capabilities.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">This agent does NOT:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {limitations.map((l, i) => (
                        <li key={i}>• {l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/70 mt-2">
              Analysis based on data from {lastUpdated}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
