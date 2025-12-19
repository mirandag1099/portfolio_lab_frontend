import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Percent } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CompoundInterestCalculator = () => {
  const [principal, setPrincipal] = useState("10000");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [annualRate, setAnnualRate] = useState("7");
  const [years, setYears] = useState("20");
  const [compoundFrequency, setCompoundFrequency] = useState("12");

  const result = useMemo(() => {
    const P = parseFloat(principal) || 0;
    const PMT = parseFloat(monthlyContribution) || 0;
    const r = (parseFloat(annualRate) || 0) / 100;
    const t = parseFloat(years) || 0;
    const n = parseInt(compoundFrequency) || 12;

    if (t <= 0) return null;

    // Calculate future value with compound interest and monthly contributions
    const ratePerPeriod = r / n;
    const totalPeriods = n * t;

    // Future value of initial principal
    const principalFV = P * Math.pow(1 + ratePerPeriod, totalPeriods);

    // Future value of monthly contributions (ordinary annuity)
    let contributionFV = 0;
    if (ratePerPeriod > 0) {
      contributionFV = PMT * ((Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod);
    } else {
      contributionFV = PMT * totalPeriods;
    }

    const totalFV = principalFV + contributionFV;
    const totalContributions = P + PMT * t * 12;
    const totalInterest = totalFV - totalContributions;

    // Generate chart data
    const chartData = [];
    for (let year = 0; year <= t; year++) {
      const periodsElapsed = n * year;
      const principalAtYear = P * Math.pow(1 + ratePerPeriod, periodsElapsed);
      let contributionAtYear = 0;
      if (ratePerPeriod > 0) {
        contributionAtYear = PMT * ((Math.pow(1 + ratePerPeriod, periodsElapsed) - 1) / ratePerPeriod);
      } else {
        contributionAtYear = PMT * periodsElapsed;
      }
      const totalAtYear = principalAtYear + contributionAtYear;
      const contributionsOnly = P + PMT * year * 12;

      chartData.push({
        year,
        total: Math.round(totalAtYear),
        contributions: Math.round(contributionsOnly),
        interest: Math.round(totalAtYear - contributionsOnly),
      });
    }

    return {
      finalValue: totalFV,
      totalContributions,
      totalInterest,
      chartData,
    };
  }, [principal, monthlyContribution, annualRate, years, compoundFrequency]);

  return (
    <DashboardLayout
      title="Compound Interest Calculator"
      description="See how your money grows over time with compound interest"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Investment Parameters
            </CardTitle>
            <CardDescription>
              Configure your investment scenario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="principal">Initial Investment ($)</Label>
              <Input
                id="principal"
                type="number"
                min={0}
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly">Monthly Contribution ($)</Label>
              <Input
                id="monthly"
                type="number"
                min={0}
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Annual Interest Rate (%)</Label>
              <Input
                id="rate"
                type="number"
                min={0}
                step={0.1}
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                {["5", "7", "10", "12"].map((rate) => (
                  <Button
                    key={rate}
                    variant={annualRate === rate ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setAnnualRate(rate)}
                  >
                    {rate}%
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="years">Investment Period (Years)</Label>
              <Input
                id="years"
                type="number"
                min={1}
                max={50}
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                {["10", "20", "30", "40"].map((y) => (
                  <Button
                    key={y}
                    variant={years === y ? "hero" : "outline"}
                    size="sm"
                    onClick={() => setYears(y)}
                  >
                    {y}Y
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Compound Frequency</Label>
              <Select value={compoundFrequency} onValueChange={setCompoundFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Annually</SelectItem>
                  <SelectItem value="4">Quarterly</SelectItem>
                  <SelectItem value="12">Monthly</SelectItem>
                  <SelectItem value="365">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Final Value</p>
                    <p className="text-2xl font-bold text-primary">
                      ${result.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Contributed</p>
                    <p className="text-2xl font-bold">
                      ${result.totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Interest Earned</p>
                    <p className="text-2xl font-bold text-green-500">
                      ${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Growth Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={result.chartData}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `Y${v}`}
                        />
                        <YAxis
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorTotal)"
                          name="Total Value"
                        />
                        <Area
                          type="monotone"
                          dataKey="contributions"
                          stroke="hsl(var(--muted-foreground))"
                          fill="url(#colorContrib)"
                          name="Contributions"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CompoundInterestCalculator;
