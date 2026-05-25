"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

export default function UsersToolbar({ filteredCount }: { filteredCount: number }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(sp.get("search") ?? "");
  const currentStatus = sp.get("status") ?? "all";

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, val] of Object.entries(overrides)) {
      if (val && val !== "all") {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-60">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              router.push(buildUrl({ search: searchInput, status: currentStatus }));
            }
          }}
          placeholder="Search users…"
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <SlidersHorizontal size={14} className="text-muted-foreground" />
        <select
          value={currentStatus}
          onChange={(e) =>
            router.push(buildUrl({ search: searchInput, status: e.target.value }))
          }
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-md border border-border bg-muted/30 shrink-0 ml-auto">
        {filteredCount} result{filteredCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
