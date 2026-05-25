"use client";

import { useState, useRef, useEffect } from "react";

export interface MonthlyDataPoint {
  label: string;
  amount: number;
}

interface TooltipData {
  x: number;
  y: number;
  index: number;
}

export default function RevenueChart({ data }: { data: MonthlyDataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 240 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Track real pixel dimensions so the viewBox is always 1:1 — no stretching
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
  const padL = 52, padR = 20, padT = 20, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW;

  const px = (i: number) => padL + i * step;
  const py = (v: number) => padT + (1 - v / maxVal) * innerH;

  const lineD = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(d.amount).toFixed(1)}`)
    .join(" ");
  const areaD =
    lineD +
    ` L${px(data.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)}` +
    ` L${padL} ${(padT + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + (1 - f) * innerH,
    label:
      f === 0
        ? "0"
        : maxVal * f >= 1000
        ? `${((maxVal * f) / 1000).toFixed(0)}k`
        : `${(maxVal * f).toFixed(0)}`,
  }));

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let nearest = 0, minDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(px(i) - mouseX);
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
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
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

        {/* Area fill */}
        <path d={areaD} fill="url(#revGrad)" />

        {/* Line */}
        <path
          d={lineD} fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Hover: vertical indicator line */}
        {tooltip && (
          <line
            x1={px(tooltip.index)} y1={padT}
            x2={px(tooltip.index)} y2={padT + innerH}
            stroke="currentColor" strokeOpacity="0.22"
            strokeWidth="1.5" strokeDasharray="4 3"
          />
        )}

        {/* Data-point dots */}
        {data.map((d, i) => {
          const active = tooltip?.index === i;
          return (
            <circle
              key={i}
              cx={px(i)} cy={py(d.amount)}
              r={active ? 5.5 : 3}
              fill={active ? "var(--color-card, white)" : "currentColor"}
              stroke="currentColor"
              strokeWidth={active ? 2.5 : 0}
              fillOpacity={active ? 1 : 0.7}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const active = tooltip?.index === i;
          return (
            <text
              key={i}
              x={px(i)} y={H - 10}
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
            ETB {data[tooltip.index].amount.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
