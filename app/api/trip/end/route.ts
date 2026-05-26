import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { insertUserNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const { tripId } = await request.json();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  const { data: trip } = await service
    .from("trips")
    .select("id, status, user_id, start_terminal_id, end_terminal_id, fare_amount")
    .eq("id", tripId)
    .single();

  if (!trip || trip.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (trip.status !== "active") {
    return NextResponse.json({ error: "Trip is not active" }, { status: 400 });
  }

  await service
    .from("trips")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("id", tripId);

  // Look up terminal names for the notification body
  const terminalIds = [trip.start_terminal_id, trip.end_terminal_id].filter(Boolean) as string[];
  const { data: terminals } = terminalIds.length > 0
    ? await service.from("terminals").select("id, name").in("id", terminalIds)
    : { data: [] };
  const termMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));

  const fromName = trip.start_terminal_id ? (termMap.get(trip.start_terminal_id) ?? "origin") : "origin";
  const toName = trip.end_terminal_id ? (termMap.get(trip.end_terminal_id) ?? "destination") : "destination";

  await insertUserNotification(
    user.id,
    "Trip completed",
    `Your trip from ${fromName} to ${toName} has been completed. Please proceed to payment.`,
    "success"
  );

  return NextResponse.json({ success: true });
}
