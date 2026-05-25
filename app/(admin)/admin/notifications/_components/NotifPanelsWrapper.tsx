"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, X, ChevronDown } from "lucide-react";
import SentNotifPanel, { type SentRow } from "./SentNotifPanel";
import ActivityFeedPanel, { type FeedItem } from "./ActivityFeedPanel";

const NOTIF_TYPES = [
  { value: "info",        label: "Info" },
  { value: "success",     label: "Success" },
  { value: "warning",     label: "Warning" },
  { value: "promotional", label: "Promotional" },
  { value: "decline",     label: "Decline" },
  { value: "alert",       label: "Alert" },
  { value: "reminder",    label: "Reminder" },
];

export default function NotifPanelsWrapper({
  sentRows,
  feed,
  hasError,
}: {
  sentRows: SentRow[];
  feed: FeedItem[];
  hasError: boolean;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [notifType, setNotifType] = useState("");

  const hasFilters = dateFrom || dateTo || notifType;

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setNotifType("");
  }

  const filteredSent = sentRows.filter((n) => {
    if (notifType && n.type !== notifType) return false;
    const date = n.created_at.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  });

  const filteredFeed = feed.filter((item) => {
    const date = item.timestamp.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2.5 flex-wrap rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Filter size={12} />
          <span className="font-medium">Filter</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Date from */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Date to */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Notification type — applies to Sent panel */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Type</span>
          <TypeDropdown
            value={notifType}
            onChange={setNotifType}
          />
          {notifType && (
            <span className="text-[10px] text-muted-foreground">(sent only)</span>
          )}
        </div>

        {/* Clear */}
        {hasFilters && (
          <>
            <div className="w-px h-4 bg-border shrink-0" />
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 h-8 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X size={11} />
              Clear
            </button>
          </>
        )}
      </div>

      {/* ── Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SentNotifPanel rows={filteredSent} hasError={hasError} />
        <ActivityFeedPanel feed={filteredFeed} />
      </div>
    </div>
  );
}

// ── Type dropdown ──────────────────────────────────────────────────────────────

function TypeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
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

  const selected = NOTIF_TYPES.find((t) => t.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 h-8 rounded-lg border px-3 text-xs transition-colors ${
          value
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        <span>{selected?.label ?? "All types"}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 min-w-[140px] rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
              !value ? "text-primary font-medium" : "text-foreground"
            }`}
          >
            All types
          </button>
          {NOTIF_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => { onChange(t.value); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-accent ${
                value === t.value ? "text-primary font-medium" : "text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
