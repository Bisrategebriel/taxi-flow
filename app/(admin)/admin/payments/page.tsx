import { createServiceClient } from "@/lib/supabase/service";
import PaymentsView from "./_components/PaymentsView";
import { payDisplayId, formatRef } from "./payment-utils";
import { tripDisplayId } from "@/lib/utils/trip-id";
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

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

type RawPayment = {
  id: string;
  trip_id: string | null;
  user_id: string | null;
  amount: number;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  payment_method: string;
  paid_at: string | null;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; status?: string; from?: string; to?: string; page?: string; pageSize?: string }>;
}) {
  const { method, status, from, to, page: pageParam, pageSize: pageSizeParam } = await searchParams;

  const pageSize = ALLOWED_PAGE_SIZES.includes(parseInt(pageSizeParam ?? "", 10))
    ? parseInt(pageSizeParam!, 10)
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * pageSize;

  const service = createServiceClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tableQuery = (service.from("payments") as any)
    .select("id, trip_id, user_id, amount, status, stripe_payment_intent_id, created_at, payment_method, paid_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (method) tableQuery = tableQuery.eq("payment_method", method);
  if (status) tableQuery = tableQuery.eq("status", status);
  if (from) tableQuery = tableQuery.gte("created_at", from);
  if (to) tableQuery = tableQuery.lte("created_at", to);

  const [{ data: todayRaw }, { data: chartRaw }, { data: tableRaw, count }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("amount, status, payment_method")
      .gte("created_at", todayStart.toISOString()),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service.from("payments") as any)
      .select("amount, created_at")
      .eq("status", "succeeded")
      .gte("created_at", sevenDaysAgo.toISOString()),
    tableQuery,
  ]);

  // Fetch user profiles for this page separately (avoids broken FK join)
  const userIds = new Set<string>();
  for (const p of tableRaw ?? []) {
    if (p.user_id) userIds.add(p.user_id);
  }
  const { data: profiles } = userIds.size > 0
    ? await service.from("profiles").select("id, full_name").in("id", [...userIds])
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));

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
    tripDisplayId: p.trip_id ? tripDisplayId(p.trip_id) : null,
    userName: p.user_id ? (profileMap.get(p.user_id) ?? null) : null,
    amount: p.amount,
    status: p.status,
    paymentMethod: p.payment_method,
    reference: formatRef(p.payment_method, p.stripe_payment_intent_id),
    paidAt: p.paid_at ?? p.created_at,
  }));

  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <PaymentsView
      rows={rows}
      stats={stats}
      chartData={chartData}
      filters={{ method, status, from, to }}
      pagination={{ page, totalPages, count: count ?? 0, pageSize }}
    />
  );
}
