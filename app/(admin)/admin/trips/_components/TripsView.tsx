"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  Eye,
  Navigation,
  ChevronDown,
  Clock,
  Check,
} from "lucide-react";
import { exportTrips } from "@/app/(admin)/admin/_actions/trips";
import type { TripRow, TripStats } from "../page";
import TripDetailModal from "./TripDetailModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function computeDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "Active",
      cls: "border border-blue-500/60 text-blue-400 bg-blue-500/10",
    },
    completed: {
      label: "Completed",
      cls: "border border-green-500/60 text-green-400 bg-green-500/10",
    },
    paid: {
      label: "Paid",
      cls: "border border-green-500/60 text-green-400 bg-green-500/10",
    },
    payment_pending: {
      label: "Pending",
      cls: "border border-amber-500/60 text-amber-400 bg-amber-500/10",
    },
    cancelled: {
      label: "Cancelled",
      cls: "border border-red-500/60 text-red-400 bg-red-500/10",
    },
  };
  const { label, cls } = map[status] ?? {
    label: status,
    cls: "border border-border text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── stat card ──────────────────────────────────────────────────────────────

function StatCard({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "blue" | "green" | "red";
}) {
  const iconBg = {
    blue: "bg-blue-500/10",
    green: "bg-green-500/10",
    red: "bg-red-500/10",
  }[color];
  const iconColor = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
  }[color];
  const numColor = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
  }[color];

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Navigation size={18} className={iconColor} />
      </div>
      <div>
        <p className={`text-2xl font-bold leading-none ${numColor}`}>{count}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── STATUSES ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "All Trips" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "paid", label: "Paid" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── custom shadcn-style select ───────────────────────────────────────────────

