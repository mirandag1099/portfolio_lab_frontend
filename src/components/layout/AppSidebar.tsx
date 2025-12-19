import { Link, useLocation } from "react-router-dom";
import {
  LineChart,
  PieChart,
  TrendingUp,
  Target,
  Users,
  Bot,
  Calculator,
  Percent,
  Activity,
  Briefcase,
  LayoutDashboard,
  SlidersHorizontal,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const analysisTools = [
  { title: "Performance", url: "/dashboard/results", icon: LayoutDashboard },
  { title: "Indicators", url: "/dashboard/indicators", icon: SlidersHorizontal },
  { title: "Optimization", url: "/dashboard/optimization", icon: Target },
  { title: "Factor Analysis", url: "/dashboard/factor-analysis", icon: PieChart },
  { title: "Benchmark", url: "/dashboard/benchmark", icon: Activity },
];

const discover = [
  { title: "Popular Portfolios", url: "/dashboard/popular", icon: Users },
  { title: "AI Assistant", url: "/dashboard/ai", icon: Bot },
];

const calculators = [
  { title: "CAGR Calculator", url: "/dashboard/cagr", icon: Calculator },
  { title: "Compound Interest", url: "/dashboard/compound", icon: Percent },
];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Briefcase className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg group-data-[collapsible=icon]:hidden">PortfolioLab</span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3 py-2">
            Analysis
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysisTools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-10 rounded-xl transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3 py-2">
            Discover
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {discover.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-10 rounded-xl transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-medium px-3 py-2">
            Calculators
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {calculators.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-10 rounded-xl transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}