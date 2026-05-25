"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { payDisplayId, formatRef } from "@/app/(admin)/admin/payments/payment-utils";
import { tripDisplayId } from "@/app/(admin)/admin/trips/trip-utils";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    throw new Error("Forbidden");
  }
}

type ExportFilters = {
  method?: string;
  status?: string;
  from?: string;
  to?: string;
};

export async function exportPayments(filters: ExportFilters): Promise<{ csv: string }> {
  await assertAdmin();
  const service = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (service.from("payments") as any)
    .select(
      `id, amount, status, stripe_payment_intent_id, created_at,
       payment_method, paid_at,
       trips!payments_trip_id_fkey(id),
       profiles!payments_user_id_fkey(full_name)`
    )
    .order("created_at", { ascending: false });

  if (filters.method) query = query.eq("payment_method", filters.method);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data: payments } = await query;

  const rows = (payments ?? []).map(
    (p: {
      id: string;
      amount: number;
      status: string;
      stripe_payment_intent_id: string | null;
      created_at: string;
      payment_method: string;
      paid_at: string | null;
      trips: { id: string } | null;
      profiles: { full_name: string | null } | null;
    }) => {
      const time = new Date(p.paid_at ?? p.created_at).toISOString();
      const tripId = p.trips ? tripDisplayId(p.trips.id) : "";
      return [
        `"${payDisplayId(p.id)}"`,
        `"${tripId}"`,
        `"${(p.profiles?.full_name ?? "").replace(/"/g, '""')}"`,
        p.amount.toFixed(2),
        `"${p.payment_method}"`,
        `"${formatRef(p.payment_method, p.stripe_payment_intent_id)}"`,
        `"${p.status}"`,
        `"${time}"`,
      ].join(",");
    }
  );

  const csv = [
    "Payment ID,Trip ID,User,Amount (ETB),Method,Reference,Status,Time",
    ...rows,
  ].join("\n");

  return { csv };
}
