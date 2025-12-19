import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, TrendingUp, TrendingDown, Users, Landmark, Star, 
  Search, Filter, ArrowUpRight, ArrowDownRight, Calendar,
  Building2, Briefcase, Twitter, ChevronRight, Eye, Plus, Bell, BellOff, 
  UserPlus, UserCheck, Check
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Congress Trading Data
const congressMembers = [
  {
    id: "nancy-pelosi",
    name: "Nancy Pelosi",
    chamber: "House",
    party: "Democrat",
    state: "CA",
    avatar: "NP",
    totalTrades: 127,
    ytdReturn: "+32.1%",
    recentTrades: [
      { symbol: "NVDA", action: "Purchase", amount: "$1M - $5M", date: "Dec 10, 2025", priceAtTrade: 142.50, currentPrice: 148.20, change: "+4.0%" },
      { symbol: "GOOGL", action: "Sale", amount: "$500k - $1M", date: "Dec 05, 2025", priceAtTrade: 178.30, currentPrice: 175.60, change: "-1.5%" },
      { symbol: "AAPL", action: "Purchase", amount: "$250k - $500k", date: "Nov 28, 2025", priceAtTrade: 228.50, currentPrice: 242.80, change: "+6.3%" },
    ],
    topHoldings: ["NVDA", "AAPL", "GOOGL", "MSFT", "TSLA"],
  },
  {
    id: "david-mccormick",
    name: "David H McCormick",
    chamber: "Senate",
    party: "Republican",
    state: "PA",
    avatar: "DM",
    totalTrades: 45,
    ytdReturn: "+18.4%",
    recentTrades: [
      { symbol: "BITB", action: "Purchase", amount: "$50k - $100k", date: "Nov 25, 2025", priceAtTrade: 47.48, currentPrice: 49.06, change: "+3.3%" },
      { symbol: "ZTS", action: "Sale (Full)", amount: "$15k - $50k", date: "Nov 10, 2025", priceAtTrade: 119.79, currentPrice: 118.67, change: "-0.9%" },
    ],
    topHoldings: ["BITB", "MSFT", "AMZN"],
  },
  {
    id: "markwayne-mullin",
    name: "Markwayne Mullin",
    chamber: "Senate",
    party: "Republican",
    state: "OK",
    avatar: "MM",
    totalTrades: 38,
    ytdReturn: "+15.2%",
    recentTrades: [
      { symbol: "CSX", action: "Sale (Full)", amount: "$15k - $50k", date: "Nov 10, 2025", priceAtTrade: 35.10, currentPrice: 37.38, change: "+6.5%" },
    ],
    topHoldings: ["XOM", "CVX", "CSX"],
  },
  {
    id: "tommy-tuberville",
    name: "Tommy Tuberville",
    chamber: "Senate",
    party: "Republican",
    state: "AL",
    avatar: "TT",
    totalTrades: 132,
    ytdReturn: "+22.8%",
    recentTrades: [
      { symbol: "META", action: "Purchase", amount: "$15k - $50k", date: "Dec 02, 2025", priceAtTrade: 580.20, currentPrice: 612.40, change: "+5.5%" },
    ],
    topHoldings: ["META", "AMZN", "GOOGL", "NVDA"],
  },
  {
    id: "dan-crenshaw",
    name: "Dan Crenshaw",
    chamber: "House",
    party: "Republican",
    state: "TX",
    avatar: "DC",
    totalTrades: 67,
    ytdReturn: "+14.6%",
    recentTrades: [
      { symbol: "XOM", action: "Purchase", amount: "$15k - $50k", date: "Nov 15, 2025", priceAtTrade: 118.50, currentPrice: 112.30, change: "-5.2%" },
    ],
    topHoldings: ["XOM", "CVX", "HAL"],
  },
];

const committees = [
  "Finance Committee",
  "Armed Services Committee",
  "Banking Committee",
  "Energy Committee",
  "Intelligence Committee",
  "Judiciary Committee",
  "Foreign Relations",
  "Commerce Committee",
];

