// FR-UD-05 — trip history for the authenticated user
import { createClient } from "@/lib/supabase/server";
import TripHistoryView, {
  type TripItem,
  type TripHistorySummary,
} from "./_components/TripHistoryView";

const PAGE_SIZE = 20;

function tripDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").slice(-6);
  const num = parseInt(hex, 16) % 100000;
  return `TF-${num.toString().padStart(5, "0")}`;
}

export default async function TripHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // ── Fetch trips (paginated, filtered) ──────────────────────────────────────
  let tripsQuery = supabase
    .from("trips")
    .select("id, fare_amount, status, start_terminal_id, end_terminal_id, route_id, started_at, ended_at", { count: "exact" })
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (status) tripsQuery = tripsQuery.eq("status", status);

  // Fetch ALL user trips unfiltered — used for summary stats (total, distance, spent)
  const [{ data: rawTrips, count }, { data: allTripsForStats }] = await Promise.all([
    tripsQuery,
    supabase
      .from("trips")
      .select("fare_amount, status, start_terminal_id, end_terminal_id")
      .eq("user_id", user.id),
  ]);

  // ── Collect terminal / route IDs for joins ─────────────────────────────────
  const allForIds = [...(rawTrips ?? []), ...(allTripsForStats ?? [])];
  const terminalIds = [
    ...new Set([
      ...allForIds.map((t) => t.start_terminal_id).filter(Boolean),
      ...allForIds.map((t) => t.end_terminal_id).filter(Boolean),
    ]),
  ] as string[];

  const routeIds = [
    ...new Set((rawTrips ?? []).map((t) => t.route_id).filter(Boolean)),
  ] as string[];

  const [{ data: terminals }, { data: distances }, { data: routes }] =
    await Promise.all([
      terminalIds.length > 0
        ? supabase.from("terminals").select("id, name").in("id", terminalIds)
        : { data: [] as { id: string; name: string }[] },
      terminalIds.length > 0
        ? supabase
            .from("distances")
            .select("from_terminal_id, to_terminal_id, distance_km")
            .in("from_terminal_id", terminalIds)
            .in("to_terminal_id", terminalIds)
        : { data: [] as { from_terminal_id: string; to_terminal_id: string; distance_km: number }[] },
      routeIds.length > 0
        ? supabase.from("routes").select("id, name").in("id", routeIds)
        : { data: [] as { id: string; name: string }[] },
    ]);

  const termMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));
  const distMap = new Map(
    (distances ?? []).map((d) => [
      `${d.from_terminal_id}-${d.to_terminal_id}`,
      d.distance_km,
    ])
  );
  const routeMap = new Map((routes ?? []).map((r) => [r.id, r.name]));

  // ── Summary (all user trips, not just this page) ──────────────────────────
  const finishedTrips = (allTripsForStats ?? []).filter((t) =>
    ["completed", "paid", "payment_pending"].includes(t.status)
  );

  const totalDistanceKm = finishedTrips.reduce((sum, t) => {
    const km =
      t.start_terminal_id && t.end_terminal_id
        ? (distMap.get(`${t.start_terminal_id}-${t.end_terminal_id}`) ?? 0)
        : 0;
    return sum + km;
  }, 0);

  const totalSpent = (allTripsForStats ?? [])
    .filter((t) => t.status === "paid")
    .reduce((sum, t) => sum + (t.fare_amount ?? 0), 0);

  const summary: TripHistorySummary = {
    total: allTripsForStats?.length ?? 0,
    distanceKm: totalDistanceKm,
    spent: totalSpent,
  };

  // ── Shape trip rows ────────────────────────────────────────────────────────
  const trips: TripItem[] = (rawTrips ?? []).map((t) => {
    const startId = t.start_terminal_id as string | null;
    const endId = t.end_terminal_id as string | null;
    const distKm = startId && endId ? (distMap.get(`${startId}-${endId}`) ?? null) : null;

    let durationMin: number | null = null;
    if (t.started_at && t.ended_at) {
      durationMin = Math.round(
        (new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 60000
      );
    }

    return {
      id: t.id,
      displayId: tripDisplayId(t.id),
      fromName: startId ? (termMap.get(startId) ?? null) : null,
      toName: endId ? (termMap.get(endId) ?? null) : null,
      routeName: t.route_id ? (routeMap.get(t.route_id as string) ?? null) : null,
      distanceKm: distKm,
      fareAmount: t.fare_amount,
      status: t.status,
      startedAt: t.started_at,
      endedAt: t.ended_at ?? null,
      durationMin,
    };
  });

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <TripHistoryView
      trips={trips}
      summary={summary}
      filters={{ status }}
      pagination={{ page, totalPages, count: count ?? 0 }}
    />
  );
}
