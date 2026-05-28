"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending" },
];

export default function UsersToolbar({ filteredCount }: { filteredCount: number }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchInput, setSearchInput] = useState(sp.get("search") ?? "");
  const currentStatus = sp.get("status") ?? "all";
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, val] of Object.entries(overrides)) {
      if (val && val !== "all") {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    }
    // reset to page 1 on search/filter change
    params.delete("page");
    return `${pathname}?${params.toString()}`;
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value, status: currentStatus }));
    }, 300);
  }

  function handleStatusChange(value: string) {
    router.push(buildUrl({ search: searchInput, status: value }));
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-60">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search users…"
          className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Status filter — shadcn-style select */}
      <div className="relative shrink-0">
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-border bg-background pl-3 pr-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      </div>

      <span className="text-xs text-muted-foreground px-2.5 py-1 rounded-md border border-border bg-muted/30 shrink-0 ml-auto">
        {filteredCount} result{filteredCount !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
