import { createServiceClient } from "@/lib/supabase/service";
import TripsView from "./_components/TripsView";
import { tripDisplayId } from "./trip-utils";

const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

export type TripRow = {
  id: string;
  displayId: string;
  passengerName: string | null;
  routeName: string | null;
  startTerminalName: string | null;
  endTerminalName: string | null;
  startTerminalId: string | null;
  endTerminalId: string | null;
  distanceKm: number | null;
  fareAmount: number | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
};

export type TripStats = {
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
  totalToday: number;
};

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; page?: string; pageSize?: string }>;
}) {
  const { status, from, to, page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const pageSize = ALLOWED_PAGE_SIZES.includes(parseInt(pageSizeParam ?? "", 10))
    ? parseInt(pageSizeParam!, 10)
    : DEFAULT_PAGE_SIZE;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const offset = (page - 1) * pageSize;

  const service = createServiceClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let tripsQuery = service
    .from("trips")
    .select(
      `id, user_id, status, fare_amount, started_at, ended_at, start_terminal_id, end_terminal_id,
       route:routes(name)`,
      { count: "exact" }
    )
    .order("started_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) tripsQuery = tripsQuery.eq("status", status);
  if (from) tripsQuery = tripsQuery.gte("started_at", from);
  if (to) tripsQuery = tripsQuery.lte("started_at", to);

  const [{ data: todayTrips }, { data: rawTrips, count }, { data: distances }] =
    await Promise.all([
      service.from("trips").select("status").gte("started_at", todayStart.toISOString()),
      tripsQuery,
      service.from("distances").select("from_terminal_id, to_terminal_id, distance_km"),
    ]);

  // Collect unique terminal IDs and user IDs from this page of trips
  const terminalIds = new Set<string>();
  const userIds = new Set<string>();
  for (const t of rawTrips ?? []) {
    if (t.start_terminal_id) terminalIds.add(t.start_terminal_id);
    if (t.end_terminal_id) terminalIds.add(t.end_terminal_id);
    if (t.user_id) userIds.add(t.user_id);
  }

  const [{ data: terminals }, { data: profiles }] = await Promise.all([
    terminalIds.size > 0
      ? service.from("terminals").select("id, name").in("id", [...terminalIds])
      : Promise.resolve({ data: [] }),
    userIds.size > 0
      ? service.from("profiles").select("id, full_name").in("id", [...userIds])
      : Promise.resolve({ data: [] }),
  ]);

  const termMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const distMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
  }

  const stats: TripStats = {
    activeCount: todayTrips?.filter((t) => t.status === "active").length ?? 0,
    completedCount:
      todayTrips?.filter((t) =>
        ["completed", "paid", "payment_pending"].includes(t.status)
      ).length ?? 0,
    cancelledCount: todayTrips?.filter((t) => t.status === "cancelled").length ?? 0,
    totalToday: todayTrips?.length ?? 0,
  };

  const rows: TripRow[] = (rawTrips ?? []).map((trip) => {
    const route = trip.route as { name: string } | null;
    const startId = trip.start_terminal_id as string | null;
    const endId = trip.end_terminal_id as string | null;

    return {
      id: trip.id,
      displayId: tripDisplayId(trip.id),
      passengerName: trip.user_id ? (profileMap.get(trip.user_id) ?? null) : null,
      routeName: route?.name ?? null,
      startTerminalName: startId ? (termMap.get(startId) ?? null) : null,
      endTerminalName: endId ? (termMap.get(endId) ?? null) : null,
      startTerminalId: startId,
      endTerminalId: endId,
      distanceKm: startId && endId ? (distMap.get(`${startId}-${endId}`) ?? null) : null,
      fareAmount: trip.fare_amount,
      status: trip.status,
      startedAt: trip.started_at,
      endedAt: trip.ended_at ?? null,
    };
  });

  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <TripsView
      rows={rows}
      stats={stats}
      filters={{ status, from, to }}
      pagination={{ page, totalPages, count: count ?? 0, pageSize }}
    />
  );
}