const tradesChartData = [
  { month: "Jul", buys: 45, sells: 32 },
  { month: "Aug", buys: 52, sells: 28 },
  { month: "Sep", buys: 38, sells: 45 },
  { month: "Oct", buys: 61, sells: 35 },
  { month: "Nov", buys: 48, sells: 52 },
  { month: "Dec", buys: 35, sells: 28 },
];

const mostBoughtStocks = [
  { symbol: "NVDA", name: "NVIDIA", trades: 24, totalValue: "$2.4M", avgChange: "+12.4%" },
  { symbol: "MSFT", name: "Microsoft", trades: 18, totalValue: "$1.8M", avgChange: "+8.2%" },
  { symbol: "GOOGL", name: "Alphabet", trades: 15, totalValue: "$1.2M", avgChange: "+5.6%" },
  { symbol: "AAPL", name: "Apple", trades: 14, totalValue: "$980k", avgChange: "+4.8%" },
  { symbol: "META", name: "Meta", trades: 12, totalValue: "$750k", avgChange: "+9.1%" },
];

const mostSoldStocks = [
  { symbol: "TSLA", name: "Tesla", trades: 19, totalValue: "$1.6M", avgChange: "-8.2%" },
  { symbol: "AMZN", name: "Amazon", trades: 14, totalValue: "$1.1M", avgChange: "+2.1%" },
  { symbol: "DIS", name: "Disney", trades: 11, totalValue: "$680k", avgChange: "-4.5%" },
  { symbol: "BA", name: "Boeing", trades: 9, totalValue: "$520k", avgChange: "-12.3%" },
  { symbol: "INTC", name: "Intel", trades: 8, totalValue: "$340k", avgChange: "-15.8%" },
];

// Top Investors / Gurus
const topInvestors = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    aum: "$920B",
    ytdReturn: "+24.2%",
    avatar: "WB",
    style: "Value Investing",
    topHoldings: ["AAPL", "BAC", "AXP", "KO", "CVX"],
    recentMoves: [
      { symbol: "OXY", action: "Increased", change: "+8.2%", date: "Q3 2025" },
      { symbol: "AAPL", action: "Trimmed", change: "-2.1%", date: "Q3 2025" },
    ],
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    firm: "Bridgewater Associates",
    aum: "$124B",
    ytdReturn: "+11.8%",
    avatar: "RD",
    style: "Macro / Risk Parity",
    topHoldings: ["SPY", "VWO", "GLD", "TLT", "IEMG"],
    recentMoves: [
      { symbol: "GLD", action: "Increased", change: "+15%", date: "Q3 2025" },
      { symbol: "SPY", action: "Decreased", change: "-5%", date: "Q3 2025" },
    ],
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    firm: "ARK Invest",
    aum: "$14B",
    ytdReturn: "+38.5%",
    avatar: "CW",
    style: "Disruptive Innovation",
    topHoldings: ["TSLA", "COIN", "ROKU", "SQ", "PATH"],
    recentMoves: [
      { symbol: "TSLA", action: "Increased", change: "+12%", date: "Dec 2025" },
      { symbol: "COIN", action: "Increased", change: "+8%", date: "Dec 2025" },
    ],
  },
  {
    id: "bill-ackman",
    name: "Bill Ackman",
    firm: "Pershing Square",
    aum: "$18B",
    ytdReturn: "+28.4%",
    avatar: "BA",
    style: "Activist Investing",
    topHoldings: ["CMG", "HLT", "LOW", "QSR", "GOOGL"],
    recentMoves: [
      { symbol: "NFLX", action: "New Position", change: "N/A", date: "Q3 2025" },
    ],
  },
  {
    id: "michael-burry",
    name: "Michael Burry",
    firm: "Scion Asset Management",
    aum: "$280M",
    ytdReturn: "+15.2%",
    avatar: "MB",
    style: "Contrarian / Deep Value",
    topHoldings: ["BABA", "JD", "BIDU", "GEO", "CXW"],
    recentMoves: [
      { symbol: "BABA", action: "Increased", change: "+25%", date: "Q3 2025" },
    ],
  },
];

