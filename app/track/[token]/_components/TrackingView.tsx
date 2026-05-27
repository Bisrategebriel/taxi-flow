// FR-ST-05..17
"use client";
import dynamic from "next/dynamic";
import { MapPin, Clock, Navigation } from "lucide-react";
import { useRealtimeLocation } from "@/hooks/useRealtimeLocation";

const TripMapInner = dynamic(
  () => import("@/app/(user)/trip/_components/TripMapInner"),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
);

interface Terminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  tripId: string;
  isExpired: boolean;
  tripStatus: string;
  routeName: string;
  traveller: string;
  startedAt: string;
  start: Terminal | null;
  end: Terminal | null;
  polyline: [number, number][] | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TrackingView({
  tripId,
  isExpired,
  tripStatus,
  routeName,
  traveller,
  startedAt,
  start,
  end,
  polyline,
}: Props) {
  const liveLocation = useRealtimeLocation(tripId);

  const isEnded = isExpired || tripStatus !== "active";
  const userPos = liveLocation ? { lat: liveLocation.lat, lng: liveLocation.lng } : null;

  if (isEnded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center bg-background">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <MapPin size={24} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          {isExpired ? "Link Expired" : "Trip Ended"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {isExpired
            ? "This tracking link is no longer active."
            : `${traveller}'s trip has ended.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Map */}
      <div className="relative flex-1 min-h-0">
        <TripMapInner
          start={start}
          end={end}
          userPos={userPos}
          polyline={polyline}
          className="h-full w-full"
        />

        {/* Live indicator */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1000 flex items-center
          gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm">
          {liveLocation ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-white">Live</span>
            </>
          ) : (
            <span className="text-xs font-semibold text-white/70">Waiting for location…</span>
          )}
        </div>
      </div>

      {/* Info panel */}
      <div className="shrink-0 border-t border-border bg-card px-5 pt-4 pb-8 space-y-3">
        <h1 className="text-base font-bold text-foreground">
          Tracking {traveller}&apos;s trip
        </h1>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Navigation size={14} className="shrink-0 text-primary" />
          <span className="font-medium text-foreground">{routeName}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} className="shrink-0" />
          <span>Started {formatTime(startedAt)}</span>
        </div>

        {start && end && (
          <p className="text-xs text-muted-foreground">
            {start.name} → {end.name}
          </p>
        )}

        <p className="text-xs text-muted-foreground/60 pt-1">
          Location updates every 5 seconds · Powered by TaxiFlow
        </p>
      </div>
    </div>
  );
}
