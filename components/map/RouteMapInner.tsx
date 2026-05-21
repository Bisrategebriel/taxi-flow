"use client";
// FR-MP-01..06, FR-RS-04
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { DepartureTerminalMarker, ArrivalTerminalMarker, UserLocationMarker } from "@/components/map/markers";
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
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => { /* silently ignore */ },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

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
        <DepartureTerminalMarker position={[start.lat, start.lng]} label={start.name} />
        <ArrivalTerminalMarker  position={[end.lat, end.lng]}   label={end.name} />
        {userPos && (
          <UserLocationMarker
            position={[userPos.lat, userPos.lng]}
            accuracyMeters={userPos.accuracy}
          />
        )}
        <FitBounds start={start} end={end} />
      </MapContainer>
    </div>
  );
}
