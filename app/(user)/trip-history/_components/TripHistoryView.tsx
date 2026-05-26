"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Navigation,
  Clock,
  ChevronDown,
  Check,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Banknote,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

export interface TripItem {
  id: string;
  displayId: string;
  fromName: string | null;
  toName: string | null;
  routeName: string | null;
  distanceKm: number | null;
  fareAmount: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationMin: number | null;
}

export interface TripHistorySummary {
  total: number;
  distanceKm: number;
  spent: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Trips" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paid", label: "Paid" },
  { value: "payment_pending", label: "Pending Payment" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active:          { label: "Active",   cls: "border border-blue-500/60 text-blue-400 bg-blue-500/10" },
  completed:       { label: "Completed",cls: "border border-green-500/60 text-green-400 bg-green-500/10" },
  paid:            { label: "Paid",     cls: "border border-emerald-500/60 text-emerald-400 bg-emerald-500/10" },
  payment_pending: { label: "Pending",  cls: "border border-amber-500/60 text-amber-400 bg-amber-500/10" },
  cancelled:       { label: "Cancelled",cls: "border border-red-500/60 text-red-400 bg-red-500/10" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── status filter dropdown ───────────────────────────────────────────────────

function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = STATUS_OPTIONS.find((o) => o.value === value) ?? STATUS_OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="text-muted-foreground text-xs">Status:</span>
        <span className="font-medium">{selected.label}</span>
        <ChevronDown
          size={13}
          className={cn(
            "text-muted-foreground transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-44 rounded-xl border border-border bg-popover shadow-lg">
          <div className="p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                {opt.label}
                {opt.value === value && (
                  <Check size={13} className="text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── summary stat chip ────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-1">
      <Icon size={18} strokeWidth={1.75} className={iconColor} />
      <p className="text-base font-bold text-foreground leading-none">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  trips: TripItem[];
  summary: TripHistorySummary;
  filters: { status?: string };
  pagination: { page: number; totalPages: number; count: number };
}

export default function TripHistoryView({ trips, summary, filters, pagination }: Props) {
  const router = useRouter();

  function pushFilter(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      ...(filters.status ? { status: filters.status } : {}),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    const qs = params.toString();
    router.push(`/trip-history${qs ? `?${qs}` : ""}`);
  }

  const pageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(p));
    return `/trip-history?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-5 pb-8 max-w-lg mx-auto w-full md:max-w-none md:px-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={16} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Trip History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.total} trip{summary.total !== 1 ? "s" : ""} total
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={TrendingUp}
          label="Trips"
          value={String(summary.total)}
          iconColor="text-emerald-500"
        />
        <SummaryCard
          icon={Navigation}
          label="Distance"
          value={`${summary.distanceKm.toFixed(1)} km`}
          iconColor="text-cyan-500"
        />
        <SummaryCard
          icon={Banknote}
          label="Spent"
          value={`ETB ${summary.spent.toFixed(0)}`}
          iconColor="text-yellow-500"
        />
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filters.status
            ? `Showing ${STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? filters.status}`
            : "All trips"}
        </p>
        <StatusFilter
          value={filters.status ?? ""}
          onChange={(v) => pushFilter({ status: v, page: "1" })}
        />
      </div>

      {/* Trip list */}
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Navigation size={20} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No trips found</p>
          <p className="text-sm text-muted-foreground">
            {filters.status
              ? "Try a different status filter."
              : "Your completed trips will appear here."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {trips.map((trip) => {
            const badge = STATUS_STYLE[trip.status] ?? {
              label: trip.status,
              cls: "border border-border text-muted-foreground",
            };

            return (
              <div key={trip.id} className="p-4 hover:bg-muted/30 transition-colors">
                {/* Top row: ID + status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Navigation size={13} className="text-muted-foreground" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {trip.displayId}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                      badge.cls
                    )}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Route */}
                {(trip.fromName || trip.toName || trip.routeName) && (
                  <div className="flex items-center gap-1.5 text-sm mb-1.5">
                    {trip.fromName && trip.toName ? (
                      <>
                        <MapPin size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate font-medium text-foreground">
                          {trip.fromName}
                        </span>
                        <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground">{trip.toName}</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={12} className="text-muted-foreground shrink-0" />
                        <span className="truncate text-foreground">{trip.routeName}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Meta row: date, duration, fare, distance */}
                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="shrink-0" />
                    {formatDate(trip.startedAt)} · {formatTime(trip.startedAt)}
                  </span>

                  {trip.durationMin != null && (
                    <span>{trip.durationMin}m</span>
                  )}

                  {trip.distanceKm != null && (
                    <span>{trip.distanceKm} km</span>
                  )}

                  {trip.fareAmount != null && (
                    <span className="text-primary font-semibold ml-auto">
                      ETB {trip.fareAmount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <a
                href={pageUrl(pagination.page - 1)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft size={13} />
                Previous
              </a>
            )}
            {pagination.page < pagination.totalPages && (
              <a
                href={pageUrl(pagination.page + 1)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Next
                <ArrowRight size={13} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
