// FR-TR-01
import { createClient } from "@/lib/supabase/server";
import { getDirections } from "@/lib/ors/client";
import TripInProgress from "./_components/TripInProgress";

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    routeId?: string;
    fare?: string;
    tripId?: string;
  }>;
}

export default async function TripPage({ searchParams }: PageProps) {
  const { from: fromId, to: toId, routeId, fare, tripId } = await searchParams;

  let start = null;
  let end = null;

  let initialPolyline: [number, number][] | null = null;
  let initialDurationS: number | null = null;

  if (fromId && toId) {
    const supabase = await createClient();
    const [{ data: fromTerminal }, { data: toTerminal }] = await Promise.all([
      supabase.from("terminals").select("id, name, lat, lng").eq("id", fromId).single(),
      supabase.from("terminals").select("id, name, lat, lng").eq("id", toId).single(),
    ]);
    start = fromTerminal ?? null;
    end = toTerminal ?? null;

    if (start && end) {
      const directions = await getDirections(
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng }
      );
      initialPolyline = directions?.polyline ?? null;
      initialDurationS = directions?.duration_s ?? null;
    }
  }

  return (
    <TripInProgress
      start={start}
      end={end}
      routeId={routeId ?? null}
      fareAmount={fare ? parseFloat(fare) : null}
      initialTripId={tripId ?? undefined}
      initialPolyline={initialPolyline}
      initialDurationS={initialDurationS}
    />
  );
}
