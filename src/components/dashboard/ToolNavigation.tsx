import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, LineChart, Target, PieChart, BarChart3, Activity,
  ArrowRight, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tools = [
  { 
    id: "results", 
    title: "Overview", 
    url: "/dashboard/results", 
    icon: LayoutDashboard,
    description: "Complete portfolio analysis with all key metrics",
    bestFor: "Getting a comprehensive view of your portfolio performance"
  },
  { 
    id: "backtest", 
    title: "Backtest", 
    url: "/dashboard/backtest", 
    icon: LineChart,
    description: "Test portfolio against historical market data",
    bestFor: "Seeing how your strategy would have performed historically"
  },
  { 
    id: "optimization", 
    title: "Optimization", 
    url: "/dashboard/optimization", 
    icon: Target,
    description: "Find optimal allocations on the efficient frontier",
    bestFor: "Improving your risk-adjusted returns"
  },
  { 
    id: "factor-analysis", 
    title: "Factor Analysis", 
    url: "/dashboard/factor-analysis", 
    icon: PieChart,
    description: "Decompose returns using Fama-French factors",
    bestFor: "Understanding what's driving your portfolio returns"
  },
  { 
    id: "monte-carlo", 
    title: "Monte Carlo", 
    url: "/dashboard/monte-carlo", 
    icon: BarChart3,
    description: "Simulate thousands of possible future outcomes",
    bestFor: "Planning for retirement or long-term goals"
  },
  { 
    id: "benchmark", 
    title: "Benchmark", 
    url: "/dashboard/benchmark", 
    icon: Activity,
    description: "Compare against major indices and strategies",
    bestFor: "Evaluating your strategy against alternatives"
  },
];

interface ToolNavigationProps {
  className?: string;
  showLabels?: boolean;
}

export function ToolNavigation({ className, showLabels = true }: ToolNavigationProps) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const currentTool = tools.find(t => t.url === currentPath);
  const currentIndex = tools.findIndex(t => t.url === currentPath);
  const nextTool = currentIndex >= 0 && currentIndex < tools.length - 1 ? tools[currentIndex + 1] : null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumb-style navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <TooltipProvider delayDuration={200}>
          {tools.map((tool, idx) => {
            const isActive = currentPath === tool.url;
            const isPast = currentIndex > idx;
            
            return (
              <div key={tool.id} className="flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={tool.url}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : isPast
                            ? "bg-success/10 text-success hover:bg-success/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <tool.icon className="w-4 h-4" />
                      {showLabels && <span className="hidden sm:inline">{tool.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[240px]">
                    <p className="font-medium">{tool.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                    <p className="text-xs text-primary mt-1">Best for: {tool.bestFor}</p>
                  </TooltipContent>
                </Tooltip>
                {idx < tools.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Next step suggestion */}
      {nextTool && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              Next step: <Link to={nextTool.url} className="text-primary hover:underline font-medium">{nextTool.title}</Link>
            </p>
            <p className="text-xs text-muted-foreground/70">{nextTool.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolSuggestionProps {
  tool: "backtest" | "optimization" | "factor-analysis" | "monte-carlo" | "benchmark";
  context?: string;
  className?: string;
}

export function ToolSuggestion({ tool, context, className }: ToolSuggestionProps) {
  const toolData = tools.find(t => t.id === tool);
  if (!toolData) return null;

  return (
    <Link 
      to={toolData.url}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group",
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <toolData.icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{context || `Continue to ${toolData.title}`}</p>
        <p className="text-xs text-muted-foreground">{toolData.description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}
