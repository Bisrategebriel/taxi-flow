"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { startIcon, endIcon, userIcon } from "@/components/map/leaflet-setup";
import { cn } from "@/lib/utils";

interface Terminal {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  start: Terminal | null;
  end: Terminal | null;
  userPos: { lat: number; lng: number } | null;
  className?: string;
}

function FitBounds({ start, end }: { start: Terminal; end: Terminal }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [[start.lat, start.lng], [end.lat, end.lng]],
      { padding: [60, 60] }
    );
  }, [map, start.lat, start.lng, end.lat, end.lng]);
  return null;
}

function PanToUser({ pos }: { pos: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([pos.lat, pos.lng], { animate: true });
  }, [map, pos.lat, pos.lng]);
  return null;
}

export default function TripMapInner({ start, end, userPos, className }: Props) {
  const center: [number, number] = userPos
    ? [userPos.lat, userPos.lng]
    : start
    ? [start.lat, start.lng]
    : [9.025, 38.747];

  const line: [number, number][] =
    start && end ? [[start.lat, start.lng], [end.lat, end.lng]] : [];

  return (
    <div className={cn("h-full w-full", className)}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        {line.length > 0 && (
          <Polyline
            positions={line}
            pathOptions={{ color: "#0f6cbd", weight: 4, opacity: 0.7, dashArray: "8 6" }}
          />
        )}
        {start && (
          <Marker position={[start.lat, start.lng]} icon={startIcon}>
            <Popup>{start.name}</Popup>
          </Marker>
        )}
        {end && (
          <Marker position={[end.lat, end.lng]} icon={endIcon}>
            <Popup>{end.name}</Popup>
          </Marker>
        )}
        {userPos && (
          <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
        )}
        {start && end && !userPos && <FitBounds start={start} end={end} />}
        {userPos && <PanToUser pos={userPos} />}
      </MapContainer>
    </div>
  );
}
