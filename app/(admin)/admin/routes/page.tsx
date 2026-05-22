import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { Plus, Pencil } from "lucide-react";
import ToggleRouteButton from "./_components/ToggleRouteButton";

export default async function AdminRoutesPage() {
  const service = createServiceClient();
  const { data: routes } = await service
    .from("routes")
    .select(
      `id, name, is_active,
       start:terminals!routes_start_terminal_id_fkey(name),
       end:terminals!routes_end_terminal_id_fkey(name)`
    )
    .order("name");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Routes</h1>
          <p className="text-sm text-muted-foreground mt-1">{routes?.length ?? 0} routes</p>
        </div>
        <Link
          href="/admin/routes/new"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Route
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start Terminal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">End Terminal</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(routes ?? []).map((r) => {
                const start = r.start as { name: string } | null;
                const end = r.end as { name: string } | null;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{start?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{end?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ToggleRouteButton id={r.id} isActive={r.is_active} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/routes/${r.id}/edit`}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil size={13} />
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(routes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No routes yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
