import { createServiceClient } from "@/lib/supabase/service";
import { createRoute } from "@/app/(admin)/admin/_actions/routes";
import RouteForm from "../_components/RouteForm";

export default async function NewRoutePage() {
  const service = createServiceClient();
  const { data: terminals } = await service
    .from("terminals")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Route</h1>
        <p className="text-sm text-muted-foreground mt-1">Define a new route between two terminals</p>
      </div>
      <RouteForm
        action={createRoute}
        terminals={terminals ?? []}
        submitLabel="Create Route"
      />
    </div>
  );
}
