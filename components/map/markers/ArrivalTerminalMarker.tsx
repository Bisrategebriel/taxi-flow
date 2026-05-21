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
  arrivalTime?: string;
}

export default function ArrivalTerminalMarker({ position, label, arrivalTime }: Props) {
  const icon = useMemo(() => {
    const busHtml = renderToStaticMarkup(
      <Bus size={13} color="white" strokeWidth={2.5} />
    );
    return L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:36px;height:36px;">
          <div style="
            width:36px;height:36px;
            border-radius:50% 50% 50% 0;
            background:#dc2626;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 8px rgba(220,38,38,0.45);
            display:flex;align-items:center;justify-content:center;
          ">
            <div style="transform:rotate(45deg)">${busHtml}</div>
          </div>
          ${label ? `<div style="
            position:absolute;top:calc(100% + 5px);left:50%;
            transform:translateX(-50%);
            background:#dc2626;color:white;
            padding:2px 7px;border-radius:4px;
            font-size:10px;font-weight:700;white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
            font-family:system-ui,sans-serif;
          ">${label}</div>` : ""}
          ${arrivalTime ? `<div style="
            position:absolute;top:calc(100% + 27px);left:50%;
            transform:translateX(-50%);
            background:#dc2626;color:white;
            padding:2px 7px;border-radius:4px;
            font-size:10px;font-weight:700;white-space:nowrap;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
            font-family:system-ui,sans-serif;
          ">Arrive by ${arrivalTime}</div>` : ""}
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [16, 38],
      popupAnchor: [2, -42],
    });
  }, [label, arrivalTime]);

  return <Marker position={position} icon={icon} />;
}
