// FR-TR-01..08, FR-ST-01..04
"use client";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { X, Share2, MapPin, Clock } from "lucide-react";
import { useTripTracking } from "@/hooks/useTripTracking";
import EndTripModal from "./EndTripModal";

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
  initialPolyline?: [number, number][] | null;
  initialDurationS?: number | null;
}

function bearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
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

export default function TripInProgress({ start, end, routeId, fareAmount, initialTripId, initialPolyline, initialDurationS }: Props) {
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
  const [heading, setHeading] = useState(0);
  const [shareToast, setShareToast] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [startedAt] = useState(() => new Date());
  const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);

  const userPos = position ? { lat: position.latitude, lng: position.longitude } : null;

  // Accumulate distance and update heading when position changes
  useEffect(() => {
    if (!userPos) return;
    if (prevPosRef.current) {
      const d = haversineM(prevPosRef.current, userPos);
      if (d > 3) {
        setHeading(bearingDeg(prevPosRef.current, userPos));
        setDistanceM((prev) => prev + d);
        prevPosRef.current = userPos;
      }
    } else {
      prevPosRef.current = userPos;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  // Reverse-geocode when position moves >100 m from last geocoded point
  useEffect(() => {
    if (!userPos) return;
    const last = lastGeocodedRef.current;
    if (last && haversineM(last, userPos) < 100) return;
    lastGeocodedRef.current = userPos;

    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${userPos.lat}&lon=${userPos.lng}&format=json`,
      { signal: controller.signal, headers: { "Accept-Language": "en" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data?.address;
        const name =
          addr?.road ||
          addr?.suburb ||
          addr?.neighbourhood ||
          addr?.city_district ||
          addr?.city ||
          addr?.town ||
          addr?.village ||
          data?.display_name?.split(",")[0] ||
          null;
        setLocationName(name);
      })
      .catch(() => { /* geocoding failed silently */ });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const distanceLabel = useMemo(
    () => (distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`),
    [distanceM]
  );

  // TFR + 4-digit numeric suffix derived from the UUID's last 4 hex digits
  const tripShortId = useMemo(() => {
    if (!tripId) return "TFR——";
    const hex = tripId.replace(/-/g, "").slice(-4);
    const num = parseInt(hex, 16) % 10000;
    return `TFR${num.toString().padStart(4, "0")}`;
  }, [tripId]);

  const arriveAtLabel = useMemo(() => {
    if (!initialDurationS) return null;
    const arrival = new Date(startedAt.getTime() + initialDurationS * 1000);
    return arrival.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [startedAt, initialDurationS]);

  // Persist active trip to localStorage so the banner survives navigation
  useEffect(() => {
    if (!tripId || !start || !end) return;
    localStorage.setItem(
      "taxiflow_active_trip",
      JSON.stringify({
        tripId,
        fromId: start.id,
        toId: end.id,
        fromName: start.name,
        toName: end.name,
        routeId,
        fare: fareAmount,
      })
    );
  }, [tripId, start, end, routeId, fareAmount]);

  function handleDismiss() {
    // Leave trip running — banner will appear on other pages
    router.push("/dashboard");
  }

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

  async function handleConfirmEnd() {
    if (!tripId) return;
    setIsEnding(true);
    localStorage.removeItem("taxiflow_active_trip");
    try {
      // Race endTrip against a 10 s timeout so the button never hangs forever
      await Promise.race([
        endTrip(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10_000)
        ),
      ]);
    } catch {
      // DB update failed or timed out — navigate anyway, payment page can handle it
    }
    router.push("/payment?tripId=" + tripId);
  }

  const coordsLabel =
    position ? `${position.latitude.toFixed(5)}°N, ${position.longitude.toFixed(5)}°E` : null;

  const locationPrimary = geoError
    ? "Location unavailable"
    : isLoading || !position
    ? "Locating…"
    : locationName ?? coordsLabel ?? "Locating…";

  const startTimeLabel = startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <TripMapInner start={start} end={end} userPos={userPos} heading={heading} polyline={initialPolyline} arrivalTime={arriveAtLabel ?? undefined} className="h-full w-full" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-1000 flex items-center justify-between px-4 pt-4">
          <button
            onClick={handleDismiss}
            aria-label="Dismiss trip view"
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
            <p className="truncate text-base font-semibold text-foreground mt-0.5">
              {locationPrimary}
            </p>
            {coordsLabel && locationName && (
              <p className="truncate text-[10px] text-muted-foreground mt-0.5">{coordsLabel}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">Trip ID</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{tripShortId}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border overflow-hidden">
          <div className="flex flex-col items-center gap-0.5 py-3 px-2">
            <span className="text-base font-bold text-foreground leading-none">
              {distanceLabel}
            </span>
            <span className="text-[11px] text-muted-foreground">Distance</span>
          </div>
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 py-3 px-2 transition-colors hover:bg-muted"
          >
            <Share2 size={18} className="text-foreground" />
            <span className="text-[11px] text-muted-foreground">Share</span>
          </button>
        </div>

        {/* Time row */}
        <div className="flex items-center rounded-xl border border-border px-5 py-3 gap-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{startTimeLabel}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Departed</span>
          </div>

          {/* Connecting path */}
          <div className="flex flex-1 items-center gap-1 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="flex-1 border-t border-dashed border-muted-foreground/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="flex-1 border-t border-dashed border-muted-foreground/30" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
          </div>

          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{arriveAtLabel ?? "—"}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Arrival</span>
          </div>
        </div>

        {/* End Trip */}
        <button
          onClick={() => setShowEndModal(true)}
          className="w-full h-12 rounded-xl bg-destructive text-sm font-semibold
            text-destructive-foreground transition-colors hover:bg-destructive/90"
        >
          End Trip
        </button>
      </div>

      <EndTripModal
        open={showEndModal}
        onClose={() => setShowEndModal(false)}
        onConfirm={handleConfirmEnd}
        isLoading={isEnding}
      />
    </div>
  );
}
