"use client";

export type TerminalPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  is_active: boolean;
};

function shortLabel(name: string) {
  const w = name.split(" ");
  return w.length > 1 ? w[0] : name.slice(0, 7);
}

export default function TerminalMiniMap({ terminals }: { terminals: TerminalPin[] }) {
  const W = 420, H = 300;
  const pad = 44;

  if (terminals.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-[#e8f4e9] rounded-xl">
        No terminals to map
      </div>
    );
  }

  const lats = terminals.map((t) => t.lat);
  const lngs = terminals.map((t) => t.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const latRange = (maxLat - minLat) || 0.05;
  const lngRange = (maxLng - minLng) || 0.05;

  /* 20 % padding so no pin sits at the exact edge */
  const lp = latRange * 0.2, rp = lngRange * 0.2;
  const aMinLat = minLat - lp, aMaxLat = maxLat + lp;
  const aMinLng = minLng - rp, aMaxLng = maxLng + rp;
  const aLat = aMaxLat - aMinLat, aLng = aMaxLng - aMinLng;

  const inner = { w: W - 2 * pad, h: H - 2 * pad };

  function pos(lat: number, lng: number) {
    return {
      x: pad + ((lng - aMinLng) / aLng) * inner.w,
      y: pad + ((aMaxLat - lat) / aLat) * inner.h,
    };
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      className="rounded-xl"
      style={{ display: "block" }}
    >
      {/* Map background */}
      <rect width={W} height={H} fill="#e8f4e9" rx="12" />

      {/* Subtle grid */}
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f}>
          <line
            x1={pad} y1={pad + f * inner.h} x2={W - pad} y2={pad + f * inner.h}
            stroke="rgba(0,60,20,0.08)" strokeWidth="1"
          />
          <line
            x1={pad + f * inner.w} y1={pad} x2={pad + f * inner.w} y2={H - pad}
            stroke="rgba(0,60,20,0.08)" strokeWidth="1"
          />
        </g>
      ))}

      {/* Pins */}
      {terminals.map((t) => {
        const { x, y } = pos(t.lat, t.lng);
        const label = shortLabel(t.name);
        const labelW = Math.max(32, label.length * 5.8 + 10);
        const fillColor = t.is_active ? "#3b82f6" : "#6b7280";

        return (
          <g key={t.id}>
            {/* Outer halo */}
            <circle cx={x} cy={y} r={15} fill={fillColor} fillOpacity={0.14} />
            {/* Pin ring */}
            <circle cx={x} cy={y} r={9} fill={fillColor} stroke="white" strokeWidth={2} />
            {/* Inner dot */}
            <circle cx={x} cy={y} r={3} fill="white" />
            {/* Label box */}
            <rect
              x={x - labelW / 2} y={y + 14}
              width={labelW} height={17}
              rx={3.5}
              fill="rgba(12,12,12,0.82)"
            />
            <text
              x={x} y={y + 22.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8.5"
              fill="white"
              fontFamily="system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
