import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { updateRoute } from "@/app/(admin)/admin/_actions/routes";
import RouteForm from "../../_components/RouteForm";

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();

  const [{ data: route }, { data: terminals }] = await Promise.all([
    service.from("routes").select("*").eq("id", id).single(),
    service.from("terminals").select("id, name, city").order("name"),
  ]);

  if (!route) notFound();

  const action = updateRoute.bind(null, id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Route</h1>
        <p className="text-sm text-muted-foreground mt-1">{route.name}</p>
      </div>
      <RouteForm
        action={action}
        terminals={terminals ?? []}
        defaultValues={{
          name: route.name,
          start_terminal_id: route.start_terminal_id,
          end_terminal_id: route.end_terminal_id,
          is_active: route.is_active,
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}
