"use client";

export interface DailyDataPoint {
  label: string;
  count: number;
}

interface WeeklyTripsChartProps {
  data: DailyDataPoint[];
}

export default function WeeklyTripsChart({ data }: WeeklyTripsChartProps) {
  const W = 480;
  const H = 160;
  const padL = 36;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const barGap = 8;
  const barW = innerW / data.length - barGap;

  const px = (i: number) => padL + i * (barW + barGap) + barGap / 2;
  const barH = (v: number) => (v / maxVal) * innerH;
  const barY = (v: number) => padT + innerH - barH(v);

  // Y-axis ticks
  const yTicks = [0, 0.5, 1].map((f) => ({
    y: padT + (1 - f) * innerH,
    label: Math.round(maxVal * f).toString(),
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t.label}
          x1={padL}
          y1={t.y}
          x2={W - padR}
          y2={t.y}
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1"
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((t) => (
        <text
          key={t.label}
          x={padL - 6}
          y={t.y + 4}
          textAnchor="end"
          fontSize="10"
          fill="currentColor"
          fillOpacity="0.45"
        >
          {t.label}
        </text>
      ))}

      {/* Bars */}
      {data.map((d, i) => (
        <g key={i}>
          <rect
            x={px(i)}
            y={barY(d.count)}
            width={barW}
            height={Math.max(barH(d.count), 2)}
            rx="4"
            ry="4"
            fill="currentColor"
            fillOpacity="0.85"
          />
        </g>
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={px(i) + barW / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize="10"
          fill="currentColor"
          fillOpacity="0.5"
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}
