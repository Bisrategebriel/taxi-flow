"use client";
// FR-RS-01, FR-RS-02, FR-RS-06, FR-RS-07
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, Route, History } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { useRecentSearches, type RecentSearch } from "@/hooks/useRecentSearches";
import TerminalCombobox from "@/app/(user)/route-search/_components/TerminalCombobox";
import { cn } from "@/lib/utils";

interface Terminal {
  id: string;
  name: string;
  city: string;
}

function deriveRecentTerminals(recents: RecentSearch[], terminals: Terminal[]): Terminal[] {
  const seen = new Set<string>();
  const result: Terminal[] = [];
  for (const r of recents) {
    for (const id of [r.fromId, r.toId]) {
      if (!seen.has(id)) {
        seen.add(id);
        const t = terminals.find((x) => x.id === id);
        if (t) result.push(t);
      }
    }
  }
  return result;
}

export default function RouteSearchForm({ terminals }: { terminals: Terminal[] }) {
  const searchParams = useSearchParams();
  const [fromId, setFromId] = useState(searchParams.get("from") ?? "");
  const [toId, setToId] = useState(searchParams.get("to") ?? "");
  const { getAll } = useRecentSearches();
  const [recents] = useState<RecentSearch[]>(() =>
    typeof window !== "undefined" ? getAll() : []
  );

  const recentTerminals = deriveRecentTerminals(recents, terminals);

  function handleSwap() {
    setFromId(toId);
    setToId(fromId);
  }

  const isDisabled = !fromId || !toId || fromId === toId;

  return (
    <div className="space-y-6">
      {/* Search form — plain div avoids Card's overflow-hidden clipping the dropdown */}
      <div className="rounded-2xl bg-card ring-1 ring-foreground/10 p-4">
        <form action="/route-search/result" method="GET">
          <div className="pb-3">
            <label
              htmlFor="from"
              className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              From
            </label>
            <TerminalCombobox
              id="from"
              name="from"
              placeholder="Starting terminal"
              terminals={terminals}
              recentTerminals={recentTerminals}
              value={fromId}
              onChange={setFromId}
            />
          </div>

          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap terminals"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border
                bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>

          <div className="pb-4">
            <label
              htmlFor="to"
              className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
            >
              To
            </label>
            <TerminalCombobox
              id="to"
              name="to"
              placeholder="Destination terminal"
              terminals={terminals}
              recentTerminals={recentTerminals}
              value={toId}
              onChange={setToId}
            />
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "w-full gap-2",
              isDisabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Search size={16} />
            Search Routes
          </button>
        </form>
      </div>

      {/* Recent searches — same card style as popular routes */}
      {recents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recent Searches</h2>
          </div>
          <div className="space-y-2">
            {recents.slice(0, 5).map((r) => (
              <button
                key={r.ts}
                type="button"
                onClick={() => {
                  setFromId(r.fromId);
                  setToId(r.toId);
                }}
                className="w-full text-left rounded-xl border border-border bg-card px-4 py-3
                  hover:border-primary/40 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Route size={13} className="text-primary" />
                  </div>
                  <p className="flex-1 min-w-0 text-sm font-semibold text-foreground leading-tight truncate">
                    {r.fromName} → {r.toName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
