import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  LineChart,
  Target,
  MoreVertical,
  Upload,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const savedPortfolios = [
  {
    id: 1,
    name: "My Retirement Portfolio",
    holdings: [
      { symbol: "VTI", allocation: 50 },
      { symbol: "VXUS", allocation: 25 },
      { symbol: "BND", allocation: 25 },
    ],
    value: 125000,
    returns: 12.4,
    lastUpdated: "2024-01-15",
  },
  {
    id: 2,
    name: "Growth Portfolio",
    holdings: [
      { symbol: "QQQ", allocation: 40 },
      { symbol: "VGT", allocation: 30 },
      { symbol: "ARKK", allocation: 20 },
      { symbol: "SOXX", allocation: 10 },
    ],
    value: 85000,
    returns: 24.8,
    lastUpdated: "2024-01-14",
  },
  {
    id: 3,
    name: "Dividend Income",
    holdings: [
      { symbol: "VYM", allocation: 35 },
      { symbol: "SCHD", allocation: 35 },
      { symbol: "JEPI", allocation: 30 },
    ],
    value: 200000,
    returns: 8.2,
    lastUpdated: "2024-01-10",
  },
];

const SavedPortfolios = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPortfolios = savedPortfolios.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Saved Portfolios"
      description="Manage and analyze your saved portfolios"
    >
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search portfolios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button variant="hero" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Portfolio
            </Button>
          </div>
        </div>

        {/* Portfolio Cards */}
        <div className="grid gap-4">
          {filteredPortfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="glass rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{portfolio.name}</h3>
                    <span
                      className={`text-sm font-medium ${
                        portfolio.returns >= 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {portfolio.returns >= 0 ? "+" : ""}
                      {portfolio.returns}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {portfolio.holdings.map((h, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-md bg-muted text-xs font-mono"
                      >
                        {h.symbol} {h.allocation}%
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Value: ${portfolio.value.toLocaleString()}</span>
                    <span>Updated: {portfolio.lastUpdated}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/backtest">
                      <LineChart className="w-4 h-4 mr-1" />
                      Backtest
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/optimization">
                      <Target className="w-4 h-4 mr-1" />
                      Optimize
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPortfolios.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No portfolios found</p>
            <Button variant="hero">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Portfolio
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedPortfolios;
