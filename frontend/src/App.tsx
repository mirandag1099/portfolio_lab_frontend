import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Dashboard Pages
import PortfolioResults from "./pages/dashboard/PortfolioResults";
import OptimizationDashboard from "./pages/dashboard/OptimizationDashboard";
import SavedPortfolios from "./pages/dashboard/SavedPortfolios";
import Reports from "./pages/dashboard/Reports";
import PopularPortfolios from "./pages/dashboard/PopularPortfolios";
import AIHub from "./pages/dashboard/AIHub";
import AIAnalyst from "./pages/dashboard/AIAnalyst";
import AIPlanner from "./pages/dashboard/AIPlanner";
import AIAuditor from "./pages/dashboard/AIAuditor";
import AICoach from "./pages/dashboard/AICoach";
import CAGRCalculator from "./pages/dashboard/CAGRCalculator";
import CompoundInterestCalculator from "./pages/dashboard/CompoundInterestCalculator";
import Indicators from "./pages/dashboard/Indicators";

// Legacy pages (to be migrated)
import FactorAnalysis from "./pages/FactorAnalysis";
import Benchmark from "./pages/Benchmark";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<Index />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<Navigate to="/dashboard/results" replace />} />
          <Route path="/dashboard/results" element={<PortfolioResults />} />
          <Route path="/dashboard/indicators" element={<Indicators />} />
          <Route path="/dashboard/optimization" element={<OptimizationDashboard />} />
          <Route path="/dashboard/saved" element={<SavedPortfolios />} />
          <Route path="/dashboard/reports" element={<Reports />} />
          <Route path="/dashboard/factor-analysis" element={<FactorAnalysis />} />
          <Route path="/dashboard/benchmark" element={<Benchmark />} />
          <Route path="/dashboard/popular" element={<PopularPortfolios />} />
          
          {/* AI Agent Routes */}
          <Route path="/dashboard/ai" element={<AIHub />} />
          <Route path="/dashboard/ai/analyst" element={<AIAnalyst />} />
          <Route path="/dashboard/ai/planner" element={<AIPlanner />} />
          <Route path="/dashboard/ai/auditor" element={<AIAuditor />} />
          <Route path="/dashboard/ai/coach" element={<AICoach />} />
          <Route path="/dashboard/ai-insights" element={<Navigate to="/dashboard/ai" replace />} />
          
          {/* Calculator routes */}
          <Route path="/dashboard/cagr" element={<CAGRCalculator />} />
          <Route path="/dashboard/compound" element={<CompoundInterestCalculator />} />
          
          {/* Legacy routes - redirect to new dashboard */}
          <Route path="/backtest" element={<Navigate to="/dashboard/results" replace />} />
          <Route path="/dashboard/backtest" element={<Navigate to="/dashboard/results" replace />} />
          <Route path="/dashboard/monte-carlo" element={<Navigate to="/dashboard/results" replace />} />
          <Route path="/optimization" element={<Navigate to="/dashboard/optimization" replace />} />
          <Route path="/portfolios" element={<Navigate to="/dashboard/results" replace />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;