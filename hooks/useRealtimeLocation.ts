// FR-ST-07, FR-ST-09
"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function useRealtimeLocation(tripId: string | null): Location | null {
  const [location, setLocation] = useState<Location | null>(null);

  useEffect(() => {
    if (!tripId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`trip-location:${tripId}`)
      .on("broadcast", { event: "location" }, ({ payload }) => {
        setLocation({
          lat: payload.lat as number,
          lng: payload.lng as number,
          accuracy: payload.accuracy as number | undefined,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return location;
}
