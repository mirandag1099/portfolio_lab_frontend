import { LucideIcon, ChevronRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  purpose: string;
  status?: "available" | "analyzing" | "complete";
  findings?: number;
  url: string;
  className?: string;
}

export function AgentCard({
  icon: Icon,
  title,
  description,
  purpose,
  status = "available",
  findings,
  url,
  className,
}: AgentCardProps) {
  const statusColors = {
    available: "bg-muted/50 text-muted-foreground",
    analyzing: "bg-warning/20 text-warning",
    complete: "bg-success/20 text-success",
  };

  const statusText = {
    available: "Ready",
    analyzing: "Analyzing...",
    complete: "Complete",
  };

  return (
    <Link
      to={url}
      className={cn(
        "group glass rounded-xl p-5 flex flex-col gap-4 transition-all duration-200 hover:border-primary/40",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <Info className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[240px]">
            <p className="text-xs">{purpose}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{purpose}</p>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", statusColors[status])}>
            {statusText[status]}
          </span>
          {findings !== undefined && findings > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {findings} finding{findings !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}
