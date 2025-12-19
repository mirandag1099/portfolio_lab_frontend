import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">PortfolioLab</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Professional portfolio analysis tools for smarter investing.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="font-semibold mb-4">Tools</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/backtest" className="hover:text-foreground transition-colors">
                  Portfolio Backtest
                </Link>
              </li>
              <li>
                <Link to="/monte-carlo" className="hover:text-foreground transition-colors">
                  Monte Carlo Simulation
                </Link>
              </li>
              <li>
                <Link to="/factor-analysis" className="hover:text-foreground transition-colors">
                  Factor Analysis
                </Link>
              </li>
              <li>
                <Link to="/optimization" className="hover:text-foreground transition-colors">
                  Portfolio Optimization
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/api" className="hover:text-foreground transition-colors">
                  API
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PortfolioLab. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Data provided for informational purposes only. Not investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
