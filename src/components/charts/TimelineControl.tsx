import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TimelineControlProps {
  data: Array<{ date: string; [key: string]: any }>;
  onRangeChange: (startIndex: number, endIndex: number) => void;
  className?: string;
}

export function TimelineControl({ data, onRangeChange, className }: TimelineControlProps) {
  const [leftHandle, setLeftHandle] = useState(0);
  const [rightHandle, setRightHandle] = useState(100);
  const [isDragging, setIsDragging] = useState<"left" | "right" | "range" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; left: number; right: number }>({ x: 0, left: 0, right: 0 });

  const getPositionFromEvent = useCallback((clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const position = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, position));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle: "left" | "right" | "range") => {
    e.preventDefault();
    setIsDragging(handle);
    dragStartRef.current = { x: e.clientX, left: leftHandle, right: rightHandle };
  }, [leftHandle, rightHandle]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const position = getPositionFromEvent(e.clientX);

    if (isDragging === "left") {
      const newLeft = Math.min(position, rightHandle - 5);
      setLeftHandle(newLeft);
    } else if (isDragging === "right") {
      const newRight = Math.max(position, leftHandle + 5);
      setRightHandle(newRight);
    } else if (isDragging === "range") {
      const delta = ((e.clientX - dragStartRef.current.x) / (trackRef.current?.clientWidth || 1)) * 100;
      const rangeWidth = dragStartRef.current.right - dragStartRef.current.left;
      let newLeft = dragStartRef.current.left + delta;
      let newRight = dragStartRef.current.right + delta;
      
      if (newLeft < 0) {
        newLeft = 0;
        newRight = rangeWidth;
      }
      if (newRight > 100) {
        newRight = 100;
        newLeft = 100 - rangeWidth;
      }
      
      setLeftHandle(newLeft);
      setRightHandle(newRight);
    }
  }, [isDragging, leftHandle, rightHandle, getPositionFromEvent]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const startIndex = Math.floor((leftHandle / 100) * (data.length - 1));
    const endIndex = Math.floor((rightHandle / 100) * (data.length - 1));
    onRangeChange(startIndex, endIndex);
  }, [leftHandle, rightHandle, data.length, onRangeChange]);

  const startDate = data[Math.floor((leftHandle / 100) * (data.length - 1))]?.date || "";
  const endDate = data[Math.floor((rightHandle / 100) * (data.length - 1))]?.date || "";

  return (
    <div className={cn("mt-2", className)}>
      {/* Date display */}
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono mb-1">
        <span>{startDate}</span>
        <span>{endDate}</span>
      </div>
      
      {/* Timeline track */}
      <div 
        ref={trackRef}
        className="relative h-6 bg-muted/50 rounded cursor-pointer"
      >
        {/* Selected range */}
        <div
          className="absolute h-full bg-primary/20 border-x border-primary/40 cursor-grab active:cursor-grabbing"
          style={{ left: `${leftHandle}%`, right: `${100 - rightHandle}%` }}
          onMouseDown={(e) => handleMouseDown(e, "range")}
        />
        
        {/* Left handle */}
        <div
          className="absolute top-0 h-full w-2 bg-primary rounded-l cursor-ew-resize hover:bg-primary/80 transition-colors"
          style={{ left: `${leftHandle}%`, transform: "translateX(-100%)" }}
          onMouseDown={(e) => handleMouseDown(e, "left")}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-primary-foreground/50 rounded" />
        </div>
        
        {/* Right handle */}
        <div
          className="absolute top-0 h-full w-2 bg-primary rounded-r cursor-ew-resize hover:bg-primary/80 transition-colors"
          style={{ left: `${rightHandle}%` }}
          onMouseDown={(e) => handleMouseDown(e, "right")}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-primary-foreground/50 rounded" />
        </div>
        
        {/* Mini chart preview */}
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const values = Object.values(d).filter((v): v is number => typeof v === "number");
              const y = values.length > 0 ? 100 - ((values[0] / Math.max(...data.flatMap(item => Object.values(item).filter((v): v is number => typeof v === "number")))) * 100) : 50;
              return `${x}%,${Math.max(10, Math.min(90, y))}%`;
            }).join(" ")}
          />
        </svg>
      </div>
      
      {/* Quick range buttons */}
      <div className="flex gap-1 mt-2">
        {[
          { label: "1M", range: [90, 100] },
          { label: "3M", range: [75, 100] },
          { label: "6M", range: [50, 100] },
          { label: "1Y", range: [0, 100] },
          { label: "YTD", range: [85, 100] },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              setLeftHandle(preset.range[0]);
              setRightHandle(preset.range[1]);
            }}
            className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
