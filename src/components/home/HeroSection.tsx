import { useState, useRef, useCallback, useMemo } from "react";
import { Upload, ArrowRight, FileSpreadsheet, X, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Holding {
  ticker: string;
  weight: number;
}

const HeroSection = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedWindowLabel, setSelectedWindowLabel] = useState<"1Y" | "3Y" | "5Y" | "10Y" | "CUSTOM" | null>(null);
  const [customDay, setCustomDay] = useState<number | null>(null);
  const [customMonth, setCustomMonth] = useState<number | null>(null);
  const [customYear, setCustomYear] = useState<number | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processCSV = (file: File) => {
    setIsProcessing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedHoldings: Holding[] = [];
        
        results.data.forEach((row: any) => {
          const ticker = row.Ticker || row.ticker || row.Symbol || row.symbol || "";
          const weight = parseFloat(row.Weight || row.weight || row.Allocation || row.allocation || "0");
          
          if (ticker && !isNaN(weight)) {
            parsedHoldings.push({ ticker: ticker.toUpperCase(), weight });
          }
        });

        if (parsedHoldings.length === 0) {
          toast({
            title: "Invalid CSV format",
            description: "Please ensure your CSV has 'Ticker' and 'Weight' columns.",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        setHoldings(parsedHoldings);
        setUploadedFile(file);
        setIsProcessing(false);
        toast({
          title: "Portfolio loaded",
          description: `${parsedHoldings.length} holdings imported successfully.`,
        });
      },
      error: () => {
        toast({
          title: "Error reading file",
          description: "Please check the file format and try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      processCSV(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  // Get valid days for the selected month/year (accounts for leap years and month lengths)
  const validDays = useMemo(() => {
    if (!customMonth || !customYear) return [];
    const daysInMonth = new Date(customYear, customMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [customMonth, customYear]);

  // Calculate requested_start_date based on selection
  const requestedStartDate = useMemo(() => {
    if (!selectedWindowLabel) return null;

    const today = new Date();
    let startDate: Date;

    if (selectedWindowLabel === "CUSTOM") {
      if (!customDay || !customMonth || !customYear) return null;
      // Use the full date with day, month, and year
      startDate = new Date(customYear, customMonth - 1, customDay);
      
      // Validate the date is valid (handles invalid dates like Feb 30)
      if (startDate.getDate() !== customDay || 
          startDate.getMonth() !== customMonth - 1 || 
          startDate.getFullYear() !== customYear) {
        return null;
      }
    } else {
      // Calculate based on preset
      const years = parseInt(selectedWindowLabel.replace("Y", ""));
      startDate = new Date(today);
      startDate.setFullYear(today.getFullYear() - years);
    }

    return startDate.toISOString().split("T")[0]; // Return as YYYY-MM-DD
  }, [selectedWindowLabel, customDay, customMonth, customYear]);

  // Check if date selection is valid
  const isDateSelectionValid = useMemo(() => {
    if (!selectedWindowLabel) return false;
    if (selectedWindowLabel === "CUSTOM") {
      if (customDay === null || customMonth === null || customYear === null) return false;
      
      // Validate the date is valid and not in the future
      const selectedDate = new Date(customYear, customMonth - 1, customDay);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time for comparison
      
      // Check if the date is valid (handles invalid dates like Feb 30)
      if (selectedDate.getDate() !== customDay || 
          selectedDate.getMonth() !== customMonth - 1 || 
          selectedDate.getFullYear() !== customYear) {
        return false;
      }
      
      // Check year is valid
      if (customYear < 1900 || customYear > today.getFullYear()) return false;
      
      // Check date is not in the future
      if (selectedDate > today) return false;
      
      return true;
    }
    return true;
  }, [selectedWindowLabel, customDay, customMonth, customYear]);

  const handleRunAnalysis = () => {
    if (!isDateSelectionValid || !requestedStartDate || !selectedWindowLabel) {
      toast({
        title: "Date selection required",
        description: "Please select a date range before running the analysis.",
        variant: "destructive",
      });
      return;
    }

    // Store holdings in sessionStorage for the results page
    sessionStorage.setItem("portfolioHoldings", JSON.stringify(holdings));
    // Store date selection
    sessionStorage.setItem("requestedStartDate", requestedStartDate);
    sessionStorage.setItem("requestedWindowLabel", selectedWindowLabel);
    navigate("/dashboard/results");
  };

  const handlePresetSelect = (preset: "1Y" | "3Y" | "5Y" | "10Y") => {
    setSelectedWindowLabel(preset);
    setCustomDay(null);
    setCustomMonth(null);
    setCustomYear(null);
  };

  const handleCustomSelect = () => {
    setSelectedWindowLabel("CUSTOM");
    // Set default to 1 year ago if not already set
    if (customDay === null || customMonth === null || customYear === null) {
      const today = new Date();
      setCustomDay(today.getDate());
      setCustomMonth(today.getMonth() + 1); // months are 1-indexed for UI
      setCustomYear(today.getFullYear() - 1);
    }
  };

  // Handle month/year change - reset day if it's invalid for the new month
  const handleMonthChange = (month: number) => {
    setCustomMonth(month);
    // If current day is invalid for new month, reset it
    if (customDay && customYear) {
      const daysInMonth = new Date(customYear, month, 0).getDate();
      if (customDay > daysInMonth) {
        setCustomDay(null);
      }
    }
  };

  const handleYearChange = (year: number) => {
    setCustomYear(year);
    // If current day is invalid for new month/year (e.g., Feb 29 in non-leap year), reset it
    if (customDay && customMonth) {
      const daysInMonth = new Date(year, customMonth, 0).getDate();
      if (customDay > daysInMonth) {
        setCustomDay(null);
      }
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setHoldings([]);
    setSelectedWindowLabel(null);
    setCustomDay(null);
    setCustomMonth(null);
    setCustomYear(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main headline */}
          <div className="animate-slide-up opacity-0" style={{ animationDelay: "0.1s", animationFillMode: "forwards" }}>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight text-balance">
              Professional Portfolio
              <br />
              <span className="gradient-text">Analysis Tools</span>
            </h1>
          </div>

          <div className="animate-slide-up opacity-0" style={{ animationDelay: "0.2s", animationFillMode: "forwards" }}>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto text-balance">
              Backtest, optimize, and analyze your portfolio with institutional-grade tools.
              Monte Carlo simulations, factor analysis, efficient frontier—all in one place.
            </p>
          </div>

          {/* Upload Section */}
          <div className="animate-slide-up opacity-0" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
            {!uploadedFile ? (
              <div
                className={`upload-zone max-w-xl mx-auto ${isDragging ? "dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      Drop your CSV here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accepts files with Ticker and Weight columns
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto glass rounded-2xl p-6 space-y-4">
                {/* File info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-success" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {holdings.length} holdings • {(uploadedFile.size / 1024).toFixed(1)}KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearUpload}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Holdings preview */}
                <div className="bg-muted/50 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {holdings.slice(0, 8).map((holding, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 bg-card rounded-lg">
                        <span className="font-mono font-medium">{holding.ticker}</span>
                        <span className="text-muted-foreground">{holding.weight.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  {holdings.length > 8 && (
                    <p className="text-xs text-muted-foreground text-center mt-3">
                      +{holdings.length - 8} more holdings
                    </p>
                  )}
                </div>

                {/* Date Selection Section */}
                <div className="space-y-4">
                  <div className="text-left">
                    <label className="text-sm font-medium text-foreground mb-3 block">
                      Analysis Period
                    </label>
                    
                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(["1Y", "3Y", "5Y", "10Y"] as const).map((preset) => (
                        <Button
                          key={preset}
                          variant={selectedWindowLabel === preset ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePresetSelect(preset)}
                          className="flex-1 min-w-[70px]"
                        >
                          {preset}
                        </Button>
                      ))}
                      <Button
                        variant={selectedWindowLabel === "CUSTOM" ? "default" : "outline"}
                        size="sm"
                        onClick={handleCustomSelect}
                        className="flex-1 min-w-[80px]"
                      >
                        Custom
                      </Button>
                    </div>

                    {/* Custom date picker */}
                    {selectedWindowLabel === "CUSTOM" && (
                      <div className="flex gap-2">
                        <Select
                          value={customMonth?.toString() || ""}
                          onValueChange={(value) => handleMonthChange(parseInt(value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              "January", "February", "March", "April", "May", "June",
                              "July", "August", "September", "October", "November", "December"
                            ].map((month, idx) => (
                              <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={customDay?.toString() || ""}
                          onValueChange={(value) => setCustomDay(parseInt(value))}
                          disabled={!customMonth || !customYear}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {validDays.map((day) => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={customYear?.toString() || ""}
                          onValueChange={(value) => handleYearChange(parseInt(value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 30 }, (_, i) => {
                              const year = new Date().getFullYear() - i;
                              return (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Display selected date range */}
                    {isDateSelectionValid && requestedStartDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Analysis from {new Date(requestedStartDate).toLocaleDateString("en-US", { 
                          month: "short",
                          day: "numeric",
                          year: "numeric" 
                        })}
                      </p>
                    )}
                  </div>

                  {/* Run button */}
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full btn-glow"
                    onClick={handleRunAnalysis}
                    disabled={isProcessing || !isDateSelectionValid}
                  >
                    <Play className="w-5 h-5" />
                    Run Full Analysis
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Features hint */}
          <div className="animate-slide-up opacity-0 mt-16" style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              {["Backtest", "Monte Carlo", "Factor Analysis", "Efficient Frontier", "Risk Metrics"].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0">
      {/* Base gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Mesh gradient */}
      <div className="absolute inset-0 mesh-gradient" />

      {/* Animated orbs */}
      <div 
        className="orb orb-primary w-[600px] h-[600px] -top-48 -right-48"
        style={{ animationDelay: "0s" }}
      />
      <div 
        className="orb orb-accent w-[500px] h-[500px] top-1/2 -left-48"
        style={{ animationDelay: "5s" }}
      />
      <div 
        className="orb orb-success w-[400px] h-[400px] -bottom-32 right-1/4"
        style={{ animationDelay: "10s" }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      {/* Floating data cards */}
      <FloatingCards />
    </div>
  );
};

const FloatingCards = () => {
  return (
    <>
      <div 
        className="absolute top-[20%] left-[8%] glass rounded-xl p-4 animate-float opacity-60 hidden lg:block"
        style={{ animationDelay: "0s" }}
      >
        <div className="text-xs text-muted-foreground mb-1">Portfolio Value</div>
        <div className="font-display text-xl font-bold text-foreground">$2,847,392</div>
        <div className="text-xs text-success mt-1">+12.4% YTD</div>
      </div>

      <div 
        className="absolute top-[30%] right-[10%] glass rounded-xl p-4 animate-float opacity-60 hidden lg:block"
        style={{ animationDelay: "2s" }}
      >
        <div className="text-xs text-muted-foreground mb-1">Sharpe Ratio</div>
        <div className="font-display text-xl font-bold text-foreground">1.84</div>
        <div className="text-xs text-muted-foreground mt-1">vs 0.91 benchmark</div>
      </div>

      <div 
        className="absolute bottom-[25%] left-[12%] glass rounded-xl p-4 animate-float opacity-60 hidden lg:block"
        style={{ animationDelay: "4s" }}
      >
        <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
        <div className="font-display text-xl font-bold text-foreground">-18.2%</div>
        <div className="text-xs text-muted-foreground mt-1">vs -34% S&P 500</div>
      </div>

      <div 
        className="absolute bottom-[35%] right-[15%] glass rounded-xl p-4 animate-float opacity-60 hidden lg:block"
        style={{ animationDelay: "6s" }}
      >
        <div className="text-xs text-muted-foreground mb-1">CAGR</div>
        <div className="font-display text-xl font-bold text-success">+14.7%</div>
        <div className="text-xs text-muted-foreground mt-1">10-year average</div>
      </div>
    </>
  );
};

export default HeroSection;