import { cn } from "@/lib/utils";

interface Segment {
  fromName: string;
  toName: string;
  amount: number | string | null;
  currency: string | null;
}

interface Props {
  segments: Segment[];
}

function toSymbol(code: string | null): string {
  if (!code) return "";
  const map: Record<string, string> = { GHS: "₵", GHC: "₵", USD: "$", EUR: "€", GBP: "£" };
  return map[code] ?? code;
}

export default function FareBreakdown({ segments }: Props) {
  if (segments.length === 0) return null;

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center justify-between gap-3 py-2.5",
            i < segments.length - 1 && "border-b border-border"
          )}
        >
          <span className="text-sm text-muted-foreground truncate">
            {seg.fromName} → {seg.toName}
          </span>
          <span className="shrink-0 text-sm font-semibold text-foreground">
            {seg.amount != null
              ? `${toSymbol(seg.currency)} ${Number(seg.amount).toFixed(2)}`
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
