// FR-PA-01..06
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentScreen from "./_components/PaymentScreen";

interface SearchParams {
  tripId?: string;
  cancelled?: string;
}

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tripId, cancelled } = await searchParams;
  if (!tripId) redirect("/dashboard");

  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      `id, fare_amount, status, started_at,
       start:terminals!trips_start_terminal_id_fkey(name),
       end:terminals!trips_end_terminal_id_fkey(name)`
    )
    .eq("id", tripId)
    .single();

  if (!trip) redirect("/dashboard");
  if (trip.status === "paid") redirect("/payment/success?tripId=" + tripId);

  const total = Number(trip.fare_amount ?? 0);
  const serviceFee = 2.0;
  const distSurcharge = Math.round(Math.max(0, total * 0.04) * 100) / 100;
  const baseFare = Math.round((total - serviceFee - distSurcharge) * 100) / 100;

  return (
    <PaymentScreen
      trip={{
        id: trip.id,
        fare_amount: total,
        status: trip.status,
        start: Array.isArray(trip.start) ? trip.start[0] ?? null : (trip.start as { name: string } | null),
        end: Array.isArray(trip.end) ? trip.end[0] ?? null : (trip.end as { name: string } | null),
      }}
      breakdown={{ baseFare, serviceFee, distSurcharge, total }}
      cancelled={cancelled === "true"}
    />
  );
}
