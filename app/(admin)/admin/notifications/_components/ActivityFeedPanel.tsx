"use client";

import { useState, useRef, useEffect } from "react";
import { Car, CreditCard, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

export type FeedItem = {
  id: string;
  message: string;
  timestamp: string;
  iconType: "Car" | "CreditCard" | "UserPlus";
  badgeCls: string;
  badgeLabel: string;
};

const ICON_MAP = { Car, CreditCard, UserPlus } as const;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 25];

export default function ActivityFeedPanel({ feed }: { feed: FeedItem[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = feed.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sliced = feed.slice((page - 1) * pageSize, page * pageSize);

  function handlePageSize(n: number) {
    setPageSize(n);
    setPage(1);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">Platform Activity</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows:</span>
            <PageSizeDropdown value={pageSize} onChange={handlePageSize} options={PAGE_SIZE_OPTIONS} />
          </div>
          <span className="text-xs text-muted-foreground">{total} events</span>
        </div>
      </div>

      <div className="divide-y divide-border flex-1">
        {sliced.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No platform events yet.
          </p>
        ) : (
          sliced.map((item) => {
            const Icon = ICON_MAP[item.iconType];
            return (
              <div
                key={item.id}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.timestamp)}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${item.badgeCls}`}
                >
                  {item.badgeLabel}
                </span>
              </div>
            );
          })
        )}
      </div>

      {total > 0 && (
        <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-3 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageSizeDropdown({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (n: number) => void;
  options: number[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 h-6 rounded border border-border bg-background px-2 text-xs text-foreground hover:bg-accent transition-colors"
      >
        {value}
        <ChevronRight size={10} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-[56px] rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                o === value ? "text-primary font-medium" : "text-foreground"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
