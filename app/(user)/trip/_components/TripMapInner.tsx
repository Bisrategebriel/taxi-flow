"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { DepartureTerminalMarker, ArrivalTerminalMarker, VehicleMarker } from "@/components/map/markers";
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
  heading?: number;
  polyline?: [number, number][] | null;
  arrivalTime?: string;
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

export default function TripMapInner({ start, end, userPos, heading, polyline, arrivalTime, className }: Props) {
  const center: [number, number] = userPos
    ? [userPos.lat, userPos.lng]
    : start
    ? [start.lat, start.lng]
    : [9.025, 38.747];

  const straightLine: [number, number][] =
    start && end ? [[start.lat, start.lng], [end.lat, end.lng]] : [];
  const routeLine = polyline && polyline.length > 1 ? polyline : null;

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
        {routeLine ? (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#0f6cbd", weight: 4, opacity: 0.85 }}
          />
        ) : straightLine.length > 0 && (
          <Polyline
            positions={straightLine}
            pathOptions={{ color: "#0f6cbd", weight: 3, opacity: 0.6, dashArray: "8 6" }}
          />
        )}
        {start && (
          <DepartureTerminalMarker
            position={[start.lat, start.lng]}
            label={start.name}
          />
        )}
        {end && (
          <ArrivalTerminalMarker
            position={[end.lat, end.lng]}
            label={end.name}
            arrivalTime={arrivalTime}
          />
        )}
        {userPos && (
          <VehicleMarker position={[userPos.lat, userPos.lng]} heading={heading} />
        )}
        {start && end && !userPos && <FitBounds start={start} end={end} />}
        {userPos && <PanToUser pos={userPos} />}
      </MapContainer>
    </div>
  );
}
