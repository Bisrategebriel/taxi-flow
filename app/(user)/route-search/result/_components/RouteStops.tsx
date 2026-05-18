import { Circle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stop {
  id: string;
  name: string;
}

interface Props {
  stops: Stop[];
}

function stopInstruction(stops: Stop[], index: number): string {
  if (index < stops.length - 1) {
    const next = stops[index + 1].name;
    return index === 0
      ? `Board taxi to ${next}`
      : `Transfer — board taxi to ${next}`;
  }
  return "Alight at destination";
}

function StopDot({ index, total }: { index: number; total: number }) {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  if (isFirst)
    return (
      <Circle
        size={24}
        className="shrink-0 text-primary"
        strokeWidth={2}
      />
    );

  if (isLast)
    return (
      <MapPin
        size={24}
        className="shrink-0 text-emerald-500"
        strokeWidth={2}
      />
    );

  // Circled number — index is 1-based for intermediates (stop 1 = "1", stop 2 = "2", …)
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/50 text-[10px] font-bold text-muted-foreground">
      {index}
    </span>
  );
}

export default function RouteStops({ stops }: Props) {
  if (stops.length < 2) return null;

  return (
    <div>
      {stops.map((stop, i) => (
        <div
          key={stop.id}
          className={cn("relative flex gap-3", i < stops.length - 1 && "pb-5")}
        >
          {/* Vertical connector — runs from bottom of icon (top-6 = 24px) to end of padding */}
          {i < stops.length - 1 && (
            <div className="absolute left-3 top-6 bottom-0 w-0.5 -translate-x-1/2 bg-border" />
          )}

          <StopDot index={i} total={stops.length} />

          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {stop.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {stopInstruction(stops, i)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
