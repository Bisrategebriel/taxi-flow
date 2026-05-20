// FR-ST-05..17, NFR-SE-05,06
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackingView from "./_components/TrackingView";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function TrackPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up share token (anon RLS policy allows this)
  const { data: shareToken } = await supabase
    .from("share_tokens")
    .select("trip_id, expires_at")
    .eq("token", token)
    .single();

  if (!shareToken) return notFound();

  const isExpired =
    !!shareToken.expires_at && new Date(shareToken.expires_at) < new Date();

  // Fetch trip with terminals and route (anon RLS via share token)
  const { data: trip } = await supabase
    .from("trips")
    .select(`
      id, status, started_at, ended_at, fare_amount, user_id,
      start:terminals!trips_start_terminal_id_fkey(id, name, lat, lng),
      end:terminals!trips_end_terminal_id_fkey(id, name, lat, lng),
      routes(name)
    `)
    .eq("id", shareToken.trip_id)
    .single();

  if (!trip) return notFound();

  // First name only — never expose full name or user_id publicly (NFR-SE-06)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", trip.user_id)
    .single();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Traveller";

  const start = trip.start as { id: string; name: string; lat: number; lng: number } | null;
  const end = trip.end as { id: string; name: string; lat: number; lng: number } | null;
  const routeName = (trip.routes as { name: string } | null)?.name ?? "Unknown Route";

  return (
    <TrackingView
      tripId={trip.id}
      isExpired={isExpired}
      tripStatus={trip.status}
      routeName={routeName}
      traveller={firstName}
      startedAt={trip.started_at}
      start={start}
      end={end}
    />
  );
}
