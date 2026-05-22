import { createServiceClient } from "@/lib/supabase/service";
import FareEditModal from "./_components/FareEditModal";

export default async function AdminFaresPage() {
  const service = createServiceClient();
  const { data: fares } = await service
    .from("fares")
    .select(`id, amount, currency, effective_from, effective_to, routes(name)`)
    .order("effective_from", { ascending: false });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fares</h1>
        <p className="text-sm text-muted-foreground mt-1">{fares?.length ?? 0} fare records</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Currency</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Effective From</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Effective To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(fares ?? []).map((fare) => {
                const route = fare.routes as { name: string } | null;
                return (
                  <tr key={fare.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{route?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono">{fare.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground uppercase text-xs">{fare.currency}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(fare.effective_from).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {fare.effective_to ? new Date(fare.effective_to).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <FareEditModal
                        fareId={fare.id}
                        routeName={route?.name ?? "Unknown Route"}
                        currentAmount={fare.amount}
                      />
                    </td>
                  </tr>
                );
              })}
              {(fares ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No fares configured.
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
