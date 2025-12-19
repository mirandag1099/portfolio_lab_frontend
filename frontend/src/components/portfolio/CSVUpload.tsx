import { useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Holding } from "./HoldingRow";

interface CSVUploadProps {
  onUpload: (holdings: Holding[]) => void;
}

export function CSVUpload({ onUpload }: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const holdings: Holding[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index: number) => {
          // Support various column name formats
          const ticker = row.Ticker || row.ticker || row.TICKER || row.Symbol || row.symbol || row.SYMBOL;
          const weight = row.Weight || row.weight || row.WEIGHT || row.Allocation || row.allocation || row.ALLOCATION;
          const name = row.Name || row.name || row.NAME || "";

          if (!ticker) {
            errors.push(`Row ${index + 1}: Missing ticker`);
            return;
          }

          const weightNum = parseFloat(weight);
          if (isNaN(weightNum)) {
            errors.push(`Row ${index + 1}: Invalid weight for ${ticker}`);
            return;
          }

          holdings.push({
            symbol: String(ticker).toUpperCase().trim(),
            name: String(name).trim(),
            allocation: Math.min(100, Math.max(0, weightNum)),
          });
        });

        if (errors.length > 0) {
          setError(errors.slice(0, 3).join("; ") + (errors.length > 3 ? `... and ${errors.length - 3} more` : ""));
        }

        if (holdings.length > 0) {
          onUpload(holdings);
        } else if (errors.length === 0) {
          setError("No valid rows found in CSV. Expected columns: Ticker, Weight");
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-4 h-4 mr-2" />
        Import CSV
      </Button>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
