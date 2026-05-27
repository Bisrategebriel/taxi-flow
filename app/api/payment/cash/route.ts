// FR-PA-06
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { insertUserNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const { tripId } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: trip } = await supabase
    .from("trips")
    .select("id, fare_amount, status, user_id")
    .eq("id", tripId)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!["completed", "payment_pending"].includes(trip.status)) {
    return NextResponse.json({ error: "Trip cannot be paid" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // payment_method and paid_at columns added by migration 20260522000001_payments_phase7.sql
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (serviceClient.from("payments") as any).insert({
    trip_id: tripId,
    user_id: user.id,
    amount: Number(trip.fare_amount ?? 0),
    currency: "ETB",
    status: "succeeded",
    payment_method: "cash",
    paid_at: new Date().toISOString(),
  });

  await serviceClient.from("trips").update({ status: "paid" }).eq("id", tripId);

  await insertUserNotification(
    user.id,
    "Payment confirmed",
    `Your cash payment of ETB ${Number(trip.fare_amount ?? 0).toFixed(2)} has been received. Thank you for travelling with TaxiFlow.`,
    "success"
  );

  revalidatePath("/notifications");

  return NextResponse.json({ success: true });
}
