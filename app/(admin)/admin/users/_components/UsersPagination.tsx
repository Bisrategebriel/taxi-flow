"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PER_PAGE_OPTIONS = [10, 25, 50];

export default function UsersPagination({
  page,
  perPage,
  totalPages,
  totalCount,
}: {
  page: number;
  perPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function buildUrl(overrides: Record<string, string | number>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, val] of Object.entries(overrides)) {
      const s = String(val);
      if (s && s !== "all") params.set(key, s);
      else params.delete(key);
    }
    return `${pathname}?${params.toString()}`;
  }

  function goToPage(p: number) {
    router.push(buildUrl({ page: p, perPage }));
  }

  function setPerPage(n: number) {
    router.push(buildUrl({ page: 1, perPage: n }));
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3.5 flex-wrap">
      {/* Rows per page */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page</span>
        <div className="relative">
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="h-7 appearance-none rounded-md border border-border bg-background pl-2.5 pr-7 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Page info + nav */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          {from}–{to} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>

          <span className="min-w-[80px] text-center text-xs">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
