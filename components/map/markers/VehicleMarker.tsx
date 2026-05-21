"use client";
// FR-TR-03, FR-MP-10
import { useMemo, useEffect, useRef, useCallback } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

interface Props {
  position: L.LatLngExpression;
  heading?: number;
}

// Keeps rotation within [-90, 90] so the bus is never upside-down.
// Uses scaleY(-1) for southbound headings, preserving left/right orientation.
// Note: L.divIcon is used (not L.icon) so the inner <img> can be rotated
// independently from the outer container that Leaflet uses for map positioning.
function normalizeHeading(h: number): { angle: number; flipY: boolean } {
  const deg = ((h % 360) + 360) % 360;
  if (deg > 90 && deg <= 270) {
    return { angle: deg - 180, flipY: true };
  }
  return { angle: deg > 270 ? deg - 360 : deg, flipY: false };
}

export default function VehicleMarker({ position, heading = 0 }: Props) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<img src="/minibus.png" class="tf-vehicle-img" style="width:48px;height:48px;display:block;" />`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28],
      }),
    []
  );

  const applyRotation = useCallback((h: number) => {
    const el = markerRef.current?.getElement();
    if (!el) return;
    const img = el.querySelector<HTMLImageElement>(".tf-vehicle-img");
    if (!img) return;
    const { angle, flipY } = normalizeHeading(h);
    img.style.transform = `rotate(${angle}deg) scaleY(${flipY ? -1 : 1})`;
  }, []);

  useEffect(() => {
    applyRotation(heading);
  }, [heading, applyRotation]);

  return (
    <Marker
      position={position}
      icon={icon}
      ref={markerRef}
      eventHandlers={{ add: () => applyRotation(heading) }}
    />
  );
}
