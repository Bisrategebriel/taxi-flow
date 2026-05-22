import { createServiceClient } from "@/lib/supabase/service";

function tripRef(id: string) {
  const hex = id.replace(/-/g, "").slice(-4);
  return `TFR${(parseInt(hex, 16) % 10000).toString().padStart(4, "0")}`;
}

function methodClass(method: string) {
  switch (method) {
    case "card":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "cash":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "mobile_money":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; from?: string; to?: string }>;
}) {
  const { method, from, to } = await searchParams;

  const service = createServiceClient();

  // payment_method and paid_at were added in Phase 7 migration — cast as any to bypass stale types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (service.from("payments") as any)
    .select(
      `id, amount, currency, status, stripe_payment_intent_id, created_at,
       payment_method, paid_at,
       trips!payments_trip_id_fkey(id),
       profiles!payments_user_id_fkey(full_name)`
    )
    .order("created_at", { ascending: false });

  if (method) query = query.eq("payment_method", method);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data: payments } = await query;

  const METHODS = ["card", "cash", "mobile_money"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">{payments?.length ?? 0} payments</p>
      </div>

      <form method="get" className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Method</label>
          <select
            name="method" defaultValue={method ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All methods</option>
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
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
        {(method || from || to) && (
          <a
            href="/admin/payments"
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
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Method</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stripe PI</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid at</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((payment: {
                id: string;
                amount: number;
                currency: string;
                status: string;
                stripe_payment_intent_id: string | null;
                created_at: string;
                payment_method: string;
                paid_at: string | null;
                trips: { id: string } | null;
                profiles: { full_name: string | null } | null;
              }) => (
                <tr key={payment.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono font-medium">
                    {payment.trips ? tripRef(payment.trips.id) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {payment.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ETB {payment.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${methodClass(payment.payment_method)}`}>
                      {payment.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {payment.stripe_payment_intent_id
                      ? `${payment.stripe_payment_intent_id.slice(0, 20)}…`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {payment.paid_at
                      ? new Date(payment.paid_at).toLocaleString()
                      : new Date(payment.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No payments found.
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
