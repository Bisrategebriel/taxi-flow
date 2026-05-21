"use client";
// FR-TR-02, FR-MP-10
import { useMemo } from "react";
import { Marker, Circle } from "react-leaflet";
import L from "leaflet";

interface Props {
  position: L.LatLngExpression;
  accuracyMeters?: number;
}

export default function UserLocationMarker({ position, accuracyMeters }: Props) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div class="tf-user-pulse"><div class="tf-user-dot"></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
      }),
    []
  );

  return (
    <>
      {accuracyMeters != null && (
        <Circle
          center={position}
          radius={accuracyMeters}
          pathOptions={{
            color: "#0f6cbd",
            fillColor: "#0f6cbd",
            fillOpacity: 0.07,
            weight: 1,
            opacity: 0.25,
          }}
        />
      )}
      <Marker position={position} icon={icon} />
    </>
  );
}
