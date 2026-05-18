"use client";
// FR-MP-01..06, FR-RS-04
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { startIcon, endIcon } from "@/components/map/leaflet-setup";
import { cn } from "@/lib/utils";

interface Props {
  start: { lat: number; lng: number; name: string };
  end: { lat: number; lng: number; name: string };
  polyline?: [number, number][];
  className?: string;
}

function FitBounds({ start, end }: { start: Props["start"]; end: Props["end"] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      { padding: [40, 40] }
    );
  }, [map, start.lat, start.lng, end.lat, end.lng]);
  return null;
}

export default function RouteMapInner({ start, end, polyline, className }: Props) {
  const center: [number, number] = [
    (start.lat + end.lat) / 2,
    (start.lng + end.lng) / 2,
  ];

  const line: [number, number][] =
    polyline && polyline.length > 0
      ? polyline
      : [
          [start.lat, start.lng],
          [end.lat, end.lng],
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
        <Marker position={[start.lat, start.lng]} icon={startIcon}>
          <Popup>{start.name}</Popup>
        </Marker>
        <Marker position={[end.lat, end.lng]} icon={endIcon}>
          <Popup>{end.name}</Popup>
        </Marker>
        <FitBounds start={start} end={end} />
      </MapContainer>
    </div>
  );
}
