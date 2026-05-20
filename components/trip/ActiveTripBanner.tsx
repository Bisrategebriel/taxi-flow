// NFR-US-06
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ActiveTrip {
  tripId: string;
  fromId: string;
  toId: string;
  routeId: string | null;
  fare: number | null;
}

export default function ActiveTripBanner() {
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("taxiflow_active_trip");
      // localStorage is client-only; this effect runs once on mount to sync state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setActiveTrip(JSON.parse(raw) as ActiveTrip);
    } catch { /* storage blocked or stale */ }
  }, []);

  if (!activeTrip) return null;

  const href =
    `/trip?from=${activeTrip.fromId}&to=${activeTrip.toId}` +
    (activeTrip.routeId ? `&routeId=${activeTrip.routeId}` : "") +
    (activeTrip.fare != null ? `&fare=${activeTrip.fare}` : "") +
    `&tripId=${activeTrip.tripId}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between
      gap-3 bg-primary px-4 py-2 text-primary-foreground">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/80" />
        Trip in progress
      </div>
      <Link
        href={href}
        className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold
          hover:bg-white/30 transition-colors"
      >
        View
      </Link>
    </div>
  );
}
