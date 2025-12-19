import {
  LineChart,
  Shuffle,
  BarChart3,
  Target,
  Upload,
  Download,
  Shield,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: LineChart,
    title: "Portfolio Backtest",
    description:
      "Test your portfolio against historical data to see how it would have performed over time.",
    href: "/backtest",
  },
  {
    icon: Shuffle,
    title: "Monte Carlo Simulation",
    description:
      "Run thousands of simulations to understand the range of possible outcomes for your portfolio.",
    href: "/monte-carlo",
  },
  {
    icon: BarChart3,
    title: "Factor Analysis (FF3)",
    description:
      "Analyze your portfolio exposure to market, size, and value factors using Fama-French models.",
    href: "/factor-analysis",
  },
  {
    icon: Target,
    title: "Portfolio Optimization",
    description:
      "Find the optimal asset allocation based on your risk tolerance and expected returns.",
    href: "/optimization",
  },
  {
    icon: Upload,
    title: "Easy Upload",
    description:
      "Import your portfolio from CSV, Excel, or connect directly to your brokerage account.",
    href: "/portfolios",
  },
  {
    icon: Download,
    title: "Export & Share",
    description:
      "Download detailed reports in PDF or Excel format. Share analysis with your team.",
    href: "/portfolios",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to{" "}
            <span className="gradient-text">Analyze</span> Your Portfolio
          </h2>
          <p className="text-muted-foreground text-lg">
            Professional-grade tools that were once only available to
            institutions, now accessible to everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link
              key={feature.title}
              to={feature.href}
              className="group glass rounded-xl p-6 card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-20 pt-12 border-t border-border">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Bank-Level Security</h4>
                <p className="text-sm text-muted-foreground">
                  256-bit encryption for all your data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Lightning Fast</h4>
                <p className="text-sm text-muted-foreground">
                  Real-time calculations powered by modern tech
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Easy Data Import</h4>
                <p className="text-sm text-muted-foreground">
                  CSV, Excel, or brokerage integration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
