"use client";
// FR-MP-10..12
import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Bus } from "lucide-react";

interface Props {
  position: L.LatLngExpression;
  label?: string;
}

export default function DepartureTerminalMarker({ position, label }: Props) {
  const icon = useMemo(() => {
    const busHtml = renderToStaticMarkup(
      <Bus size={16} color="#16a34a" strokeWidth={2} />
    );
    return L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:36px;height:36px;">
          <div style="
            width:36px;height:36px;border-radius:50%;
            background:white;border:3px solid #16a34a;
            box-shadow:0 2px 8px rgba(22,163,74,0.35);
            display:flex;align-items:center;justify-content:center;
          ">${busHtml}</div>
          ${label ? `<div style="
            position:absolute;top:calc(100% + 5px);left:50%;
            transform:translateX(-50%);
            background:#16a34a;color:white;
            padding:2px 7px;border-radius:4px;
            font-size:10px;font-weight:700;white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
            font-family:system-ui,sans-serif;
          ">${label}</div>` : ""}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -40],
    });
  }, [label]);

  return <Marker position={position} icon={icon} />;
}
