const logos = [
  { name: "Bloomberg", abbreviation: "Bloomberg" },
  { name: "Reuters", abbreviation: "Reuters" },
  { name: "Financial Times", abbreviation: "FT" },
  { name: "CNBC", abbreviation: "CNBC" },
  { name: "Forbes", abbreviation: "Forbes" },
  { name: "Wall Street Journal", abbreviation: "WSJ" },
  { name: "Barron's", abbreviation: "Barron's" },
  { name: "Morningstar", abbreviation: "Morningstar" },
];

const LogoBanner = () => {
  return (
    <section className="py-12 border-y border-border/50 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-8">
          Trusted by analysts at leading institutions
        </p>
      </div>
      
      {/* Scrolling logos */}
      <div className="relative">
        <div className="flex animate-scroll">
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="flex-shrink-0 px-8 md:px-12"
            >
              <span className="text-lg md:text-xl font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors whitespace-nowrap">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
        
        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </section>
  );
};

export default LogoBanner;
