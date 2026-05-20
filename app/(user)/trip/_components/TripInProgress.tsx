// FR-TR-01..08, FR-ST-01..04
"use client";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Share2, MapPin } from "lucide-react";
import { useTripTracking } from "@/hooks/useTripTracking";

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
  routeId: string | null;
  fareAmount: number | null;
  initialTripId?: string;
}

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
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

export default function TripInProgress({ start, end, routeId, fareAmount, initialTripId }: Props) {
  const router = useRouter();
  const { tripId, position, geoError, isLoading, endTrip, generateShareToken } =
    useTripTracking({
      startTerminalId: start?.id ?? "",
      endTerminalId: end?.id ?? "",
      routeId,
      fareAmount,
      initialTripId,
    });

  const [distanceM, setDistanceM] = useState(0);
  const [shareToast, setShareToast] = useState(false);
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);

  const userPos = position ? { lat: position.latitude, lng: position.longitude } : null;

  // Accumulate distance when position changes (effect runs in response to external GPS data)
  useEffect(() => {
    if (!userPos) return;
    if (prevPosRef.current) {
      const d = haversineM(prevPosRef.current, userPos);
      if (d > 3) {
        setDistanceM((prev) => prev + d);
        prevPosRef.current = userPos;
      }
    } else {
      prevPosRef.current = userPos;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const distanceLabel = useMemo(
    () => (distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`),
    [distanceM]
  );

  const tripShortId = tripId ? tripId.slice(-6).toUpperCase() : "———";

  const handleShare = useCallback(async () => {
    const token = await generateShareToken();
    if (!token) return;
    const shareUrl = `${window.location.origin}/track/${token}`;
    try {
      await navigator.share({ title: "Track my TaxiFlow trip", url: shareUrl });
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      } catch { /* clipboard blocked */ }
    }
  }, [generateShareToken]);

  async function handleEndTrip() {
    await endTrip();
    router.push("/dashboard");
    // Phase 7: router.push("/payment?tripId=" + tripId)
  }

  const locationLabel = geoError
    ? "Location unavailable"
    : isLoading || !position
    ? "Locating…"
    : `${position.latitude.toFixed(5)}°N, ${position.longitude.toFixed(5)}°E`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <TripMapInner start={start} end={end} userPos={userPos} className="h-full w-full" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-1000 flex items-center justify-between px-4 pt-4">
          <button
            onClick={handleEndTrip}
            aria-label="Close trip"
            className="flex h-10 w-10 items-center justify-center rounded-full
              bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-white">Live Tracking</span>
          </div>

          <button
            onClick={handleShare}
            aria-label="Share trip"
            className="flex h-10 w-10 items-center justify-center rounded-full
              bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* GPS locating overlay */}
        {(isLoading || !position) && !geoError && (
          <div className="absolute inset-0 z-999 flex items-center justify-center
            bg-black/20 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-card/90 px-6 py-5 shadow-lg">
              <MapPin size={24} className="text-primary animate-bounce" />
              <p className="text-sm font-medium text-foreground">Acquiring GPS signal…</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="shrink-0 border-t border-border bg-card px-4 pt-4 pb-8 space-y-4">
        {/* Share toast */}
        {shareToast && (
          <p className="text-center text-xs text-primary font-medium">
            Share link copied to clipboard!
          </p>
        )}

        {/* Current location */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Current location</p>
            <p className="truncate text-sm font-semibold text-foreground mt-0.5">
              {locationLabel}
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
              #{tripShortId}
            </span>
            <span className="text-[11px] text-muted-foreground">Trip ID</span>
          </div>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 py-3 px-2 transition-colors hover:bg-muted"
          >
            <Share2 size={18} className="text-primary" />
            <span className="text-[11px] text-muted-foreground">Share</span>
          </button>
        </div>

        {/* End Trip */}
        <button
          onClick={handleEndTrip}
          className="w-full h-12 rounded-xl bg-destructive text-sm font-semibold
            text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          End Trip
        </button>
      </div>
    </div>
  );
}
