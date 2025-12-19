import { LucideIcon, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickQuestionProps {
  icon: LucideIcon;
  question: string;
  agentType: "analyst" | "planner" | "auditor" | "coach";
  url: string;
  className?: string;
}

const agentColors = {
  analyst: "border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5",
  planner: "border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/5",
  auditor: "border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/5",
  coach: "border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/5",
};

const agentIconColors = {
  analyst: "text-blue-500",
  planner: "text-purple-500",
  auditor: "text-amber-500",
  coach: "text-emerald-500",
};

export function QuickQuestion({
  icon: Icon,
  question,
  agentType,
  url,
  className,
}: QuickQuestionProps) {
  return (
    <Link
      to={url}
      className={cn(
        "group flex items-center gap-3 p-4 rounded-xl border bg-card/50 transition-all duration-200",
        agentColors[agentType],
        className
      )}
    >
      <Icon className={cn("w-5 h-5 shrink-0", agentIconColors[agentType])} />
      <span className="text-sm font-medium flex-1">{question}</span>
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
