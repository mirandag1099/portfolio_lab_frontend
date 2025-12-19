import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Upload,
  Download,
  MoreVertical,
  Folder,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const samplePortfolios = [
  {
    id: 1,
    name: "Retirement 401k",
    value: 285400,
    return: 18.4,
    holdings: 8,
    lastUpdated: "2 hours ago",
  },
  {
    id: 2,
    name: "Growth Portfolio",
    value: 124800,
    return: 24.2,
    holdings: 5,
    lastUpdated: "1 day ago",
  },
  {
    id: 3,
    name: "Dividend Income",
    value: 78500,
    return: 12.1,
    holdings: 12,
    lastUpdated: "3 days ago",
  },
  {
    id: 4,
    name: "International Mix",
    value: 45200,
    return: -2.3,
    holdings: 6,
    lastUpdated: "1 week ago",
  },
];

const Portfolios = () => {
  const [portfolios, setPortfolios] = useState(samplePortfolios);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">My Portfolios</h1>
            <p className="text-muted-foreground">
              Manage and analyze your investment portfolios
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <Plus className="w-4 h-4" />
                  New Portfolio
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Portfolio</DialogTitle>
                  <DialogDescription>
                    Start a new portfolio to track your investments.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="name">Portfolio Name</Label>
                    <Input id="name" placeholder="e.g., Retirement 401k" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description..."
                      className="mt-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" onClick={() => setIsCreateOpen(false)}>
                    Create Portfolio
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Portfolio Grid */}
        {portfolios.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <div
                key={portfolio.id}
                className="glass rounded-xl p-6 card-hover cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{portfolio.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {portfolio.holdings} holdings
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold">
                      ${portfolio.value.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {portfolio.return >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-primary" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          portfolio.return >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {portfolio.return >= 0 ? "+" : ""}
                        {portfolio.return}% YTD
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Updated {portfolio.lastUpdated}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Card */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="glass rounded-xl p-6 border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center min-h-[200px] group"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Create New Portfolio
              </p>
            </button>
          </div>
        ) : (
          /* Empty State */
          <div className="glass rounded-xl p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Portfolios Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first portfolio to start tracking and analyzing your investments.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline">
                <Upload className="w-4 h-4" />
                Import CSV
              </Button>
              <Button variant="hero" onClick={() => setIsCreateOpen(true)}>
                <Plus className="w-4 h-4" />
                New Portfolio
              </Button>
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-12 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Tips</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-1">Import from CSV</h3>
              <p className="text-sm text-muted-foreground">
                Upload a CSV file with your holdings. Format: Symbol, Shares, Cost Basis.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Brokerage Sync</h3>
              <p className="text-sm text-muted-foreground">
                Connect your brokerage account for automatic portfolio updates (coming soon).
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Multiple Portfolios</h3>
              <p className="text-sm text-muted-foreground">
                Track different accounts separately: 401k, IRA, taxable brokerage, etc.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Portfolios;
