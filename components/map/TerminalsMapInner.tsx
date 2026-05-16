"use client";
// FR-NT-01, FR-MP-01
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type L from "leaflet";
import { pinIcon, userIcon } from "@/components/map/leaflet-setup";
import { cn } from "@/lib/utils";

interface Terminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface Props {
  terminals: Terminal[];
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

function FitToBounds({ terminals }: { terminals: Terminal[] }) {
  const map = useMap();
  useEffect(() => {
    if (terminals.length === 0) return;
    const bounds = terminals.map(
      (t) => [t.lat, t.lng] as L.LatLngTuple
    );
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, terminals]);
  return null;
}

export default function TerminalsMapInner({ terminals, userLocation, className }: Props) {
  return (
    <div className={cn("h-56 rounded-2xl overflow-hidden", className)}>
      <MapContainer
        center={[9.02, 38.75]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        {terminals.map((t) => (
          <Marker key={t.id} position={[t.lat, t.lng]} icon={pinIcon}>
            <Popup>{t.name}</Popup>
          </Marker>
        ))}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        <FitToBounds terminals={terminals} />
      </MapContainer>
    </div>
  );
}
