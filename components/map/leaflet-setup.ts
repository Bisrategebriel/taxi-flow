// FR-MP-10
// Must only be imported inside 'use client' components loaded via dynamic(ssr:false)
import L from "leaflet";

function makePin(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700;line-height:1;">${label}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

function makeUserPin(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#0f6cbd;border:3px solid white;
      box-shadow:0 0 0 4px rgba(15,108,189,0.25);">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function makeTerminalIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:#475569;border:3px solid white;
      box-shadow:0 2px 5px rgba(0,0,0,0.35);">
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

export const startIcon = makePin("#0f6cbd", "A");
export const endIcon = makePin("#16a34a", "B");
export const pinIcon = makePin("#64748b", "•");
export const terminalIcon = makeTerminalIcon();
export const userIcon = makeUserPin();
