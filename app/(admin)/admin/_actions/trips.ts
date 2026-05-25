"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

function durationStr(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export async function exportTrips(filters: {
  status?: string;
  from?: string;
  to?: string;
}): Promise<{ csv: string }> {
  await assertAdmin();
  const service = createServiceClient();

  let query = service
    .from("trips")
    .select(
      `id, status, fare_amount, started_at, ended_at, start_terminal_id, end_terminal_id,
       route:routes(name),
       profiles!trips_user_id_fkey(full_name)`
    )
    .order("started_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("started_at", filters.from);
  if (filters.to) query = query.lte("started_at", filters.to);

  const { data: trips } = await query;

  const terminalIds = new Set<string>();
  for (const t of trips ?? []) {
    if (t.start_terminal_id) terminalIds.add(t.start_terminal_id);
    if (t.end_terminal_id) terminalIds.add(t.end_terminal_id);
  }

  const [{ data: terminals }, { data: distances }] = await Promise.all([
    terminalIds.size > 0
      ? service.from("terminals").select("id, name").in("id", [...terminalIds])
      : Promise.resolve({ data: [] }),
    service.from("distances").select("from_terminal_id, to_terminal_id, distance_km"),
  ]);

  const termMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));
  const distMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
  }

  const rows = (trips ?? []).map((trip) => {
    const route = trip.route as { name: string } | null;
    const passenger = trip.profiles as unknown as { full_name: string | null } | null;
    const startName = trip.start_terminal_id ? termMap.get(trip.start_terminal_id) ?? "" : "";
    const endName = trip.end_terminal_id ? termMap.get(trip.end_terminal_id) ?? "" : "";
    const dist = trip.start_terminal_id && trip.end_terminal_id
      ? (distMap.get(`${trip.start_terminal_id}-${trip.end_terminal_id}`) ?? "")
      : "";

    return [
      `"${tripDisplayId(trip.id)}"`,
      `"${(passenger?.full_name ?? "").replace(/"/g, '""')}"`,
      `"${(route?.name ?? "").replace(/"/g, '""')}"`,
      `"${startName.replace(/"/g, '""')}"`,
      `"${endName.replace(/"/g, '""')}"`,
      dist.toString(),
      trip.fare_amount?.toString() ?? "",
      `"${trip.status}"`,
      `"${new Date(trip.started_at).toISOString()}"`,
      trip.ended_at ? `"${new Date(trip.ended_at).toISOString()}"` : "",
      `"${durationStr(trip.started_at, trip.ended_at)}"`,
    ].join(",");
  });

  const csv = [
    "Trip ID,Passenger,Route,From Terminal,To Terminal,Distance (km),Fare (ETB),Status,Started,Ended,Duration",
    ...rows,
  ].join("\n");

  return { csv };
}
