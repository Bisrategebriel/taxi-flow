"use client";

import { useState, useRef, useEffect } from "react";

export interface DailyDataPoint {
  label: string;
  count: number;
}

interface TooltipData {
  x: number;
  y: number;
  index: number;
}

export default function WeeklyTripsChart({ data }: { data: DailyDataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 240 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w: W, h: H } = dims;
  const padL = 40, padR = 16, padT = 16, padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const barTotalW = innerW / data.length;
  const barGapFrac = 0.28;
  const barW = barTotalW * (1 - barGapFrac);
  const barGap = barTotalW * barGapFrac;

  const barX = (i: number) => padL + i * barTotalW + barGap / 2;
  const barH = (v: number) => Math.max((v / maxVal) * innerH, v > 0 ? 3 : 0);
  const barY = (v: number) => padT + innerH - barH(v);
  const barCX = (i: number) => barX(i) + barW / 2;

  const yTicks = [0, 0.5, 1].map((f) => ({
    y: padT + (1 - f) * innerH,
    label:
      f === 0 ? "0"
      : maxVal * f >= 1000 ? `${((maxVal * f) / 1000).toFixed(0)}k`
      : `${Math.round(maxVal * f)}`,
  }));

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let nearest = 0, minDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(barCX(i) - mouseX);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });
    setTooltip({ x: mouseX, y: mouseY, index: nearest });
  }

  const isRight = tooltip ? tooltip.x > W * 0.7 : false;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-crosshair select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Horizontal grid */}
        {yTicks.map((t) => (
          <line
            key={t.label}
            x1={padL} y1={t.y} x2={W - padR} y2={t.y}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <text
            key={t.label}
            x={padL - 8} y={t.y + 4}
            textAnchor="end" fontSize="11"
            fill="currentColor" fillOpacity="0.45"
          >
            {t.label}
          </text>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const active = tooltip?.index === i;
          const h = barH(d.count);
          const y = barY(d.count);
          return (
            <rect
              key={i}
              x={barX(i)} y={y}
              width={barW} height={h}
              rx="4" ry="4"
              fill={active ? "currentColor" : "url(#barGrad)"}
              fillOpacity={active ? 1 : 0.72}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const active = tooltip?.index === i;
          return (
            <text
              key={i}
              x={barCX(i)} y={H - 8}
              textAnchor="middle" fontSize="11"
              fill="currentColor"
              fillOpacity={active ? 1 : 0.5}
              fontWeight={active ? "600" : "normal"}
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* HTML tooltip */}
      {tooltip && data[tooltip.index] && (
        <div
          className="pointer-events-none absolute z-20 min-w-30 rounded-lg border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-sm text-xs"
          style={{
            top: Math.max(8, tooltip.y - 58),
            ...(isRight
              ? { right: W - tooltip.x + 14 }
              : { left: tooltip.x + 14 }),
          }}
        >
          <p className="font-semibold text-foreground">{data[tooltip.index].label}</p>
          <p className="text-muted-foreground mt-0.5">
            {data[tooltip.index].count} trip{data[tooltip.index].count !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
