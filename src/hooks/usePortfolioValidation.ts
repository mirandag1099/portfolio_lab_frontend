import { useMemo } from "react";
import { Holding } from "@/components/portfolio/HoldingRow";

interface ValidationResult {
  isValid: boolean;
  totalWeight: number;
  hasEmptyTickers: boolean;
  hasDuplicates: boolean;
  hasInvalidWeights: boolean;
  duplicateSymbols: Set<string>;
  errors: Map<number, { symbol?: string; allocation?: string; duplicate?: boolean }>;
}

export function usePortfolioValidation(holdings: Holding[]): ValidationResult {
  return useMemo(() => {
    const errors = new Map<number, { symbol?: string; allocation?: string; duplicate?: boolean }>();
    const symbolCount = new Map<string, number>();
    let totalWeight = 0;
    let hasEmptyTickers = false;
    let hasInvalidWeights = false;

    // Count symbols and validate each holding
    holdings.forEach((holding, index) => {
      const rowErrors: { symbol?: string; allocation?: string; duplicate?: boolean } = {};

      // Check for empty ticker
      if (!holding.symbol.trim()) {
        hasEmptyTickers = true;
        rowErrors.symbol = "Required";
      } else {
        const symbol = holding.symbol.trim().toUpperCase();
        symbolCount.set(symbol, (symbolCount.get(symbol) || 0) + 1);
      }

      // Check weight validity
      if (holding.allocation < 0 || holding.allocation > 100) {
        hasInvalidWeights = true;
        rowErrors.allocation = "0-100";
      }

      totalWeight += holding.allocation;

      if (Object.keys(rowErrors).length > 0) {
        errors.set(index, rowErrors);
      }
    });

    // Find duplicates
    const duplicateSymbols = new Set<string>();
    symbolCount.forEach((count, symbol) => {
      if (count > 1) {
        duplicateSymbols.add(symbol);
      }
    });

    // Mark duplicate rows
    if (duplicateSymbols.size > 0) {
      holdings.forEach((holding, index) => {
        if (duplicateSymbols.has(holding.symbol.trim().toUpperCase())) {
          const existing = errors.get(index) || {};
          errors.set(index, { ...existing, duplicate: true });
        }
      });
    }

    const hasDuplicates = duplicateSymbols.size > 0;
    const isValid = !hasEmptyTickers && !hasDuplicates && !hasInvalidWeights;

    return {
      isValid,
      totalWeight,
      hasEmptyTickers,
      hasDuplicates,
      hasInvalidWeights,
      duplicateSymbols,
      errors,
    };
  }, [holdings]);
}
