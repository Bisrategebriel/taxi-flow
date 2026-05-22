import { createServiceClient } from "@/lib/supabase/service";

const PAGE_SIZE = 25;

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

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; page?: string }>;
}) {
  const { status, from, to, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const service = createServiceClient();

  let query = service
    .from("trips")
    .select(
      `id, status, fare_amount, started_at, ended_at,
       routes(name),
       profiles!trips_user_id_fkey(full_name)`,
      { count: "exact" }
    )
    .order("started_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status) query = query.eq("status", status);
  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const { data: trips, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const STATUSES = ["active", "completed", "payment_pending", "paid", "cancelled"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Trips</h1>
        <p className="text-sm text-muted-foreground mt-1">{count ?? 0} trips</p>
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <select
            name="status" defaultValue={status ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From date</label>
          <input
            name="from" type="date" defaultValue={from}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To date</label>
          <input
            name="to" type="date" defaultValue={to}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-md border border-border bg-background text-sm hover:bg-muted transition-colors"
        >
          Filter
        </button>
        {(status || from || to) && (
          <a
            href="/admin/trips"
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </a>
        )}
      </form>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trip ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fare</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Started</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ended</th>
              </tr>
            </thead>
            <tbody>
              {(trips ?? []).map((trip) => {
                const route = trip.routes as { name: string } | null;
                const profile = trip.profiles as unknown as { full_name: string | null } | null;
                return (
                  <tr key={trip.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-medium">{tripRef(trip.id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{profile?.full_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{route?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass(trip.status)}`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {trip.fare_amount != null ? `ETB ${trip.fare_amount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(trip.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {trip.ended_at ? new Date(trip.ended_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
              {(trips ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No trips found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/trips?${new URLSearchParams({ ...(status && { status }), ...(from && { from }), ...(to && { to }), page: String(page - 1) })}`}
                className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/trips?${new URLSearchParams({ ...(status && { status }), ...(from && { from }), ...(to && { to }), page: String(page + 1) })}`}
                className="px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted transition-colors"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