function StatusSelect({
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="text-muted-foreground text-xs">Filter:</span>
        <span className="font-medium">{selected.label}</span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-40 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
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

// ─── main component ──────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50, 100];

interface Props {
  rows: TripRow[];
  stats: TripStats;
  filters: { status?: string; from?: string; to?: string };
  pagination: { page: number; totalPages: number; count: number; pageSize: number };
}

export default function TripsView({ rows, stats, filters, pagination }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [localRows, setLocalRows] = useState<TripRow[]>(rows);
  const [selectedTrip, setSelectedTrip] = useState<TripRow | null>(null);
  const [exportPending, startExport] = useTransition();

  // Client-side search over the loaded page of rows
  const filtered = localRows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.displayId.toLowerCase().includes(q) ||
      (r.passengerName?.toLowerCase() ?? "").includes(q) ||
      (r.routeName?.toLowerCase() ?? "").includes(q) ||
      (r.startTerminalName?.toLowerCase() ?? "").includes(q) ||
      (r.endTerminalName?.toLowerCase() ?? "").includes(q)
    );
  });

  function pushFilter(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      pageSize: String(pagination.pageSize),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    router.push(`/admin/trips?${params.toString()}`);
  }

  function handleCancelled(tripId: string) {
    setLocalRows((prev) =>
      prev.map((r) => r.id === tripId ? { ...r, status: "cancelled" } : r)
    );
    setSelectedTrip((prev) =>
      prev?.id === tripId ? { ...prev, status: "cancelled" } : prev
    );
  }

  function handleEnded(tripId: string) {
    const now = new Date().toISOString();
    setLocalRows((prev) =>
      prev.map((r) => r.id === tripId ? { ...r, status: "completed", endedAt: now } : r)
    );
    setSelectedTrip((prev) =>
      prev?.id === tripId ? { ...prev, status: "completed", endedAt: now } : prev
    );
  }

  function handleExport() {
    startExport(async () => {
      const { csv } = await exportTrips({
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trips-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const pageUrl = (p: number, ps?: number) => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("pageSize", String(ps ?? pagination.pageSize));
    params.set("page", String(p));
    return `/admin/trips?${params.toString()}`;
  };

  return (
    <div className="p-6 space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.totalToday} total trips today
          </p>
        </div>
        {stats.activeCount > 0 && (
          <div className="flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            {stats.activeCount} live
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Now" count={stats.activeCount} color="blue" />
        <StatCard label="Completed Today" count={stats.completedCount} color="green" />
        <StatCard label="Cancelled Today" count={stats.cancelledCount} color="red" />
      </div>

      {/* ── Filter panel ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Main search + status + export row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search trips, users, routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Status dropdown */}
          <StatusSelect
            value={filters.status ?? ""}
            onChange={(v) => pushFilter({ status: v, page: "1" })}
          />

          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
            {search ? `${filtered.length} shown` : `${pagination.count} results`}
          </span>

          {/* Rows per page */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <span>Rows:</span>
            {PAGE_SIZES.map((s) => (
              <a
                key={s}
                href={pageUrl(1, s)}
                className={`flex h-7 w-9 items-center justify-center rounded-md border text-xs transition-colors ${
                  pagination.pageSize === s
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-muted"
                }`}
              >
                {s}
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={exportPending}
            className="flex items-center gap-1.5 h-9 rounded-lg border border-border bg-background px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <Download size={14} />
            {exportPending ? "Exporting…" : "Export"}
          </button>
        </div>

        {/* Secondary date filters (from existing UI) */}
        <form
          method="get"
          className="flex items-center gap-3 px-4 py-2.5 bg-muted/20 border-b border-border text-sm"
        >
          {filters.status && (
            <input type="hidden" name="status" value={filters.status} />
          )}
          <span className="text-xs text-muted-foreground">Date range:</span>
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            name="to"
            type="date"
            defaultValue={filters.to}
            className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            className="h-8 rounded-md border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Apply
          </button>
          {(filters.from || filters.to || filters.status) && (
            <a
              href="/admin/trips"
              className="h-8 flex items-center px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </a>
          )}
        </form>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Trip ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Passenger
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Route
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Fare
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Started
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((trip) => {
                const isActive = trip.status === "active";
                const from =
                  trip.startTerminalName ??
                  trip.routeName?.split("→")[0]?.trim() ??
                  "—";
                const to =
                  trip.endTerminalName ??
                  trip.routeName?.split("→")[1]?.trim() ??
                  "—";

                return (
                  <tr
                    key={trip.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* Trip ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <span className="font-mono font-medium text-sm">
                          {trip.displayId}
                        </span>
                      </div>
                    </td>

                    {/* Passenger */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                          <span className="text-[10px] font-medium text-foreground">
                            {(trip.passengerName ?? "?")[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-foreground text-sm">
                          {trip.passengerName ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="truncate text-muted-foreground max-w-[80px]">
                          {from}
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">→</span>
                        <span className="truncate font-medium max-w-[80px]">{to}</span>
                      </div>
                      {trip.distanceKm != null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {trip.distanceKm} km
                        </p>
                      )}
                    </td>

                    {/* Fare */}
                    <td className="px-4 py-3">
                      <span className="text-primary font-medium font-mono text-sm">
                        {trip.fareAmount != null
                          ? `ETB ${trip.fareAmount.toFixed(2)}`
                          : "—"}
                      </span>
                    </td>

                    {/* Started */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                        <Clock size={12} className="flex-shrink-0" />
                        {formatTime(trip.startedAt)}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="px-4 py-3 text-sm">
                      {trip.status === "cancelled"
                        ? <span className="text-muted-foreground">—</span>
                        : computeDuration(trip.startedAt, trip.endedAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={trip.status} />
                    </td>

                    {/* Eye */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedTrip(trip)}
                        title="View details"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground text-sm"
                  >
                    {search ? "No trips match your search." : "No trips found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <p className="text-muted-foreground text-xs">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <a
                  href={pageUrl(pagination.page - 1)}
                  className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center"
                >
                  Previous
                </a>
              )}
              {pagination.page < pagination.totalPages && (
                <a
                  href={pageUrl(pagination.page + 1)}
                  className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onCancelled={handleCancelled}
          onEnded={handleEnded}
        />
      )}
    </div>
  );
}
