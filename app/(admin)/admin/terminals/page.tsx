import { createServiceClient } from "@/lib/supabase/service";
import AddTerminalModal from "./_components/AddTerminalModal";
import ImportTerminalsButton from "./_components/ImportTerminalsButton";
import ExportTerminalsButton from "./_components/ExportTerminalsButton";
import TerminalListPanel, { type TerminalItem } from "./_components/TerminalListPanel";

export default async function AdminTerminalsPage() {
  const service = createServiceClient();

  const [{ data: terminals }, { data: routes }] = await Promise.all([
    service
      .from("terminals")
      .select("id, name, city, lat, lng, is_active")
      .order("name"),
    service.from("routes").select("id, start_terminal_id, end_terminal_id"),
  ]);

  /* ── route count per terminal ────────────────────────────────────────────── */
  const routeCounts: Record<string, number> = {};
  for (const r of routes ?? []) {
    if (r.start_terminal_id)
      routeCounts[r.start_terminal_id] = (routeCounts[r.start_terminal_id] ?? 0) + 1;
    if (r.end_terminal_id)
      routeCounts[r.end_terminal_id] = (routeCounts[r.end_terminal_id] ?? 0) + 1;
  }

  const items: TerminalItem[] = (terminals ?? []).map((t) => ({
    ...t,
    routeCount: routeCounts[t.id] ?? 0,
  }));

  const activeCount = items.filter((t) => t.is_active).length;

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Terminals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} terminal{items.length !== 1 ? "s" : ""} across the network
            {activeCount < items.length && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                · {items.length - activeCount} inactive
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportTerminalsButton />
          <ExportTerminalsButton />
          <AddTerminalModal />
        </div>
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <TerminalListPanel terminals={items} />
    </div>
  );
}
