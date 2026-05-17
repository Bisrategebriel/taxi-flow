"use client";
// FR-RS-01, FR-RS-02, FR-RS-06, FR-RS-07
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
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
    for (const [id] of [[r.fromId], [r.toId]]) {
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
      <form action="/route-search/result" method="GET" className="space-y-3">
        <TerminalCombobox
          id="from"
          label="From"
          name="from"
          placeholder="Departure terminal…"
          terminals={terminals}
          recentTerminals={recentTerminals}
          value={fromId}
          onChange={setFromId}
        />

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap terminals"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border
              bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeftRight size={14} />
          </button>
        </div>

        <TerminalCombobox
          id="to"
          label="To"
          name="to"
          placeholder="Destination terminal…"
          terminals={terminals}
          recentTerminals={recentTerminals}
          value={toId}
          onChange={setToId}
        />

        <button
          type="submit"
          disabled={isDisabled}
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "w-full mt-2",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Search Routes
        </button>
      </form>

      {/* Recent searches */}
      {recents.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recents.slice(0, 3).map((r) => (
              <button
                key={r.ts}
                type="button"
                onClick={() => {
                  setFromId(r.fromId);
                  setToId(r.toId);
                }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs
                  text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                {r.fromName} → {r.toName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
