import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { updateTerminal } from "@/app/(admin)/admin/_actions/terminals";
import TerminalForm from "../../_components/TerminalForm";

export default async function EditTerminalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();
  const { data: terminal } = await service
    .from("terminals")
    .select("*")
    .eq("id", id)
    .single();

  if (!terminal) notFound();

  const action = updateTerminal.bind(null, id);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Terminal</h1>
        <p className="text-sm text-muted-foreground mt-1">{terminal.name}</p>
      </div>
      <TerminalForm
        action={action}
        defaultValues={{
          name: terminal.name,
          address: terminal.address ?? undefined,
          city: terminal.city,
          lat: terminal.lat,
          lng: terminal.lng,
          is_active: terminal.is_active,
        }}
        submitLabel="Save Changes"
      />
    </div>
  );
}
