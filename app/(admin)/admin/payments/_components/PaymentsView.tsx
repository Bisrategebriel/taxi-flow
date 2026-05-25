"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  TrendingUp,
  CheckCircle2,
  XCircle,
  CreditCard,
  Smartphone,
  Banknote,
  ChevronDown,
  Check,
} from "lucide-react";
import { exportPayments } from "@/app/(admin)/admin/_actions/payments";
import RevenueChart from "@/app/(admin)/admin/dashboard/_components/RevenueChart";
import type { MonthlyDataPoint } from "@/app/(admin)/admin/dashboard/_components/RevenueChart";
import type { PaymentRow, PaymentStats } from "../page";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    succeeded: {
      label: "Success",
      cls: "border border-green-500/60 text-green-400 bg-green-500/10",
    },
    failed: {
      label: "Failed",
      cls: "border border-red-500/60 text-red-400 bg-red-500/10",
    },
    cancelled: {
      label: "Refunded",
      cls: "border border-amber-500/60 text-amber-400 bg-amber-500/10",
    },
    waived: {
      label: "Waived",
      cls: "border border-amber-500/60 text-amber-400 bg-amber-500/10",
    },
    pending: {
      label: "Pending",
      cls: "border border-border text-muted-foreground",
    },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "border border-border text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── method display ───────────────────────────────────────────────────────────

function MethodCell({ method }: { method: string }) {
  if (method === "card")
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CreditCard size={13} className="shrink-0" /> Card
      </span>
    );
  if (method === "mobile_money")
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Smartphone size={13} className="shrink-0" /> Mobile
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Banknote size={13} className="shrink-0" /> Cash
    </span>
  );
}

// ─── stat cards ───────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
};

function StatCard({ label, value, icon, iconBg }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1.5">{label}</p>
      </div>
    </div>
  );
}

// ─── custom shadcn-style select ───────────────────────────────────────────────

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring whitespace-nowrap"
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-40 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                {opt.label}
                {opt.value === value && <Check size={13} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── filter option sets ───────────────────────────────────────────────────────

const METHOD_OPTIONS = [
  { value: "", label: "All Methods" },
  { value: "card", label: "Card" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "succeeded", label: "Succeeded" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "waived", label: "Waived" },
];

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  rows: PaymentRow[];
  stats: PaymentStats;
  chartData: MonthlyDataPoint[];
  filters: { method?: string; status?: string; from?: string; to?: string };
}

export default function PaymentsView({ rows, stats, chartData, filters }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [exportPending, startExport] = useTransition();

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.displayId.toLowerCase().includes(q) ||
      (r.tripDisplayId?.toLowerCase() ?? "").includes(q) ||
      (r.userName?.toLowerCase() ?? "").includes(q) ||
      r.reference.toLowerCase().includes(q)
    );
  });

  function pushFilter(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      ...(filters.method ? { method: filters.method } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    router.push(`/admin/payments?${params.toString()}`);
  }

  function handleExport() {
    startExport(async () => {
      const { csv } = await exportPayments({
        method: filters.method,
        status: filters.status,
        from: filters.from,
        to: filters.to,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue and transaction history</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportPending}
          className="flex items-center gap-2 h-9 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 transition-colors"
        >
          <Download size={14} />
          {exportPending ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {/* ── Row 1: Revenue Today | Completed Today | Failed Today ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Revenue Today"
          value={`ETB ${stats.revenueToday.toFixed(2)}`}
          icon={<TrendingUp size={18} className="text-green-400" />}
          iconBg="bg-green-500/10"
        />
        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={<CheckCircle2 size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Failed Today"
          value={stats.failedToday}
          icon={<XCircle size={18} className="text-red-400" />}
          iconBg="bg-red-500/10"
        />
      </div>

      {/* ── Row 2: Card | Mobile Money | Cash ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Card Payments"
          value={stats.cardToday}
          icon={<CreditCard size={18} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Mobile Money"
          value={stats.mobileToday}
          icon={<Smartphone size={18} className="text-purple-400" />}
          iconBg="bg-purple-500/10"
        />
        <StatCard
          label="Cash Payments"
          value={stats.cashToday}
          icon={<Banknote size={18} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
      </div>

      {/* ── Revenue chart ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold mb-4">Revenue — Last 7 Days</p>
        <div className="h-52 text-primary">
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* ── Transactions table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Date range */}
          <input
            type="date"
            defaultValue={filters.from}
            onChange={(e) => pushFilter({ from: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <input
            type="date"
            defaultValue={filters.to}
            onChange={(e) => pushFilter({ to: e.target.value })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Method dropdown */}
          <FilterSelect
            value={filters.method ?? ""}
            onChange={(v) => pushFilter({ method: v })}
            options={METHOD_OPTIONS}
          />

          {/* Status dropdown */}
          <FilterSelect
            value={filters.status ?? ""}
            onChange={(v) => pushFilter({ status: v })}
            options={STATUS_OPTIONS}
          />

          {/* Count badge */}
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
            {search ? `${filtered.length} shown` : `${rows.length} transactions`}
          </span>

          {/* Clear filters link */}
          {(filters.method || filters.status || filters.from || filters.to) && (
            <a
              href="/admin/payments"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Clear filters
            </a>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trip</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-sm">{p.displayId}</td>
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                    {p.tripDisplayId ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.userName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-primary font-medium font-mono">
                      ETB {p.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <MethodCell method={p.paymentMethod} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.reference}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatTime(p.paidAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    {search ? "No transactions match your search." : "No payments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
