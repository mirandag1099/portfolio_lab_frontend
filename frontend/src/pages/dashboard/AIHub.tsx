import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentCard } from "@/components/ai/AgentCard";
import { QuickQuestion } from "@/components/ai/QuickQuestion";
import { DataPoint } from "@/components/ai/DataPoint";
import {
  BarChart3,
  Target,
  Shield,
  Compass,
  TrendingDown,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";

const agents = [
  {
    icon: BarChart3,
    title: "Analyst",
    description: "Explains what happened and why",
    purpose:
      "Provides performance attribution, benchmark-relative explanations, and factor contributions. Presents factual analysis without recommendations.",
    url: "/dashboard/ai/analyst",
    status: "complete" as const,
    findings: 3,
  },
  {
    icon: Target,
    title: "Planner",
    description: "Explores future scenarios and goals",
    purpose:
      "Helps define financial goals, explore scenario projections, and understand probability-based outcomes. Does not make guarantees.",
    url: "/dashboard/ai/planner",
    status: "available" as const,
  },
  {
    icon: Shield,
    title: "Auditor",
    description: "Detects hidden risks and inefficiencies",
    purpose:
      "Surfaces concentration risks, fee drag, correlation blind spots, and other silent problems. Uses a cold, mechanical analysis approach.",
    url: "/dashboard/ai/auditor",
    status: "complete" as const,
    findings: 5,
  },
  {
    icon: Compass,
    title: "Coach",
    description: "Translates insights into bounded actions",
    purpose:
      "Presents ranked action options with expected impacts, constraints, and consequences. Emphasizes user control without urgency or 'best choice' language.",
    url: "/dashboard/ai/coach",
    status: "available" as const,
  },
];

const quickQuestions = [
  {
    icon: TrendingDown,
    question: "Why did my portfolio drop this week?",
    agentType: "analyst" as const,
    url: "/dashboard/ai/analyst?q=performance-drop",
  },
  {
    icon: Target,
    question: "Am I on track for my retirement goal?",
    agentType: "planner" as const,
    url: "/dashboard/ai/planner?q=retirement-track",
  },
  {
    icon: AlertTriangle,
    question: "Are there hidden risks in my portfolio?",
    agentType: "auditor" as const,
    url: "/dashboard/ai/auditor?q=hidden-risks",
  },
  {
    icon: HelpCircle,
    question: "What should I consider doing next?",
    agentType: "coach" as const,
    url: "/dashboard/ai/coach?q=next-actions",
  },
];

const AIHub = () => {
  return (
    <DashboardLayout
      title="AI Assistant"
      description="Intelligent tools to understand, plan, audit, and act on your portfolio"
    >
      <div className="space-y-8">
        {/* Portfolio Status Summary */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Portfolio Status</h2>
              <p className="text-sm text-muted-foreground">
                My Retirement Portfolio • Last analyzed 2 hours ago
              </p>
            </div>
            <Link
              to="/dashboard/results"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View Full Analysis <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <DataPoint
              label="Total Value"
              value="$124,580"
              subValue="+$8,420 all-time"
              tooltip="Current market value of all holdings"
              trend="up"
            />
            <DataPoint
              label="YTD Return"
              value="+12.4%"
              subValue="vs SPY +14.2%"
              tooltip="Year-to-date performance"
              trend="up"
            />
            <DataPoint
              label="Risk Level"
              value="Moderate"
              subValue="6.5/10 score"
              tooltip="Based on volatility and concentration"
            />
            <DataPoint
              label="Active Issues"
              value="5"
              subValue="2 high priority"
              tooltip="Items flagged by the Auditor"
              trend="neutral"
            />
            <DataPoint
              label="Goal Progress"
              value="68%"
              subValue="On track"
              tooltip="Progress toward your defined goals"
              trend="up"
            />
          </div>
        </div>

        {/* Quick Questions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Common Questions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {quickQuestions.map((q, idx) => (
              <QuickQuestion
                key={idx}
                icon={q.icon}
                question={q.question}
                agentType={q.agentType}
                url={q.url}
              />
            ))}
          </div>
        </div>

        {/* Agent Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Specialized Tools</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {agents.map((agent, idx) => (
              <AgentCard
                key={idx}
                icon={agent.icon}
                title={agent.title}
                description={agent.description}
                purpose={agent.purpose}
                url={agent.url}
                status={agent.status}
                findings={agent.findings}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Analysis</h2>
          <div className="space-y-3">
            {[
              {
                agent: "Auditor",
                finding: "Concentration risk detected in tech sector (42% exposure)",
                time: "2 hours ago",
                severity: "warning",
              },
              {
                agent: "Analyst",
                finding: "Weekly performance: -1.2% primarily due to semiconductor pullback",
                time: "2 hours ago",
                severity: "info",
              },
              {
                agent: "Auditor",
                finding: "Tax-loss harvesting opportunity identified in ARKK position",
                time: "1 day ago",
                severity: "info",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.finding}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.agent} • {item.time}
                  </p>
                </div>
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
            AI analysis is based on historical data and statistical models. Results are not
            financial advice and do not guarantee future performance. All decisions remain
            yours to make.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIHub;
