"use client";
// FR-NT-02, FR-NT-03, FR-NT-04, FR-NT-05
import { useState, useMemo } from "react";
import Link from "next/link";
import { LocateFixed, Loader2, MapPin, Search } from "lucide-react";
import { haversine } from "@/lib/utils/haversine";
import TerminalsMap from "@/components/map/TerminalsMap";
import { cn } from "@/lib/utils";

interface Terminal {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
}

interface TerminalWithDist extends Terminal {
  distKm: number | null;
}

type GeoState = "idle" | "loading" | "granted" | "denied";

export default function TerminalsNearMe({ terminals }: { terminals: Terminal[] }) {
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [query, setQuery] = useState("");

  const sorted = useMemo<TerminalWithDist[]>(() => {
    if (!userLoc) return terminals.map((t) => ({ ...t, distKm: null }));
    return terminals
      .map((t) => ({ ...t, distKm: haversine(userLoc, t) }))
      .sort((a, b) => a.distKm - b.distKm);
  }, [userLoc, terminals]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("granted");
      },
      () => setGeoState("denied")
    );
  }

  const trimmed = query.trim().toLowerCase();
  const visible = trimmed
    ? sorted.filter(
        (t) =>
          t.name.toLowerCase().includes(trimmed) ||
          t.city.toLowerCase().includes(trimmed)
      )
    : sorted;

  return (
    <div className="space-y-4">
      {/* Map */}
      <TerminalsMap
        terminals={terminals}
        userLocation={userLoc}
        className="h-80"
      />

      {/* Locate button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {geoState === "granted"
            ? "Sorted by distance from your location"
            : geoState === "denied"
            ? "Location access denied — showing all terminals"
            : `${visible.length} terminal${visible.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={requestLocation}
          disabled={geoState === "loading"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-card",
            "px-3 py-1.5 text-xs font-medium text-foreground transition-colors",
            "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {geoState === "loading" ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <LocateFixed size={12} />
          )}
          {geoState === "granted" ? "Re-locate" : "Near me"}
        </button>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search terminals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* Terminal list */}
      <ul className="space-y-2">
        {visible.map((t) => (
          <li key={t.id}>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <MapPin size={16} className="shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.city}
                    {t.distKm !== null && (
                      <span className="ml-2 text-primary font-medium">
                        {t.distKm < 1
                          ? `${Math.round(t.distKm * 1000)} m`
                          : `${t.distKm.toFixed(1)} km`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Link
                href={`/route-search?from=${t.id}`}
                className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs
                  font-medium text-foreground hover:bg-muted transition-colors"
              >
                Routes
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
