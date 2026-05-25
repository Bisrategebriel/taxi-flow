import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  Users,
  Car,
  MapPin,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Activity,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import RevenueChart, { type MonthlyDataPoint } from "./_components/RevenueChart";
import GreetingMessage from "./_components/GreetingMessage";
import WeeklyTripsChart, { type DailyDataPoint } from "./_components/WeeklyTripsChart";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function tripRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `TFR${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

function fmtPct(current: number, prev: number) {
  if (prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  return { value: Math.abs(pct).toFixed(1), positive: pct >= 0 };
}

function fmtAbs(diff: number) {
  if (diff === 0) return null;
  return { value: Math.abs(diff).toString(), positive: diff >= 0 };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─── page ────────────────────────────────────────────────────────────────── */

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const service = createServiceClient();
  const now = new Date();

  const { data: adminProfile } = user
    ? await service.from("profiles").select("full_name").eq("id", user.id).single()
    : { data: null };

  // time boundaries
  const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo      = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo  = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [
    // KPI: users
    { count: totalUsers },
    { count: usersThisWeek },
    { count: usersLastWeek },
    // KPI: active trips
    { count: activeTrips },
    // KPI: terminals
    { count: totalTerminals },
    { count: terminalsThisWeek },
    // KPI: revenue today
    { data: todayRevData },
    { data: yesterdayRevData },
    // Charts: monthly revenue (6 months)
    { data: monthlyRevRaw },
    // Charts: weekly trips (7 days)
    { data: weeklyTripsRaw },
    // Recent activity
    { data: recentTrips },
    { data: recentPayments },
    { data: recentUsers },
  ] = await Promise.all([
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", weekAgo),
    service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user").gte("created_at", twoWeeksAgo).lt("created_at", weekAgo),
    service.from("trips").select("id", { count: "exact", head: true }).eq("status", "active"),
    service.from("terminals").select("id", { count: "exact", head: true }),
    service.from("terminals").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    service.from("payments").select("amount").eq("status", "succeeded").gte("created_at", todayStart),
    service.from("payments").select("amount").eq("status", "succeeded").gte("created_at", new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()).lt("created_at", todayStart),
    service.from("payments").select("amount, created_at").eq("status", "succeeded").gte("created_at", sixMonthsAgo),
    service.from("trips").select("id, started_at").gte("started_at", weekAgo),
    service.from("trips").select("id, status, started_at, routes(name)").order("started_at", { ascending: false }).limit(4),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any).select("id, amount, payment_method, created_at, trips!payments_trip_id_fkey(id)").order("created_at", { ascending: false }).limit(3),
    service.from("profiles").select("id, full_name, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(3),
  ]);

  /* ── KPI derived values ──────────────────────────────────────────────────── */
  const revenueToday = (todayRevData ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
  const revenueYesterday = (yesterdayRevData ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);

  const userTrend     = fmtPct(usersThisWeek ?? 0, usersLastWeek ?? 0);
  const terminalTrend = fmtAbs((terminalsThisWeek ?? 0));
  const revenueTrend  = fmtPct(revenueToday, revenueYesterday);

  /* ── Monthly revenue chart data ──────────────────────────────────────────── */
  const monthBuckets: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets[`${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`] = 0;
  }
  for (const p of monthlyRevRaw ?? []) {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (key in monthBuckets) monthBuckets[key] += p.amount ?? 0;
  }
  const revenueChartData: MonthlyDataPoint[] = Object.entries(monthBuckets).map(
    ([key, amount]) => {
      const [, monthIdx] = key.split("-");
      return { label: MONTH_NAMES[parseInt(monthIdx, 10)], amount };
    }
  );

  /* ── Weekly trips chart data ─────────────────────────────────────────────── */
  const dayBuckets: number[] = Array(7).fill(0);
  for (const t of weeklyTripsRaw ?? []) {
    const dayOfWeek = new Date(t.started_at).getDay();
    dayBuckets[dayOfWeek]++;
  }
  const tripsChartData: DailyDataPoint[] = DAY_NAMES.map((label, i) => ({
    label,
    count: dayBuckets[i],
  }));

  /* ── Recent activity ─────────────────────────────────────────────────────── */
  type ActivityItem = {
    id: string;
    type: "trip" | "payment" | "user";
    label: string;
    time: Date;
    badge: "info" | "success" | "error";
  };

  const activities: ActivityItem[] = [];

  for (const t of recentTrips ?? []) {
    const route = t.routes as { name: string } | null;
    const badge =
      t.status === "paid" ? "success"
      : t.status === "cancelled" ? "error"
      : "info";
    activities.push({
      id: t.id,
      type: "trip",
      label: `Trip started${route ? `: ${route.name}` : ""} · ${tripRef(t.id)}`,
      time: new Date(t.started_at),
      badge,
    });
  }

  for (const p of recentPayments ?? []) {
    const tripRow = p.trips as { id: string } | null;
    const method: string = p.payment_method ?? "card";
    activities.push({
      id: p.id,
      type: "payment",
      label: `Payment received · ETB ${Number(p.amount).toFixed(2)} via ${method}${tripRow ? ` · ${tripRef(tripRow.id)}` : ""}`,
      time: new Date(p.created_at),
      badge: "success",
    });
  }

  for (const u of recentUsers ?? []) {
    activities.push({
      id: u.id,
      type: "user",
      label: `New user registered: ${u.full_name ?? "Unknown"}`,
      time: new Date(u.created_at),
      badge: "info",
    });
  }

  activities.sort((a, b) => b.time.getTime() - a.time.getTime());
  const topActivities = activities.slice(0, 6);

  function timeAgo(date: Date) {
    const s = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  /* ── KPI cards config ────────────────────────────────────────────────────── */
  const kpis = [
    {
      label: "Total Users",
      value: (totalUsers ?? 0).toLocaleString(),
      icon: Users,
      trend: userTrend,
      trendLabel: "vs last week",
    },
    {
      label: "Active Trips",
      value: (activeTrips ?? 0).toLocaleString(),
      icon: Car,
      trend: null,
      trendLabel: "live now",
    },
    {
      label: "Terminals",
      value: (totalTerminals ?? 0).toLocaleString(),
      icon: MapPin,
      trend: terminalTrend ? { value: `+${terminalTrend.value}`, positive: true } : null,
      trendLabel: "added this week",
    },
    {
      label: "Revenue Today",
      value: `ETB ${revenueToday.toFixed(0)}`,
      icon: CreditCard,
      trend: revenueTrend,
      trendLabel: "vs yesterday",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Greeting + subtitle */}
      <div className="space-y-0.5">
        <GreetingMessage name={adminProfile?.full_name ?? null} />
        <h1 className="text-xl font-semibold my-3">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform performance at a glance</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, trend, trendLabel }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <div className="rounded-lg p-2 bg-primary/10">
                <Icon size={17} className="text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <div className="flex items-center gap-1.5 text-xs">
              {trend ? (
                <>
                  {trend.positive ? (
                    <TrendingUp size={13} className="text-green-500" />
                  ) : (
                    <TrendingDown size={13} className="text-destructive" />
                  )}
                  <span className={trend.positive ? "text-green-500 font-medium" : "text-destructive font-medium"}>
                    {trend.positive ? "+" : "-"}{trend.value}%
                  </span>
                </>
              ) : (
                <Activity size={13} className="text-muted-foreground" />
              )}
              <span className="text-muted-foreground">{trendLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Monthly Revenue</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 6 months (ETB)</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
              ETB {revenueChartData.reduce((s, d) => s + d.amount, 0).toFixed(0)}
            </span>
          </div>
          <div className="h-56 w-full block text-primary">
            <RevenueChart data={revenueChartData} />
          </div>
        </div>

        {/* Weekly Trips */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Trips This Week</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
              {tripsChartData.reduce((s, d) => s + d.count, 0)} total
            </span>
          </div>
          <div className="h-56 w-full block text-primary">
            <WeeklyTripsChart data={tripsChartData} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Activity size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Recent Activity</h2>
        </div>
        <div className="divide-y divide-border">
          {topActivities.map((item) => {
            const Icon =
              item.type === "trip"    ? Car
              : item.type === "user" ? UserPlus
              : CreditCard;

            const badgeClass =
              item.badge === "success"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : item.badge === "error"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

            const BadgeIcon =
              item.badge === "success" ? CheckCircle2
              : item.badge === "error" ? AlertCircle
              : Info;

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Icon size={15} className="text-primary" />
                </div>
                <p className="flex-1 text-sm text-foreground">{item.label}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{timeAgo(item.time)}</span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                    <BadgeIcon size={11} />
                    {item.badge}
                  </span>
                </div>
              </div>
            );
          })}
          {topActivities.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
