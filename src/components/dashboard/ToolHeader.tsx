import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolHeaderProps {
  title: string;
  description: string;
  bestPractice?: string;
  helpUrl?: string;
}

export function ToolHeader({ title, description, bestPractice, helpUrl }: ToolHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {bestPractice && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm">
                <Info className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Best Practices</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[320px]">
              <p className="font-medium mb-1">Best Practice</p>
              <p className="text-xs text-muted-foreground">{bestPractice}</p>
              {helpUrl && (
                <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 block">
                  Learn more →
                </a>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface QuickTipProps {
  title: string;
  description: string;
  className?: string;
}

export function QuickTip({ title, description, className }: QuickTipProps) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10 ${className}`}>
      <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
