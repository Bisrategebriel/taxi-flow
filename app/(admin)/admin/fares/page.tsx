import { createServiceClient } from "@/lib/supabase/service";
import FaresView from "./_components/FaresView";

export type FareRow = {
  id: string;
  routeName: string;
  startTerminalId: string;
  endTerminalId: string;
  distanceKm: number | null;
  durationMin: number | null;
  amount: number;
  currency: string;
  lastUpdated: string;
};

export default async function AdminFaresPage() {
  const service = createServiceClient();

  const [{ data: fares }, { data: distances }] = await Promise.all([
    service
      .from("fares")
      .select(
        `id, amount, currency, updated_at, routes(id, name, start_terminal_id, end_terminal_id)`
      )
      .order("updated_at", { ascending: false }),
    service.from("distances").select("from_terminal_id, to_terminal_id, distance_km, duration_minutes"),
  ]);

  const distMap = new Map<string, number>();
  const durationMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
    if (d.duration_minutes) durationMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.duration_minutes);
  }

  const rows: FareRow[] = (fares ?? []).map((f) => {
    const route = f.routes as {
      id: string;
      name: string;
      start_terminal_id: string;
      end_terminal_id: string;
    } | null;
    const key = route ? `${route.start_terminal_id}-${route.end_terminal_id}` : null;
    const distKm = key ? (distMap.get(key) ?? null) : null;
    const durMin = key ? (durationMap.get(key) ?? null) : null;
    return {
      id: f.id,
      routeName: route?.name ?? "—",
      startTerminalId: route?.start_terminal_id ?? "",
      endTerminalId: route?.end_terminal_id ?? "",
      distanceKm: distKm,
      durationMin: durMin,
      amount: f.amount,
      currency: f.currency,
      lastUpdated: f.updated_at,
    };
  });

  return <FaresView rows={rows} />;
}
