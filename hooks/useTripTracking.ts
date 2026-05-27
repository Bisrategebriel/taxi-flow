// FR-TR-01..08, FR-ST-01..04
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "./useGeolocation";

const STORAGE_KEY = "taxiflow_active_trip";

interface TripTrackingParams {
  startTerminalId: string;
  endTerminalId: string;
  routeId: string | null;
  fareAmount: number | null;
  initialTripId?: string;
}

interface TripTrackingResult {
  tripId: string | null;
  position: GeolocationCoordinates | null;
  geoError: GeolocationPositionError | null;
  isLoading: boolean;
  endTrip: () => Promise<void>;
  generateShareToken: () => Promise<string | null>;
}

export function useTripTracking(params: TripTrackingParams): TripTrackingResult {
  const supabase = createClient();
  const { position, error: geoError, isLoading } = useGeolocation();
  const [tripId, setTripId] = useState<string | null>(params.initialTripId ?? null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef = useRef<GeolocationCoordinates | null>(null);
  const tripIdRef = useRef<string | null>(params.initialTripId ?? null);
  const hasCreatedRef = useRef(false);

  // Keep refs current
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { tripIdRef.current = tripId; }, [tripId]);

  // Create trip in DB on mount (skip if resuming)
  // hasCreatedRef prevents React StrictMode double-invocation from creating 2 trips
  useEffect(() => {
    if (params.initialTripId) return;
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    let mounted = true;
    async function startTrip() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          route_id: params.routeId,
          start_terminal_id: params.startTerminalId,
          end_terminal_id: params.endTerminalId,
          fare_amount: params.fareAmount,
          status: "active",
        })
        .select("id")
        .single();

      if (data && mounted) {
        setTripId(data.id);
        // Persist to localStorage so ActiveTripBanner can show on other pages
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              tripId: data.id,
              fromId: params.startTerminalId,
              toId: params.endTerminalId,
              routeId: params.routeId,
              fare: params.fareAmount,
            })
          );
        } catch { /* storage blocked */ }
      }
      if (error) console.error("[useTripTracking] insert error:", error);
    }

    startTrip();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to Realtime channel and start broadcast/snapshot timers once tripId is set
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase.channel(`trip-location:${tripId}`);
    channel.subscribe();
    channelRef.current = channel;

    // Broadcast position every 5 s (FR-TR-03)
    broadcastTimerRef.current = setInterval(() => {
      const pos = positionRef.current;
      if (pos && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "location",
          payload: { lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy },
        });
      }
    }, 5000);

    // Snapshot to trip_locations every 30 s (FR-TR-05)
    snapshotTimerRef.current = setInterval(() => {
      const pos = positionRef.current;
      const id = tripIdRef.current;
      if (pos && id) {
        supabase.from("trip_locations").insert({
          trip_id: id,
          lat: pos.latitude,
          lng: pos.longitude,
          accuracy: pos.accuracy,
        });
      }
    }, 30000);

    return () => {
      if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const endTrip = useCallback(async () => {
    if (!tripIdRef.current) return;

    if (broadcastTimerRef.current) clearInterval(broadcastTimerRef.current);
    if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    await fetch("/api/trip/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: tripIdRef.current }),
    });

    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage blocked */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateShareToken = useCallback(async (): Promise<string | null> => {
    if (!tripIdRef.current) return null;

    const { data } = await supabase
      .from("share_tokens")
      .insert({ trip_id: tripIdRef.current })
      .select("token")
      .single();

    return data?.token ?? null;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { tripId, position, geoError, isLoading, endTrip, generateShareToken };
}