// Insider Trades
const insiderTrades = [
  {
    company: "NVIDIA",
    symbol: "NVDA",
    insider: "Jensen Huang",
    title: "CEO",
    action: "Sale",
    shares: "120,000",
    value: "$17.4M",
    date: "Dec 08, 2025",
    priceAtTrade: 145.00,
    currentPrice: 148.20,
    change: "+2.2%",
  },
  {
    company: "Tesla",
    symbol: "TSLA",
    insider: "Kimbal Musk",
    title: "Board Member",
    action: "Sale",
    shares: "50,000",
    value: "$18.5M",
    date: "Dec 05, 2025",
    priceAtTrade: 370.00,
    currentPrice: 385.40,
    change: "+4.2%",
  },
  {
    company: "Microsoft",
    symbol: "MSFT",
    insider: "Satya Nadella",
    title: "CEO",
    action: "Sale",
    shares: "10,000",
    value: "$4.2M",
    date: "Dec 02, 2025",
    priceAtTrade: 420.00,
    currentPrice: 428.50,
    change: "+2.0%",
  },
  {
    company: "Amazon",
    symbol: "AMZN",
    insider: "Andy Jassy",
    title: "CEO",
    action: "Sale",
    shares: "25,000",
    value: "$4.8M",
    date: "Nov 28, 2025",
    priceAtTrade: 192.00,
    currentPrice: 198.40,
    change: "+3.3%",
  },
  {
    company: "Apple",
    symbol: "AAPL",
    insider: "Tim Cook",
    title: "CEO",
    action: "Sale",
    shares: "200,000",
    value: "$48.2M",
    date: "Nov 20, 2025",
    priceAtTrade: 241.00,
    currentPrice: 242.80,
    change: "+0.7%",
  },
];

// Classic Portfolios
const classicPortfolios = [
  {
    name: "Warren Buffett 90/10",
    description: "90% S&P 500, 10% Short-term Treasury",
    holdings: [
      { symbol: "VOO", allocation: 90 },
      { symbol: "SHV", allocation: 10 },
    ],
    returns: "+24.2%",
  },
  {
    name: "Ray Dalio All Weather",
    description: "Risk parity across asset classes",
    holdings: [
      { symbol: "VTI", allocation: 30 },
      { symbol: "TLT", allocation: 40 },
      { symbol: "IEI", allocation: 15 },
      { symbol: "GLD", allocation: 7.5 },
      { symbol: "DBC", allocation: 7.5 },
    ],
    returns: "+11.8%",
  },
  {
    name: "Bogleheads Three-Fund",
    description: "Simple, diversified, low-cost",
    holdings: [
      { symbol: "VTI", allocation: 50 },
      { symbol: "VXUS", allocation: 30 },
      { symbol: "BND", allocation: 20 },
    ],
    returns: "+14.6%",
  },
  {
    name: "Golden Butterfly",
    description: "Equal weight across 5 asset classes",
    holdings: [
      { symbol: "VTI", allocation: 20 },
      { symbol: "IWN", allocation: 20 },
      { symbol: "TLT", allocation: 20 },
      { symbol: "SHV", allocation: 20 },
      { symbol: "GLD", allocation: 20 },
    ],
    returns: "+9.8%",
  },
];

