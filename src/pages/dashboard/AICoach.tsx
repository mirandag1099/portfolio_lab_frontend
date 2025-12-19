import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentHeader } from "@/components/ai/AgentHeader";
import { ActionOption } from "@/components/ai/ActionOption";
import { Compass, ArrowRight, Clock, Bookmark, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const actionOptions = [
  {
    title: "Reduce technology concentration",
    description:
      "Sell a portion of QQQ and reallocate to international equities (VXUS) or value stocks (VTV).",
    impact: [
      { label: "Tech Exposure", value: "42% → 30%", direction: "positive" as const },
      { label: "Correlation", value: "0.87 → 0.72", direction: "positive" as const },
      { label: "Expected Return", value: "-0.3% annual", direction: "negative" as const },
      { label: "Volatility", value: "-12%", direction: "positive" as const },
    ],
    constraints: [
      "May trigger short-term capital gains if held <1 year",
      "Reduces exposure to high-growth sector",
    ],
    consequences: [
      "Potential underperformance if tech continues leading",
      "Transaction costs for rebalancing",
    ],
    complexity: "medium" as const,
    reversible: true,
  },
  {
    title: "Execute tax-loss harvest on ARKK",
    description:
      "Sell ARKK position at a loss and immediately purchase QQQJ for similar innovation exposure.",
    impact: [
      { label: "Tax Savings", value: "~$2,400", direction: "positive" as const },
      { label: "Expense Ratio", value: "0.75% → 0.15%", direction: "positive" as const },
      { label: "Annual Fee Savings", value: "$37/yr", direction: "positive" as const },
      { label: "Tracking Diff", value: "Moderate", direction: "neutral" as const },
    ],
    constraints: [
      "Wash sale rule: cannot repurchase ARKK for 30 days",
      "QQQJ has different holdings than ARKK",
    ],
    consequences: [
      "Different exposure profile during transition period",
      "Need to track cost basis for new position",
    ],
    complexity: "low" as const,
    reversible: false,
  },
  {
    title: "Add international diversification",
    description:
      "Increase VXUS allocation from 15% to 25% to improve geographic and currency diversification.",
    impact: [
      { label: "Non-USD Exposure", value: "15% → 25%", direction: "positive" as const },
      { label: "Diversification", value: "Improved", direction: "positive" as const },
      { label: "Expected Return", value: "Neutral", direction: "neutral" as const },
      { label: "Complexity", value: "Minimal", direction: "positive" as const },
    ],
    constraints: [
      "Requires selling other positions to fund",
      "May increase portfolio complexity",
    ],
    consequences: [
      "Currency risk becomes more significant",
      "Different tax treatment for foreign dividends",
    ],
    complexity: "low" as const,
    reversible: true,
  },
  {
    title: "Defer action and monitor",
    description:
      "Take no immediate action. Set calendar reminder to reassess in 30 days.",
    impact: [
      { label: "Immediate Cost", value: "$0", direction: "positive" as const },
      { label: "Tax Impact", value: "None", direction: "neutral" as const },
      { label: "Risk Status", value: "Unchanged", direction: "neutral" as const },
      { label: "Opportunity Cost", value: "Possible", direction: "negative" as const },
    ],
    constraints: [
      "Risks may compound if market conditions change",
      "Tax-loss opportunity may expire",
    ],
    consequences: [
      "Concentration risk remains elevated",
      "May miss optimal harvest window",
    ],
    complexity: "low" as const,
    reversible: true,
  },
];

const savedActions = [
  { title: "Quarterly rebalance", date: "Due Jan 15, 2025", status: "pending" },
  { title: "Review bond allocation", date: "Completed Dec 1", status: "done" },
];

const AICoach = () => {
  const [savedItems, setSavedItems] = useState<number[]>([]);

  const toggleSave = (idx: number) => {
    setSavedItems((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <DashboardLayout
      title="Coach"
      description="Action options and implementation guidance"
    >
      <div className="space-y-6">
        {/* Agent Header */}
        <AgentHeader
          icon={Compass}
          title="Coach"
          description="Translates insights into bounded action options. Presents choices with expected impacts, constraints, and consequences without urgency or 'best choice' language."
          capabilities={[
            "Present ranked action options based on findings",
            "Show expected impact of each option",
            "Explain constraints and consequences",
            "Track deferred actions and reminders",
          ]}
          limitations={[
            "Tell you what to do",
            "Execute trades or changes",
            "Provide personalized financial advice",
            "Guarantee outcomes of any action",
          ]}
          lastUpdated="Based on Auditor findings from December 13, 2024"
        />

        {/* Context Banner */}
        <div className="glass rounded-xl p-4 border-l-4 border-l-primary">
          <p className="text-sm">
            <span className="font-medium">Context:</span> These options address the{" "}
            <Link to="/dashboard/ai/auditor" className="text-primary hover:underline">
              5 findings from the Auditor
            </Link>
            , prioritized by potential impact. All options are reversible unless noted.
          </p>
        </div>

        {/* Saved Actions */}
        {savedActions.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Tracked Actions</h2>
            <div className="space-y-2">
              {savedActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {action.status === "done" ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">{action.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{action.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Options */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Available Options</h2>
            <p className="text-sm text-muted-foreground">
              {actionOptions.length} options • Ordered by potential impact
            </p>
          </div>
          <div className="space-y-4">
            {actionOptions.map((option, idx) => (
              <div key={idx} className="relative">
                <button
                  onClick={() => toggleSave(idx)}
                  className={cn(
                    "absolute top-4 right-4 z-10 p-2 rounded-lg transition-colors",
                    savedItems.includes(idx)
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Bookmark
                    className={cn("w-4 h-4", savedItems.includes(idx) && "fill-current")}
                  />
                </button>
                <ActionOption
                  title={option.title}
                  description={option.description}
                  impact={option.impact}
                  constraints={option.constraints}
                  consequences={option.consequences}
                  complexity={option.complexity}
                  reversible={option.reversible}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Decision Framework */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Decision Framework</h2>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="font-medium text-foreground mb-2">If optimizing for taxes</p>
                <p>Consider the tax-loss harvest option before year-end to offset gains.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="font-medium text-foreground mb-2">If reducing risk</p>
                <p>Prioritize reducing tech concentration and improving correlation.</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="font-medium text-foreground mb-2">If uncertain</p>
                <p>Defer action is always available. Review again when you have clarity.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70">
              These are considerations, not recommendations. Your specific situation, tax
              bracket, and goals should inform your decision. Consult a qualified professional
              for personalized guidance.
            </p>
          </div>
        </div>

        {/* Implementation Notes */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Implementation Notes</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Any trades should be executed through your brokerage account</p>
            <p>• Consider using limit orders during volatile markets</p>
            <p>• Document your rationale for future reference</p>
            <p>• Set calendar reminders for follow-up reviews</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/dashboard/ai" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to AI Hub
          </Link>
          <Button variant="outline" asChild>
            <Link to="/dashboard/optimization">
              Run Portfolio Optimization
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AICoach;
