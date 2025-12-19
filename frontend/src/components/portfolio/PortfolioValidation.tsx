import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PortfolioValidationProps {
  totalWeight: number;
  hasEmptyTickers: boolean;
  hasDuplicates: boolean;
  hasInvalidWeights: boolean;
}

export function PortfolioValidation({
  totalWeight,
  hasEmptyTickers,
  hasDuplicates,
  hasInvalidWeights,
}: PortfolioValidationProps) {
  const isValid = !hasEmptyTickers && !hasDuplicates && !hasInvalidWeights;
  const weightWarning = Math.abs(totalWeight - 100) > 0.01;

  if (isValid && !weightWarning) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-green-500">
          Portfolio is valid. Total weight: {totalWeight.toFixed(1)}%
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      {hasEmptyTickers && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>All assets must have a ticker symbol.</AlertDescription>
        </Alert>
      )}
      {hasDuplicates && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Duplicate ticker symbols are not allowed.</AlertDescription>
        </Alert>
      )}
      {hasInvalidWeights && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>All weights must be between 0 and 100.</AlertDescription>
        </Alert>
      )}
      {weightWarning && !hasEmptyTickers && !hasDuplicates && !hasInvalidWeights && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-500">
            Weights sum to {totalWeight.toFixed(1)}% (not 100%). You can still proceed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
