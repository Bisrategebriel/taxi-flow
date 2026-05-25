"use client";

import { Route } from "lucide-react";

export type RoutePreviewData = {
  id: string;
  name: string;
  startName: string;
  endName: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  via: string;
};

function RouteSVG({ route }: { route: RoutePreviewData }) {
  const W = 420, H = 260, pad = 60;

  const lats = [route.startLat, route.endLat];
  const lngs = [route.startLng, route.endLng];
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

  const lR = (maxLat - minLat) || 0.02;
  const lgR = (maxLng - minLng) || 0.02;
  const lp = lR * 0.4, gp = lgR * 0.4;

  const aMinLat = minLat - lp, aMaxLat = maxLat + lp;
  const aMinLng = minLng - gp, aMaxLng = maxLng + gp;
  const aLat = aMaxLat - aMinLat, aLng = aMaxLng - aMinLng;

  const inner = { w: W - 2 * pad, h: H - 2 * pad };
  function toXY(lat: number, lng: number) {
    return {
      x: pad + ((lng - aMinLng) / aLng) * inner.w,
      y: pad + ((aMaxLat - lat) / aLat) * inner.h,
    };
  }

  const start = toXY(route.startLat, route.startLng);
  const end = toXY(route.endLat, route.endLng);

  // Control points for a gentle bezier curve
  const dx = end.x - start.x, dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const perpX = (-dy / len) * 22;
  const perpY = (dx / len) * 22;
  const midX = (start.x + end.x) / 2 + perpX;
  const midY = (start.y + end.y) / 2 + perpY;

  const path = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
      <rect width={W} height={H} fill="#e8f4e9" rx="12" />

      {/* Subtle grid */}
      {[0.33, 0.67].map((f) => (
        <g key={f}>
          <line x1={pad} y1={pad + f * inner.h} x2={W - pad} y2={pad + f * inner.h}
            stroke="rgba(0,60,20,0.07)" strokeWidth="1" />
          <line x1={pad + f * inner.w} y1={pad} x2={pad + f * inner.w} y2={H - pad}
            stroke="rgba(0,60,20,0.07)" strokeWidth="1" />
        </g>
      ))}

      {/* Dashed route path */}
      <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2.5"
        strokeDasharray="7 4" strokeLinecap="round" />

      {/* Start terminal */}
      <circle cx={start.x} cy={start.y} r={14} fill="#3b82f6" fillOpacity={0.12} />
      <circle cx={start.x} cy={start.y} r={8} fill="#3b82f6" stroke="white" strokeWidth={2} />
      <circle cx={start.x} cy={start.y} r={3} fill="white" />

      {/* End terminal */}
      <circle cx={end.x} cy={end.y} r={14} fill="#3b82f6" fillOpacity={0.12} />
      <circle cx={end.x} cy={end.y} r={8} fill="#3b82f6" stroke="white" strokeWidth={2} />
      <circle cx={end.x} cy={end.y} r={3} fill="white" />

      {/* Start label */}
      {(() => {
        const w = Math.max(36, route.startName.split(" ")[0].length * 5.5 + 10);
        return (
          <g>
            <rect x={start.x - w / 2} y={start.y + 14} width={w} height={17} rx={3.5} fill="rgba(12,12,12,0.82)" />
            <text x={start.x} y={start.y + 22.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="8.5" fill="white" fontFamily="system-ui, sans-serif">
              {route.startName.split(" ")[0]}
            </text>
          </g>
        );
      })()}

      {/* End label */}
      {(() => {
        const w = Math.max(36, route.endName.split(" ")[0].length * 5.5 + 10);
        return (
          <g>
            <rect x={end.x - w / 2} y={end.y - 31} width={w} height={17} rx={3.5} fill="rgba(12,12,12,0.82)" />
            <text x={end.x} y={end.y - 22.5} textAnchor="middle" dominantBaseline="middle"
              fontSize="8.5" fill="white" fontFamily="system-ui, sans-serif">
              {route.endName.split(" ")[0]}
            </text>
          </g>
        );
      })()}

      {/* Via label on midpoint */}
      {route.via && (
        <text x={midX} y={midY - 8} textAnchor="middle" fontSize="8" fill="#3b82f6"
          fontFamily="system-ui, sans-serif" fontWeight="500">
          via {route.via}
        </text>
      )}
    </svg>
  );
}

export default function RoutePreviewPanel({ route }: { route: RoutePreviewData | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 lg:sticky lg:top-4">
      <div className="flex items-center gap-2">
        <Route size={15} className="text-primary" />
        <h2 className="text-sm font-semibold">Route Preview</h2>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/50" style={{ height: 260 }}>
        {route ? (
          <RouteSVG route={route} />
        ) : (
          <svg viewBox="0 0 420 260" width="100%" height="100%" style={{ display: "block" }}>
            <rect width="420" height="260" fill="#e8f4e9" rx="12" />
            {[0.33, 0.67].map((f) => (
              <g key={f}>
                <line x1="60" y1={60 + f * 140} x2="360" y2={60 + f * 140}
                  stroke="rgba(0,60,20,0.07)" strokeWidth="1" />
                <line x1={60 + f * 300} y1="60" x2={60 + f * 300} y2="200"
                  stroke="rgba(0,60,20,0.07)" strokeWidth="1" />
              </g>
            ))}
            {/* Placeholder dashed line */}
            <path d="M 100 200 Q 210 120 320 80" fill="none" stroke="#9ca3af"
              strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
            <circle cx="100" cy="200" r="7" fill="#9ca3af" />
            <circle cx="320" cy="80" r="7" fill="#9ca3af" />
            <text x="210" y="145" textAnchor="middle" fontSize="11" fill="#6b7280"
              fontFamily="system-ui, sans-serif">
              Select a route to preview
            </text>
          </svg>
        )}
      </div>

      {route && (
        <div className="text-xs text-muted-foreground px-1">
          <span className="font-medium text-foreground">{route.startName}</span>
          {route.via && <> <span className="text-primary/70">→</span> <span>{route.via}</span></>}
          <> <span className="text-primary/70">→</span> <span className="font-medium text-foreground">{route.endName}</span></>
        </div>
      )}
    </div>
  );
}
