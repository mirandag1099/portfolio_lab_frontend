import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export interface Holding {
  symbol: string;
  name: string;
  allocation: number;
}

interface HoldingRowProps {
  index: number;
  holding: Holding;
  onUpdate: (index: number, field: keyof Holding, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors?: {
    symbol?: string;
    name?: string;
    allocation?: string;
    duplicate?: boolean;
  };
}

export function HoldingRow({
  index,
  holding,
  onUpdate,
  onRemove,
  canRemove,
  errors,
}: HoldingRowProps) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-8 text-muted-foreground text-sm pt-2.5">{index + 1}.</span>
      <div className="flex-1 flex items-start gap-4">
        <div className="w-28">
          <Input
            placeholder="TICKER"
            value={holding.symbol}
            onChange={(e) => onUpdate(index, "symbol", e.target.value.toUpperCase())}
            className={`uppercase font-mono ${errors?.symbol || errors?.duplicate ? "border-destructive" : ""}`}
          />
          {errors?.symbol && (
            <p className="text-xs text-destructive mt-1">{errors.symbol}</p>
          )}
          {errors?.duplicate && (
            <p className="text-xs text-destructive mt-1">Duplicate ticker</p>
          )}
        </div>
        <div className="flex-1">
          <Input
            placeholder="Name (optional)"
            value={holding.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            className={errors?.name ? "border-destructive" : ""}
          />
        </div>
        <div className="flex items-start gap-2">
          <div className="w-24">
            <Input
              type="number"
              min={0}
              max={100}
              value={holding.allocation}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdate(index, "allocation", isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
              }}
              className={errors?.allocation ? "border-destructive" : ""}
            />
            {errors?.allocation && (
              <p className="text-xs text-destructive mt-1">{errors.allocation}</p>
            )}
          </div>
          <span className="text-muted-foreground pt-2">%</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="mt-0.5"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
