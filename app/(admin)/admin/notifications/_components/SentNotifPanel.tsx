"use client";

import { useState, useRef, useEffect } from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  Tag,
  XCircle,
  BellRing,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type SentRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  target: string;
  sent_count: number;
  read_count: number;
  created_at: string;
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  info:        { icon: Info,          cls: "border-blue-500/60   text-blue-400   bg-blue-500/10",   label: "Info" },
  success:     { icon: CheckCircle2,  cls: "border-green-500/60  text-green-400  bg-green-500/10",  label: "Success" },
  warning:     { icon: AlertTriangle, cls: "border-amber-500/60  text-amber-400  bg-amber-500/10",  label: "Warning" },
  promotional: { icon: Tag,           cls: "border-purple-500/60 text-purple-400 bg-purple-500/10", label: "Promo" },
  decline:     { icon: XCircle,       cls: "border-red-500/60    text-red-400    bg-red-500/10",    label: "Decline" },
  alert:       { icon: BellRing,      cls: "border-orange-500/60 text-orange-400 bg-orange-500/10", label: "Alert" },
  reminder:    { icon: Clock,         cls: "border-cyan-500/60   text-cyan-400   bg-cyan-500/10",   label: "Reminder" },
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatTarget(target: string): string {
  if (target === "all") return "All users";
  if (target === "active") return "Active users";
  return "Specific user";
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 25];

export default function SentNotifPanel({
  rows,
  hasError,
}: {
  rows: SentRow[];
  hasError: boolean;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sliced = rows.slice((page - 1) * pageSize, page * pageSize);

  function handlePageSize(n: number) {
    setPageSize(n);
    setPage(1);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">Sent Notifications</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rows:</span>
            <PageSizeDropdown value={pageSize} onChange={handlePageSize} options={PAGE_SIZE_OPTIONS} />
          </div>
          <span className="text-xs text-muted-foreground">{total} total</span>
        </div>
      </div>

      <div className="divide-y divide-border flex-1">
        {total === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            {hasError
              ? "Run the latest migration to enable notifications."
              : "No notifications sent yet."}
          </p>
        ) : (
          sliced.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG["info"];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className="flex items-start gap-3.5 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border mt-0.5 ${cfg.cls}`}
                >
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{timeAgo(n.created_at)}</span>
                    <span>·</span>
                    <span>{n.sent_count} reached</span>
                    <span>·</span>
                    <span>{n.read_count} read</span>
                    <span>·</span>
                    <span>{formatTarget(n.target)}</span>
                  </div>
                </div>
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
