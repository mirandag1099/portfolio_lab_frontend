import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  ChevronDown,
  Menu,
  X,
  BarChart3,
  Target,
  Shuffle,
  LineChart,
  PieChart,
} from "lucide-react";

const toolsMenu = [
  { name: "Portfolio Backtest", href: "/backtest", icon: LineChart },
  { name: "Monte Carlo Simulation", href: "/monte-carlo", icon: Shuffle },
  { name: "Factor Analysis (FF3)", href: "/factor-analysis", icon: BarChart3 },
  { name: "Portfolio Optimization", href: "/optimization", icon: Target },
  { name: "Benchmark Comparison", href: "/benchmark", icon: PieChart },
];

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-shadow duration-300">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground">
              PortfolioLab
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Dashboard
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  Tools
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-56">
                {toolsMenu.map((tool) => (
                  <DropdownMenuItem key={tool.href} asChild>
                    <Link
                      to={tool.href}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <tool.icon className="w-4 h-4 text-primary" />
                      {tool.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/portfolios"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/portfolios")
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              My Portfolios
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
            <Button variant="hero" size="sm">
              Get Started
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-slide-up">
            <div className="flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {toolsMenu.map((tool) => (
                <Link
                  key={tool.href}
                  to={tool.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <tool.icon className="w-4 h-4 text-primary" />
                  {tool.name}
                </Link>
              ))}
              <Link
                to="/portfolios"
                className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Portfolios
              </Link>
              <div className="flex gap-2 pt-4 border-t border-border/50 mt-2">
                <Button variant="outline" className="flex-1">
                  Sign In
                </Button>
                <Button variant="hero" className="flex-1">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
