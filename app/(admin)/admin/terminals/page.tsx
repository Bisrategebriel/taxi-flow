import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { Plus, Pencil } from "lucide-react";
import ToggleActiveButton from "./_components/ToggleActiveButton";

export default async function AdminTerminalsPage() {
  const service = createServiceClient();
  const { data: terminals } = await service
    .from("terminals")
    .select("id, name, city, lat, lng, is_active")
    .order("name");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Terminals</h1>
          <p className="text-sm text-muted-foreground mt-1">{terminals?.length ?? 0} terminals</p>
        </div>
        <Link
          href="/admin/terminals/new"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          New Terminal
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lat</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lng</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(terminals ?? []).map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.city}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.lat}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.lng}</td>
                  <td className="px-4 py-3">
                    <ToggleActiveButton id={t.id} isActive={t.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/terminals/${t.id}/edit`}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil size={13} />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
              {(terminals ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No terminals yet.
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
