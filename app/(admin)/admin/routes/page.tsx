import { createServiceClient } from "@/lib/supabase/service";
import AddRouteModal from "./_components/AddRouteModal";
import ImportRoutesButton from "./_components/ImportRoutesButton";
import ExportRoutesButton from "./_components/ExportRoutesButton";
import RoutesView from "./_components/RoutesView";
import type { RouteItem } from "./_components/RouteListPanel";

export default async function AdminRoutesPage() {
  const service = createServiceClient();

  const [{ data: routesRaw }, { data: fares }, { data: distances }, { data: terminals }] =
    await Promise.all([
      service
        .from("routes")
        .select(
          `id, name, is_active, intermediate_stops,
           start_terminal_id, end_terminal_id,
           start:terminals!routes_start_terminal_id_fkey(id, name),
           end:terminals!routes_end_terminal_id_fkey(id, name)`
        )
        .order("name"),
      service
        .from("fares")
        .select("id, route_id, amount")
        .order("effective_from", { ascending: false }),
      service.from("distances").select("from_terminal_id, to_terminal_id, distance_km"),
      service.from("terminals").select("id, name, city").order("name"),
    ]);

  /* ── build lookup maps ────────────────────────────────────────────────────── */
  const fareMap = new Map<string, { id: string; amount: number }>();
  for (const f of fares ?? []) {
    if (!fareMap.has(f.route_id)) fareMap.set(f.route_id, { id: f.id, amount: f.amount });
  }

  const distMap = new Map<string, number>();
  for (const d of distances ?? []) {
    distMap.set(`${d.from_terminal_id}-${d.to_terminal_id}`, d.distance_km);
  }

  const terminalNameMap = new Map((terminals ?? []).map((t) => [t.id, t.name]));

  /* ── merge into RouteItem[] ───────────────────────────────────────────────── */
  const routes: RouteItem[] = (routesRaw ?? []).map((r) => {
    const start = r.start as { id: string; name: string } | null;
    const end = r.end as { id: string; name: string } | null;
    const fare = fareMap.get(r.id);
    const dist = distMap.get(`${r.start_terminal_id}-${r.end_terminal_id}`) ?? null;
    const viaIds: string[] = r.intermediate_stops ?? [];
    const viaDisplay = viaIds.map((id) => terminalNameMap.get(id) ?? id).join(", ");

    return {
      id: r.id,
      name: r.name,
      is_active: r.is_active,
      start_terminal_id: r.start_terminal_id,
      end_terminal_id: r.end_terminal_id,
      startName: start?.name ?? "—",
      endName: end?.name ?? "—",
      via: viaDisplay,
      via_ids: viaIds,
      distance_km: dist,
      fare_etb: fare?.amount ?? null,
      fareId: fare?.id ?? null,
    };
  });

  const activeCount = routes.filter((r) => r.is_active).length;

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Routes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {routes.length} route{routes.length !== 1 ? "s" : ""} configured
            {activeCount < routes.length && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {routes.length - activeCount} inactive
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportRoutesButton />
          <ExportRoutesButton />
          <AddRouteModal terminals={terminals ?? []} />
        </div>
      </div>

      {/* ── Route list ─────────────────────────────────────────────────────── */}
      <RoutesView routes={routes} terminals={terminals ?? []} />
    </div>
  );
}
