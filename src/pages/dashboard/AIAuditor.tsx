import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AgentHeader } from "@/components/ai/AgentHeader";
import { InsightCard } from "@/components/ai/InsightCard";
import { Shield, ArrowRight, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const riskFindings = [
  {
    id: 1,
    severity: "critical",
    category: "Concentration",
    title: "Sector concentration exceeds threshold",
    summary: "Technology sector represents 42% of portfolio, above the 30% recommended maximum.",
    metric: { label: "Tech Exposure", value: "42%", threshold: "30%" },
    affected: ["VTI (partial)", "QQQ", "ARKK"],
    recommendation: "Consider reducing technology exposure by 10-15 percentage points",
  },
  {
    id: 2,
    severity: "critical",
    category: "Correlation",
    title: "High correlation among top holdings",
    summary: "Top 3 holdings have >0.85 correlation, reducing effective diversification.",
    metric: { label: "Avg Correlation", value: "0.87", threshold: "<0.70" },
    affected: ["VTI", "QQQ", "ARKK"],
    recommendation: "Add uncorrelated assets like bonds, commodities, or international equities",
  },
  {
    id: 3,
    severity: "warning",
    category: "Efficiency",
    title: "Tax-loss harvesting opportunity",
    summary: "ARKK position is down 15% from cost basis with potential to realize losses.",
    metric: { label: "Unrealized Loss", value: "-$1,245", threshold: "N/A" },
    affected: ["ARKK"],
    recommendation: "Consider swapping to similar ETF (e.g., QQQJ) to maintain exposure while harvesting loss",
  },
  {
    id: 4,
    severity: "warning",
    category: "Fee Drag",
    title: "Elevated expense ratio on ARKK",
    summary: "ARKK has 0.75% expense ratio vs 0.03% average for passive alternatives.",
    metric: { label: "Expense Ratio", value: "0.75%", threshold: "<0.20%" },
    affected: ["ARKK"],
    recommendation: "Evaluate if active management justifies 72bps additional annual cost",
  },
  {
    id: 5,
    severity: "info",
    category: "Currency",
    title: "Limited international diversification",
    summary: "Only 15% of portfolio is exposed to non-USD currencies.",
    metric: { label: "Non-USD", value: "15%", threshold: "20-30%" },
    affected: ["VXUS"],
    recommendation: "Consider increasing international allocation for currency diversification",
  },
];

const portfolioHealthChecks = [
  { name: "Asset allocation documented", passed: true },
  { name: "Rebalancing schedule set", passed: true },
  { name: "Emergency fund separate", passed: true },
  { name: "Beneficiaries updated", passed: false },
  { name: "Tax-advantaged accounts maximized", passed: true },
  { name: "Concentration limits respected", passed: false },
];

const AIAuditor = () => {
  const criticalCount = riskFindings.filter((f) => f.severity === "critical").length;
  const warningCount = riskFindings.filter((f) => f.severity === "warning").length;
  const infoCount = riskFindings.filter((f) => f.severity === "info").length;

  const healthScore = Math.round(
    (portfolioHealthChecks.filter((c) => c.passed).length / portfolioHealthChecks.length) * 100
  );

  return (
    <DashboardLayout
      title="Auditor"
      description="Risk detection and efficiency analysis"
    >
      <div className="space-y-6">
        {/* Agent Header */}
        <AgentHeader
          icon={Shield}
          title="Auditor"
          description="Surfaces hidden risks, concentration issues, fee drag, and other silent problems. Uses cold, mechanical analysis."
          capabilities={[
            "Detect concentration and correlation risks",
            "Identify tax optimization opportunities",
            "Flag fee inefficiencies",
            "Check portfolio against best practices",
          ]}
          limitations={[
            "Access your actual tax situation",
            "Know your complete financial picture",
            "Provide tax or legal advice",
            "Guarantee risk detection is complete",
          ]}
          lastUpdated="December 13, 2024, 2:00 PM EST"
        />

        {/* Risk Summary */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Critical</span>
            </div>
            <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Warnings</span>
            </div>
            <p className="text-3xl font-bold text-amber-500">{warningCount}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Info</span>
            </div>
            <p className="text-3xl font-bold text-blue-500">{infoCount}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-muted-foreground">Health Score</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{healthScore}%</p>
          </div>
        </div>

        {/* Findings List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Risk Findings</h2>
          <div className="space-y-4">
            {riskFindings.map((finding) => (
              <div
                key={finding.id}
                className={cn(
                  "glass rounded-xl p-5 border-l-4",
                  finding.severity === "critical" && "border-l-red-500",
                  finding.severity === "warning" && "border-l-amber-500",
                  finding.severity === "info" && "border-l-blue-500"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          finding.severity === "critical" && "bg-red-500/20 text-red-500",
                          finding.severity === "warning" && "bg-amber-500/20 text-amber-500",
                          finding.severity === "info" && "bg-blue-500/20 text-blue-500"
                        )}
                      >
                        {finding.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">{finding.category}</span>
                    </div>
                    <h3 className="font-medium mb-1">{finding.title}</h3>
                    <p className="text-sm text-muted-foreground">{finding.summary}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{finding.metric.label}</p>
                    <p className="text-lg font-semibold font-mono">{finding.metric.value}</p>
                    <p className="text-xs text-muted-foreground">
                      Target: {finding.metric.threshold}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Affected Holdings:</p>
                      <div className="flex flex-wrap gap-1">
                        {finding.affected.map((h) => (
                          <span
                            key={h}
                            className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard/ai/coach">
                        View Options <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 p-2 rounded bg-muted/30">
                    <span className="font-medium">Consideration:</span> {finding.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Checklist */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Portfolio Health Checklist</h2>
            <span className="text-sm text-muted-foreground">
              {portfolioHealthChecks.filter((c) => c.passed).length}/{portfolioHealthChecks.length}{" "}
              passed
            </span>
          </div>
          <Progress value={healthScore} className="h-2 mb-4" />
          <div className="grid md:grid-cols-2 gap-3">
            {portfolioHealthChecks.map((check, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                {check.passed ? (
                  <CheckCircle className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    check.passed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {check.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Audit Methodology</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              This audit analyzes your portfolio against established risk management
              principles and identifies potential issues that may not be immediately visible.
            </p>
            <p>
              Thresholds are based on general portfolio management guidelines and may not
              apply to all investment strategies. Individual circumstances vary.
            </p>
            <p className="text-xs text-muted-foreground/70">
              This is not financial advice. Consult a qualified professional for personalized guidance.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Link to="/dashboard/ai" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to AI Hub
          </Link>
          <Button variant="outline" asChild>
            <Link to="/dashboard/ai/coach">
              Review action options with Coach
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAuditor;
