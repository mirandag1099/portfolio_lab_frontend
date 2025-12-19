import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

const CAGRCalculator = () => {
  const [initialValue, setInitialValue] = useState("10000");
  const [finalValue, setFinalValue] = useState("25000");
  const [years, setYears] = useState("5");
  const [result, setResult] = useState<number | null>(null);

  const calculateCAGR = () => {
    const initial = parseFloat(initialValue);
    const final = parseFloat(finalValue);
    const numYears = parseFloat(years);

    if (initial > 0 && final > 0 && numYears > 0) {
      const cagr = (Math.pow(final / initial, 1 / numYears) - 1) * 100;
      setResult(cagr);
    }
  };

  return (
    <DashboardLayout
      title="CAGR Calculator"
      description="Calculate the Compound Annual Growth Rate of your investments"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              CAGR Calculator
            </CardTitle>
            <CardDescription>
              Enter your investment values to calculate the annualized growth rate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial">Initial Investment ($)</Label>
                <Input
                  id="initial"
                  type="number"
                  min={0}
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="final">Final Value ($)</Label>
                <Input
                  id="final"
                  type="number"
                  min={0}
                  value={finalValue}
                  onChange={(e) => setFinalValue(e.target.value)}
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Number of Years</Label>
                <Input
                  id="years"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="5"
                />
              </div>
            </div>

            <Button variant="hero" className="w-full" onClick={calculateCAGR}>
              Calculate CAGR
            </Button>

            {result !== null && (
              <Card className="bg-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Compound Annual Growth Rate
                    </p>
                    <p className="text-4xl font-bold text-primary">
                      {result.toFixed(2)}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Your investment grew at an average rate of {result.toFixed(2)}% per year
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t border-border">
              <p className="font-medium">Formula:</p>
              <p className="font-mono text-xs bg-muted/50 p-2 rounded">
                CAGR = (Final Value / Initial Value)^(1/Years) - 1
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CAGRCalculator;
