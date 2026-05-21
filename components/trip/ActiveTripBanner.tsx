// NFR-US-06
"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Navigation } from "lucide-react";

interface ActiveTrip {
  tripId: string;
  fromId: string;
  toId: string;
  fromName?: string;
  toName?: string;
  routeId: string | null;
  fare: number | null;
}

export default function ActiveTripBanner() {
  const pathname = usePathname();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);

  // Re-read localStorage on every navigation so ending a trip clears the banner
  useEffect(() => {
    try {
      const raw = localStorage.getItem("taxiflow_active_trip");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTrip(raw ? (JSON.parse(raw) as ActiveTrip) : null);
    } catch { /* storage blocked or stale */ }
  }, [pathname]);

  // Don't show the banner while the trip progress UI is open (it covers the screen)
  if (!activeTrip || pathname === "/trip") return null;

  const href =
    `/trip?from=${activeTrip.fromId}&to=${activeTrip.toId}` +
    (activeTrip.routeId ? `&routeId=${activeTrip.routeId}` : "") +
    (activeTrip.fare != null ? `&fare=${activeTrip.fare}` : "") +
    `&tripId=${activeTrip.tripId}`;

  const routeLabel =
    activeTrip.fromName && activeTrip.toName
      ? `${activeTrip.fromName} → ${activeTrip.toName}`
      : "Trip in progress";

  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between
      gap-3 bg-primary px-4 py-2.5 text-primary-foreground shadow-md">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white/80" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-primary-foreground/70 leading-none mb-0.5">
            Trip in progress
          </p>
          <p className="text-sm font-semibold truncate leading-none">{routeLabel}</p>
        </div>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1.5 shrink-0 rounded-full bg-white/20 px-3 py-1.5
          text-xs font-semibold hover:bg-white/30 transition-colors"
      >
        <Navigation size={11} />
        Back to trip
      </Link>
    </div>
  );
}