const PopularPortfolios = () => {
  const [activeTab, setActiveTab] = useState("congress");
  const [partyFilter, setPartyFilter] = useState<"all" | "democrat" | "republican">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);
  
  // Follow & Notification state
  const [followedPoliticians, setFollowedPoliticians] = useState<Set<string>>(new Set());
  const [notifiedPoliticians, setNotifiedPoliticians] = useState<Set<string>>(new Set());
  const [followedInvestors, setFollowedInvestors] = useState<Set<string>>(new Set());
  const [notifiedInvestors, setNotifiedInvestors] = useState<Set<string>>(new Set());
  const [followedInsiders, setFollowedInsiders] = useState<Set<string>>(new Set());
  const [notifiedInsiders, setNotifiedInsiders] = useState<Set<string>>(new Set());

  const toggleFollow = (id: string, type: 'politician' | 'investor' | 'insider', name: string) => {
    if (type === 'politician') {
      setFollowedPoliticians(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Unfollowed ${name}`);
        } else {
          next.add(id);
          toast.success(`Following ${name}`, { description: "You'll see their trades in your feed" });
        }
        return next;
      });
    } else if (type === 'investor') {
      setFollowedInvestors(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Unfollowed ${name}`);
        } else {
          next.add(id);
          toast.success(`Following ${name}`, { description: "You'll see their portfolio updates" });
        }
        return next;
      });
    } else {
      setFollowedInsiders(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Unfollowed ${name}`);
        } else {
          next.add(id);
          toast.success(`Following ${name}`, { description: "You'll see their SEC filings" });
        }
        return next;
      });
    }
  };

  const toggleNotification = (id: string, type: 'politician' | 'investor' | 'insider', name: string) => {
    if (type === 'politician') {
      setNotifiedPoliticians(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Notifications off for ${name}`);
        } else {
          next.add(id);
          toast.success(`Notifications on for ${name}`, { description: "Get instant alerts when they trade" });
        }
        return next;
      });
    } else if (type === 'investor') {
      setNotifiedInvestors(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Notifications off for ${name}`);
        } else {
          next.add(id);
          toast.success(`Notifications on for ${name}`, { description: "Get alerts on 13F filings" });
        }
        return next;
      });
    } else {
      setNotifiedInsiders(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          toast.info(`Notifications off for ${name}`);
        } else {
          next.add(id);
          toast.success(`Notifications on for ${name}`, { description: "Get alerts on Form 4 filings" });
        }
        return next;
      });
    }
  };

  const filteredMembers = congressMembers.filter(member => {
    const matchesParty = partyFilter === "all" || member.party.toLowerCase() === partyFilter;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesParty && matchesSearch;
  });

  return (
    <DashboardLayout
      title="Market Intelligence"
      description="Track congress trades, insider activity, and legendary investor portfolios"
    >
      {/* Feature Callout Banner */}
      <div className="glass rounded-xl p-4 mb-6 border border-amber-500/20 bg-amber-500/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Instant Trade Alerts</p>
                <p className="text-xs text-muted-foreground">Never miss critical moves</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Follow Anyone</p>
                <p className="text-xs text-muted-foreground">Track their every trade</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Congress Insider Knowledge</p>
                <p className="text-xs text-muted-foreground">Leverage public disclosures</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-green-500" />
            <span>Following: {followedPoliticians.size + followedInvestors.size + followedInsiders.size}</span>
            <span className="mx-2">•</span>
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Alerts: {notifiedPoliticians.size + notifiedInvestors.size + notifiedInsiders.size}</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="tabs-modern grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="congress" className="tab-trigger-modern flex items-center gap-2">
            <Landmark className="w-4 h-4" />
            Congress Trades
          </TabsTrigger>
          <TabsTrigger value="investors" className="tab-trigger-modern flex items-center gap-2">
            <Star className="w-4 h-4" />
            Top Investors
          </TabsTrigger>
          <TabsTrigger value="insiders" className="tab-trigger-modern flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Insider Trades
          </TabsTrigger>
          <TabsTrigger value="portfolios" className="tab-trigger-modern flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Strategies
          </TabsTrigger>
        </TabsList>

        {/* CONGRESS TRADES TAB */}
        <TabsContent value="congress" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Button 
                variant={partyFilter === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPartyFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={partyFilter === "democrat" ? "default" : "outline"} 
                size="sm"
                className={partyFilter === "democrat" ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => setPartyFilter("democrat")}
              >
                Democrats
              </Button>
              <Button 
                variant={partyFilter === "republican" ? "default" : "outline"} 
                size="sm"
                className={partyFilter === "republican" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setPartyFilter("republican")}
              >
                Republicans
              </Button>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search politician..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Trading Activity Chart */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4">Trades Last 6 Months</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradesChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="buys" fill="hsl(142, 76%, 36%)" name="Buys" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sells" fill="hsl(0, 84%, 60%)" name="Sells" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most Bought/Sold Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">Most Bought (Last 3 Months)</h3>
              </div>
              <div className="space-y-3">
                {mostBoughtStocks.map((stock, idx) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-4">{idx + 1}</span>
                      <div>
                        <p className="font-semibold">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-500">{stock.avgChange}</p>
                      <p className="text-xs text-muted-foreground">{stock.trades} trades</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold">Most Sold (Last 3 Months)</h3>
              </div>
              <div className="space-y-3">
                {mostSoldStocks.map((stock, idx) => (
                  <div key={stock.symbol} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-4">{idx + 1}</span>
                      <div>
                        <p className="font-semibold">{stock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{stock.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${stock.avgChange.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.avgChange}
                      </p>
                      <p className="text-xs text-muted-foreground">{stock.trades} trades</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Committees */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold mb-4">Browse by Committee</h3>
            <div className="flex flex-wrap gap-2">
              {committees.map((committee) => (
                <Badge 
                  key={committee}
                  variant={selectedCommittee === committee ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setSelectedCommittee(selectedCommittee === committee ? null : committee)}
                >
                  {committee}
                </Badge>
              ))}
            </div>
          </div>

          {/* Congress Members List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Latest Trades by Politician</h3>
            {filteredMembers.map((member) => (
              <div key={member.id} className="glass rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                      member.party === "Democrat" ? "bg-blue-600" : "bg-red-600"
                    }`}>
                      {member.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{member.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {member.chamber} • {member.party} • {member.state}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <p className="text-sm text-muted-foreground">YTD Return</p>
                      <p className="font-semibold text-green-500">{member.ytdReturn}</p>
                    </div>
                    <Button 
                      variant={followedPoliticians.has(member.id) ? "default" : "outline"} 
                      size="sm"
                      onClick={() => toggleFollow(member.id, 'politician', member.name)}
                      className={followedPoliticians.has(member.id) ? "bg-primary" : ""}
                    >
                      {followedPoliticians.has(member.id) ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button 
                      variant={notifiedPoliticians.has(member.id) ? "default" : "ghost"} 
                      size="icon"
                      onClick={() => toggleNotification(member.id, 'politician', member.name)}
                      className={notifiedPoliticians.has(member.id) ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                      title={notifiedPoliticians.has(member.id) ? "Notifications on" : "Get trade alerts"}
                    >
                      {notifiedPoliticians.has(member.id) ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Recent Trades */}
                <div className="space-y-2">
                  {member.recentTrades.map((trade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.action.includes("Purchase") 
                            ? "bg-green-500/10 text-green-500" 
                            : "bg-red-500/10 text-red-500"
                        }`}>
                          {trade.action}
                        </div>
                        <div>
                          <span className="font-mono font-semibold">{trade.symbol}</span>
                          <span className="text-sm text-muted-foreground ml-2">{trade.amount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Price at trade</p>
                          <p className="font-mono">${trade.priceAtTrade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Current</p>
                          <p className={`font-mono ${trade.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                            ${trade.currentPrice} ({trade.change})
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {trade.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Top Holdings:</span>
                    {member.topHoldings.slice(0, 5).map((symbol) => (
                      <Badge key={symbol} variant="secondary" className="font-mono">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard/backtest">
                        Backtest Portfolio
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      View All Trades
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TOP INVESTORS TAB */}
        <TabsContent value="investors" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topInvestors.map((investor) => (
              <div key={investor.id} className="glass rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {investor.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold">{investor.name}</h4>
                      <p className="text-xs text-muted-foreground">{investor.firm}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{investor.style}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">AUM</p>
                    <p className="font-semibold">{investor.aum}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">YTD Return</p>
                    <p className="font-semibold text-green-500">{investor.ytdReturn}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Top Holdings</p>
                  <div className="flex flex-wrap gap-1">
                    {investor.topHoldings.map((symbol) => (
                      <Badge key={symbol} variant="outline" className="font-mono text-xs">
                        {symbol}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Recent Moves</p>
                  <div className="space-y-2">
                    {investor.recentMoves.map((move, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`${
                            move.action.includes("Increased") || move.action.includes("New") 
                              ? "text-green-500" 
                              : "text-red-500"
                          }`}>
                            {move.action.includes("Increased") || move.action.includes("New") ? "↑" : "↓"}
                          </span>
                          <span className="font-mono">{move.symbol}</span>
                        </div>
                        <span className="text-muted-foreground">{move.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <Button 
                    variant={followedInvestors.has(investor.id) ? "default" : "outline"} 
                    size="sm"
                    className={`flex-1 ${followedInvestors.has(investor.id) ? "bg-primary" : ""}`}
                    onClick={() => toggleFollow(investor.id, 'investor', investor.name)}
                  >
                    {followedInvestors.has(investor.id) ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                  <Button 
                    variant={notifiedInvestors.has(investor.id) ? "default" : "ghost"} 
                    size="icon"
                    onClick={() => toggleNotification(investor.id, 'investor', investor.name)}
                    className={notifiedInvestors.has(investor.id) ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                    title={notifiedInvestors.has(investor.id) ? "Notifications on" : "Get 13F alerts"}
                  >
                    {notifiedInvestors.has(investor.id) ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard/backtest">Backtest</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard/optimization">Optimize</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* INSIDER TRADES TAB */}
        <TabsContent value="insiders" className="space-y-6">
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold">Recent Insider Transactions</h3>
              <p className="text-sm text-muted-foreground">SEC Form 4 filings from company executives</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Company</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Insider</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Action</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Shares</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Value</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Price</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Change</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Track</th>
                  </tr>
                </thead>
                <tbody>
                  {insiderTrades.map((trade, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold">{trade.symbol}</p>
                          <p className="text-xs text-muted-foreground">{trade.company}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium">{trade.insider}</p>
                          <p className="text-xs text-muted-foreground">{trade.title}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={trade.action === "Purchase" ? "default" : "secondary"} className={
                          trade.action === "Purchase" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        }>
                          {trade.action}
                        </Badge>
                      </td>
                      <td className="p-4 text-right font-mono">{trade.shares}</td>
                      <td className="p-4 text-right font-semibold">{trade.value}</td>
                      <td className="p-4 text-right font-mono">${trade.priceAtTrade}</td>
                      <td className={`p-4 text-right font-mono ${trade.change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.change}
                      </td>
                      <td className="p-4 text-right text-muted-foreground">{trade.date}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant={followedInsiders.has(trade.insider) ? "default" : "ghost"} 
                            size="icon"
                            className={`h-8 w-8 ${followedInsiders.has(trade.insider) ? "bg-primary" : ""}`}
                            onClick={() => toggleFollow(trade.insider, 'insider', trade.insider)}
                            title={followedInsiders.has(trade.insider) ? "Following" : "Follow insider"}
                          >
                            {followedInsiders.has(trade.insider) ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <UserPlus className="w-4 h-4" />
                            )}
                          </Button>
                          <Button 
                            variant={notifiedInsiders.has(trade.insider) ? "default" : "ghost"} 
                            size="icon"
                            className={`h-8 w-8 ${notifiedInsiders.has(trade.insider) ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                            onClick={() => toggleNotification(trade.insider, 'insider', trade.insider)}
                            title={notifiedInsiders.has(trade.insider) ? "Notifications on" : "Get alerts"}
                          >
                            {notifiedInsiders.has(trade.insider) ? (
                              <Bell className="w-4 h-4" />
                            ) : (
                              <BellOff className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 p-6 glass rounded-xl">
            <p className="text-muted-foreground">Want to track insider activity for a specific stock?</p>
            <Button variant="outline" asChild>
              <Link to="/dashboard/backtest">
                Compare with Congress Trades
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </TabsContent>

        {/* CLASSIC PORTFOLIOS TAB */}
        <TabsContent value="portfolios" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {classicPortfolios.map((portfolio) => (
              <div key={portfolio.name} className="glass rounded-xl p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{portfolio.name}</h4>
                    <p className="text-sm text-muted-foreground">{portfolio.description}</p>
                  </div>
                  <span className="text-lg font-bold text-green-500">{portfolio.returns}</span>
                </div>

                <div className="space-y-2 mb-4">
                  {portfolio.holdings.map((holding) => (
                    <div key={holding.symbol} className="flex items-center justify-between">
                      <span className="font-mono">{holding.symbol}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${holding.allocation}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium">{holding.allocation}%</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard/backtest">
                      Backtest
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/dashboard/optimization">
                      Optimize
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link to="/dashboard/results">
                      <Eye className="w-3 h-3 mr-1" />
                      Analyze
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default PopularPortfolios;