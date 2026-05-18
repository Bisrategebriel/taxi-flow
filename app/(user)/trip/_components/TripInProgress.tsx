"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Share2 } from "lucide-react";

const TripMapInner = dynamic(() => import("./TripMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-muted animate-pulse" />,
});

interface Terminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  start: Terminal | null;
  end: Terminal | null;
}

function makeTripId(): string {
  return Math.random().toString(16).slice(2, 8).toUpperCase();
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export default function TripInProgress({ start, end }: Props) {
  const router = useRouter();
  const [tripId] = useState(makeTripId);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceM, setDistanceM] = useState(0);
  const [locationName, setLocationName] = useState(() =>
    typeof window !== "undefined" && !navigator.geolocation
      ? "Location unavailable"
      : "Locating…"
  );
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setUserPos(pos);
        setLocationName(`${coords.latitude.toFixed(5)}°N, ${coords.longitude.toFixed(5)}°E`);
        if (prevPosRef.current) {
          const d = haversine(prevPosRef.current, pos);
          if (d > 3) {
            setDistanceM((prev) => prev + d);
            prevPosRef.current = pos;
          }
        } else {
          prevPosRef.current = pos;
        }
      },
      () => setLocationName("Location unavailable"),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const distanceLabel = useMemo(
    () =>
      distanceM < 1000
        ? `${Math.round(distanceM)} m`
        : `${(distanceM / 1000).toFixed(1)} km`,
    [distanceM]
  );

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: "TaxiFlow trip", url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* clipboard blocked */
      }
    }
  }

  function endTrip() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    router.push("/dashboard");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <TripMapInner start={start} end={end} userPos={userPos} className="h-full w-full" />

        {/* Top bar overlaid on map */}
        <div className="absolute top-0 left-0 right-0 z-1000 flex items-center justify-between px-4 pt-4">
          <button
            onClick={endTrip}
            aria-label="Close trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white
              backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-white">Live Tracking</span>
          </div>

          <button
            onClick={share}
            aria-label="Share trip"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white
              backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 border-t border-border bg-card px-4 pt-4 pb-8 space-y-4">
        {/* Current location + ETA */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Current location</p>
            <p className="truncate text-sm font-semibold text-foreground mt-0.5">
              {locationName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">ETA</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">—</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <span className="text-base font-bold text-foreground leading-none">
              {distanceLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">Distance</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <span className="text-base font-bold text-foreground leading-none">
              #{tripId}
            </span>
            <span className="text-[11px] text-muted-foreground">Trip ID</span>
          </div>
          <button
            onClick={share}
            className="flex flex-col items-center gap-0.5 py-3 px-2 transition-colors hover:bg-muted"
          >
            <Share2 size={18} className="text-primary" />
            <span className="text-[11px] text-muted-foreground">Share</span>
          </button>
        </div>

        {/* End Trip */}
        <button
          onClick={endTrip}
          className="w-full h-12 rounded-xl bg-destructive text-sm font-semibold
            text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          End Trip
        </button>
      </div>
    </div>
  );
}
