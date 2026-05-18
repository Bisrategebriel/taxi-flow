import { Play, Circle, MapPin } from "lucide-react";
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
        <Play size={12} className="translate-x-px text-primary-foreground" fill="currentColor" />
      </span>
    );

  if (isLast)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <MapPin size={13} className="text-white" fill="currentColor" strokeWidth={0} />
      </span>
    );

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500">
      <Circle size={8} className="text-white" fill="currentColor" strokeWidth={0} />
    </span>
  );
}

export default function RouteStops({ stops }: Props) {
  if (stops.length < 2) return null;

  return (
    <div className="space-y-0">
      {stops.map((stop, i) => (
        <div key={stop.id} className={cn("relative flex gap-3", i < stops.length - 1 && "pb-5")}>
          {/* Vertical connector line */}
          {i < stops.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-[2px] -translate-x-1/2 bg-border" />
          )}

          <StopDot index={i} total={stops.length} />

          <div className="pt-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{stop.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stopInstruction(stops, i)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
