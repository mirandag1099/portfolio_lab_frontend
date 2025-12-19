import { TrendingUp, Shuffle, BarChart3, Target } from "lucide-react";

const tools = [
  {
    icon: TrendingUp,
    title: "Backtest Engine",
    description: "10+ years of historical data",
    visual: (
      <div className="h-32 flex items-end justify-between gap-1 px-4 pb-4">
        {[40, 55, 45, 60, 52, 70, 65, 80, 75, 90, 85, 95].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/20 rounded-t transition-all duration-300 hover:bg-primary/40"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    ),
  },
  {
    icon: Shuffle,
    title: "Monte Carlo",
    description: "10,000 simulation paths",
    visual: (
      <div className="h-32 relative overflow-hidden px-4 pb-4">
        <svg viewBox="0 0 200 80" className="w-full h-full">
          {/* Fan chart paths */}
          <path
            d="M0,60 Q50,55 100,40 T200,20"
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <path
            d="M0,55 Q50,50 100,45 T200,35"
            fill="none"
            stroke="hsl(var(--success))"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            d="M0,50 Q50,48 100,50 T200,45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          <path
            d="M0,45 Q50,52 100,55 T200,55"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <path
            d="M0,40 Q50,55 100,60 T200,65"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </svg>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: "Factor Analysis",
    description: "Fama-French 3-factor model",
    visual: (
      <div className="h-32 flex items-center justify-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-20 bg-primary/30 rounded-lg flex items-end justify-center pb-2">
            <span className="text-xs font-mono text-primary">0.92</span>
          </div>
          <span className="text-xs text-muted-foreground">MKT</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-14 bg-success/30 rounded-lg flex items-end justify-center pb-2">
            <span className="text-xs font-mono text-success">0.31</span>
          </div>
          <span className="text-xs text-muted-foreground">SMB</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-10 bg-warning/30 rounded-lg flex items-end justify-center pb-2">
            <span className="text-xs font-mono text-warning">-0.12</span>
          </div>
          <span className="text-xs text-muted-foreground">HML</span>
        </div>
      </div>
    ),
  },
  {
    icon: Target,
    title: "Efficient Frontier",
    description: "Optimize risk-adjusted returns",
    visual: (
      <div className="h-32 relative px-4 pb-4">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Axis */}
          <line x1="20" y1="80" x2="180" y2="80" stroke="hsl(var(--border))" strokeWidth="1" />
          <line x1="20" y1="80" x2="20" y2="10" stroke="hsl(var(--border))" strokeWidth="1" />
          
          {/* Efficient frontier curve */}
          <path
            d="M30,75 Q60,30 120,25 T175,35"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          
          {/* Scatter points */}
          <circle cx="45" cy="65" r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          <circle cx="60" cy="50" r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          <circle cx="80" cy="40" r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          <circle cx="100" cy="32" r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          <circle cx="130" cy="28" r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
          
          {/* Optimal point */}
          <circle cx="100" cy="28" r="5" fill="hsl(var(--success))" />
          <circle cx="100" cy="28" r="8" fill="none" stroke="hsl(var(--success))" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>
    ),
  },
];

const ToolPreviews = () => {
  return (
    <section className="py-20 lg:py-28 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Institutional-Grade <span className="gradient-text">Analytics</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            The same tools used by hedge funds and wealth managers, now accessible to everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, index) => (
            <div
              key={index}
              className="glass rounded-2xl overflow-hidden group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Visual preview */}
              <div className="bg-muted/30 border-b border-border/50">
                {tool.visual}
              </div>
              
              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <tool.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">{tool.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ToolPreviews;
