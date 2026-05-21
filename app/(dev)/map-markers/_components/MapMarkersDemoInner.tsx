"use client";
// DEV ONLY — delete this route before release
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import {
  UserLocationMarker,
  DepartureTerminalMarker,
  ArrivalTerminalMarker,
  VehicleMarker,
} from "@/components/map/markers";

// Coordinates match the live database records (seed.sql IDs 006/007/003)
const MEXICO: [number, number]    = [9.0053, 38.7638]; // aaaa…006 Mexico Terminal
const STADIUM: [number, number]   = [9.0186, 38.7614]; // aaaa…007 Stadium Terminal
const MEGENAGNA: [number, number] = [9.0225, 38.7996]; // aaaa…003 Megenagna Terminal

const CENTER: [number, number] = [9.0155, 38.7746];

// Fetch multi-stop route from OSRM (public demo server, no API key needed)
async function fetchOsrmRoute(
  stops: [number, number][]
): Promise<[number, number][] | null> {
  const coords = stops.map(([lat, lng]) => `${lng},${lat}`).join(";");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const coords2d: [number, number][] = (
      json?.routes?.[0]?.geometry?.coordinates as [number, number][]
    )?.map(([lng, lat]) => [lat, lng]); // GeoJSON is [lng, lat] → flip for Leaflet
    return coords2d ?? null;
  } catch {
    return null;
  }
}

export default function MapMarkersDemoInner() {
  const [heading, setHeading] = useState(45);
  const [polyline, setPolyline] = useState<[number, number][] | null>(null);
  const [routeStatus, setRouteStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetchOsrmRoute([MEXICO, STADIUM, MEGENAGNA]).then((line) => {
      if (line) { setPolyline(line); setRouteStatus("ok"); }
      else setRouteStatus("error");
    });
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Dev toolbar */}
      <div style={{
        padding: "10px 16px", background: "#0f172a", color: "white",
        display: "flex", alignItems: "center", gap: 20, flexShrink: 0, flexWrap: "wrap",
      }}>
        <strong style={{ fontSize: 13 }}>Map Markers — Dev Demo</strong>
        <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
          Vehicle heading: {heading}°
          <input
            type="range" min={0} max={359} value={heading}
            onChange={(e) => setHeading(Number(e.target.value))}
            style={{ width: 120 }}
          />
        </label>
        <span style={{ fontSize: 11, opacity: 0.55 }}>
          Route: {routeStatus === "loading" ? "fetching…" : routeStatus === "ok" ? "OSRM road route ✓" : "OSRM unavailable — straight line fallback"}
        </span>
        <span style={{ fontSize: 11, opacity: 0.55 }}>
          🟢 Mexico (departure) → 🔴 Megenagna (arrival) · 🔵 user dot · 🚌 vehicle
        </span>
      </div>

      <div style={{ flex: 1 }}>
        <MapContainer center={CENTER} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          {/* Road-following route (solid) or straight-line fallback (dashed) */}
          {polyline ? (
            <Polyline
              positions={polyline}
              pathOptions={{ color: "#0f6cbd", weight: 4, opacity: 0.85 }}
            />
          ) : (
            <Polyline
              positions={[MEXICO, STADIUM, MEGENAGNA]}
              pathOptions={{ color: "#0f6cbd", weight: 3, opacity: 0.5, dashArray: "8 6" }}
            />
          )}

          {/* Terminals */}
          <DepartureTerminalMarker position={MEXICO}    label="Mexico" />
          <ArrivalTerminalMarker  position={MEGENAGNA} label="Megenagna" />
          <DepartureTerminalMarker position={STADIUM}  label="Stadium" />

          {/* User dot at Mexico (trip start / boarding point) */}
          <UserLocationMarker position={MEXICO} accuracyMeters={25} />

          {/* Live vehicle — heading controlled by slider */}
          <VehicleMarker position={STADIUM} heading={heading} />
        </MapContainer>
      </div>
    </div>
  );
}
