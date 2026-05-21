"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import UserLocationMarker from "@/components/map/markers/UserLocationMarker";
import ArrivalTerminalMarker from "@/components/map/markers/ArrivalTerminalMarker";
import { cn } from "@/lib/utils";

interface Props {
  userLocation: { lat: number; lng: number };
  terminal: { lat: number; lng: number; name: string };
  polyline?: [number, number][];
  className?: string;
}

function FitBounds({
  userLat,
  userLng,
  termLat,
  termLng,
}: {
  userLat: number;
  userLng: number;
  termLat: number;
  termLng: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [userLat, userLng],
        [termLat, termLng],
      ],
      { padding: [48, 48] }
    );
  }, [map, userLat, userLng, termLat, termLng]);
  return null;
}

export default function DirectionsMapInner({ userLocation, terminal, polyline, className }: Props) {
  const line: [number, number][] =
    polyline && polyline.length > 0
      ? polyline
      : [
          [userLocation.lat, userLocation.lng],
          [terminal.lat, terminal.lng],
        ];

  const center: [number, number] = [
    (userLocation.lat + terminal.lat) / 2,
    (userLocation.lng + terminal.lng) / 2,
  ];

  return (
    <div className={cn("h-[45vh] rounded-2xl overflow-hidden", className)}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        <Polyline positions={line} pathOptions={{ color: "#0f6cbd", weight: 4, opacity: 0.85 }} />
        <UserLocationMarker position={[userLocation.lat, userLocation.lng]} />
        <ArrivalTerminalMarker position={[terminal.lat, terminal.lng]} label={terminal.name} />
        <FitBounds
          userLat={userLocation.lat}
          userLng={userLocation.lng}
          termLat={terminal.lat}
          termLng={terminal.lng}
        />
      </MapContainer>
    </div>
  );
}
