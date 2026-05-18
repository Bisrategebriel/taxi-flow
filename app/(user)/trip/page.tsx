import { createClient } from "@/lib/supabase/server";
import TripInProgress from "./_components/TripInProgress";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function TripPage({ searchParams }: PageProps) {
  const { from: fromId, to: toId } = await searchParams;

  let start = null;
  let end = null;

  if (fromId && toId) {
    const supabase = await createClient();
    const [{ data: fromTerminal }, { data: toTerminal }] = await Promise.all([
      supabase.from("terminals").select("id, name, lat, lng").eq("id", fromId).single(),
      supabase.from("terminals").select("id, name, lat, lng").eq("id", toId).single(),
    ]);
    start = fromTerminal ?? null;
    end = toTerminal ?? null;
  }

  return <TripInProgress start={start} end={end} />;
}
