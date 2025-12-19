import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Download,
  Trash2,
  Eye,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const savedReports = [
  {
    id: 1,
    name: "Retirement Portfolio Backtest Q4 2024",
    type: "backtest",
    portfolio: "My Retirement Portfolio",
    createdAt: "2024-01-15",
    metrics: { cagr: "12.4%", sharpe: "1.2", maxDrawdown: "-15.2%" },
  },
  {
    id: 2,
    name: "Growth Portfolio Monte Carlo Analysis",
    type: "monte-carlo",
    portfolio: "Growth Portfolio",
    createdAt: "2024-01-14",
    metrics: { successRate: "85%", medianValue: "$245,000", worstCase: "$120,000" },
  },
  {
    id: 3,
    name: "Dividend Portfolio Factor Analysis",
    type: "factor-analysis",
    portfolio: "Dividend Income",
    createdAt: "2024-01-12",
    metrics: { marketBeta: "0.78", smb: "-0.12", hml: "0.45" },
  },
  {
    id: 4,
    name: "Portfolio Optimization Report",
    type: "optimization",
    portfolio: "My Retirement Portfolio",
    createdAt: "2024-01-10",
    metrics: { optimalSharpe: "1.45", suggestedChanges: "3" },
  },
];

const reportTypeConfig = {
  backtest: { icon: LineChart, color: "text-blue-500", label: "Backtest" },
  "monte-carlo": { icon: BarChart3, color: "text-purple-500", label: "Monte Carlo" },
  "factor-analysis": { icon: PieChart, color: "text-orange-500", label: "Factor Analysis" },
  optimization: { icon: Target, color: "text-green-500", label: "Optimization" },
};

const Reports = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = savedReports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.portfolio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Saved Reports"
      description="View and manage your saved analysis reports"
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Reports List */}
        <div className="grid gap-4">
          {filteredReports.map((report) => {
            const config = reportTypeConfig[report.type as keyof typeof reportTypeConfig];
            const Icon = config.icon;

            return (
              <div
                key={report.id}
                className="glass rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <h3 className="font-semibold">{report.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>Portfolio: {report.portfolio}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {report.createdAt}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(report.metrics).map(([key, value]) => (
                        <div key={key} className="px-3 py-1.5 rounded-lg bg-muted">
                          <span className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="text-sm font-medium ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reports found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run an analysis to generate your first report
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
