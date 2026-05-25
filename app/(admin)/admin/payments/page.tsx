import { createServiceClient } from "@/lib/supabase/service";
import PaymentsView from "./_components/PaymentsView";
import { payDisplayId, formatRef } from "./payment-utils";
import { tripDisplayId } from "@/app/(admin)/admin/trips/trip-utils";
import type { MonthlyDataPoint } from "@/app/(admin)/admin/dashboard/_components/RevenueChart";

export type PaymentRow = {
  id: string;
  displayId: string;
  tripDisplayId: string | null;
  userName: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  reference: string;
  paidAt: string;
};

export type PaymentStats = {
  revenueToday: number;
  completedToday: number;
  failedToday: number;
  cardToday: number;
  mobileToday: number;
  cashToday: number;
};

type RawPayment = {
  id: string;
  amount: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  payment_method: string;
  paid_at: string | null;
  trips: { id: string } | null;
  profiles: { full_name: string | null } | null;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; status?: string; from?: string; to?: string }>;
}) {
  const { method, status, from, to } = await searchParams;
  const service = createServiceClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tableQuery = (service.from("payments") as any)
    .select(
      `id, amount, status, stripe_payment_intent_id, created_at,
       payment_method, paid_at,
       trips!payments_trip_id_fkey(id),
       profiles!payments_user_id_fkey(full_name)`
    )
    .order("created_at", { ascending: false });

  if (method) tableQuery = tableQuery.eq("payment_method", method);
  if (status) tableQuery = tableQuery.eq("status", status);
  if (from) tableQuery = tableQuery.gte("created_at", from);
  if (to) tableQuery = tableQuery.lte("created_at", to);

  const [{ data: todayRaw }, { data: chartRaw }, { data: tableRaw }] = await Promise.all([
    // Today's payments for stat cards
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("amount, status, payment_method")
      .gte("created_at", todayStart.toISOString()),
    // Last 7 days succeeded payments for chart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("amount, created_at")
      .eq("status", "succeeded")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Filtered table rows
    tableQuery,
  ]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const today = todayRaw ?? [];
  const stats: PaymentStats = {
    revenueToday: today
      .filter((p: { status: string }) => p.status === "succeeded")
      .reduce((s: number, p: { amount: number }) => s + p.amount, 0),
    completedToday: today.filter((p: { status: string }) => p.status === "succeeded").length,
    failedToday: today.filter((p: { status: string }) => p.status === "failed").length,
    cardToday: today.filter((p: { payment_method: string }) => p.payment_method === "card").length,
    mobileToday: today.filter((p: { payment_method: string }) => p.payment_method === "mobile_money").length,
    cashToday: today.filter((p: { payment_method: string }) => p.payment_method === "cash").length,
  };

  // ── Chart data (last 7 days) ──────────────────────────────────────────────
  const chartData: MonthlyDataPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(sevenDaysAgo.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayTotal = (chartRaw ?? [])
      .filter((p: { created_at: string }) => p.created_at.startsWith(dateStr))
      .reduce((s: number, p: { amount: number }) => s + p.amount, 0);
    return {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: dayTotal,
    };
  });

  // ── Table rows ────────────────────────────────────────────────────────────
  const rows: PaymentRow[] = (tableRaw ?? []).map((p: RawPayment) => ({
    id: p.id,
    displayId: payDisplayId(p.id),
    tripDisplayId: p.trips ? tripDisplayId(p.trips.id) : null,
    userName: p.profiles?.full_name ?? null,
    amount: p.amount,
    status: p.status,
    paymentMethod: p.payment_method,
    reference: formatRef(p.payment_method, p.stripe_payment_intent_id),
    paidAt: p.paid_at ?? p.created_at,
  }));

  return (
    <PaymentsView
      rows={rows}
      stats={stats}
      chartData={chartData}
      filters={{ method, status, from, to }}
    />
  );
}
