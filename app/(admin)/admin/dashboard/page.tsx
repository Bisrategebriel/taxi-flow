import { createServiceClient } from "@/lib/supabase/service";
import { Users, Car, DollarSign, Activity } from "lucide-react";

function tripRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `TFR${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

function statusClass(status: string) {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "completed":
    case "payment_pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalUsers },
    { count: tripsToday },
    { data: revenueData },
    { count: activeTrips },
    { data: recentTrips },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "user"),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("started_at", todayStart),
    supabase
      .from("payments")
      .select("amount")
      .eq("status", "succeeded")
      .gte("created_at", monthStart),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("trips")
      .select(
        `id, status, fare_amount, started_at,
         routes(name),
         profiles!trips_user_id_fkey(full_name)`
      )
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  const revenue = (revenueData ?? []).reduce(
    (sum, p) => sum + (p.amount ?? 0),
    0
  );

  const kpis = [
    {
      label: "Total Users",
      value: totalUsers ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Trips Today",
      value: tripsToday ?? 0,
      icon: Car,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "Revenue This Month",
      value: `ETB ${revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Active Trips",
      value: activeTrips ?? 0,
      icon: Activity,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
          >
            <div className={`rounded-lg p-2.5 ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Trips</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trip ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fare</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Started</th>
              </tr>
            </thead>
            <tbody>
              {(recentTrips ?? []).map((trip) => {
                const route = trip.routes as { name: string } | null;
                const profile = trip.profiles as unknown as { full_name: string | null } | null;
                return (
                  <tr key={trip.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium">{tripRef(trip.id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{route?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profile?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusClass(trip.status)}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {trip.fare_amount != null ? `ETB ${trip.fare_amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(trip.started_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {(recentTrips ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No trips yet.
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
