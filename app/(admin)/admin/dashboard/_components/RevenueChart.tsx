"use client";

export interface MonthlyDataPoint {
  label: string;
  amount: number;
}

interface RevenueChartProps {
  data: MonthlyDataPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const W = 480;
  const H = 160;
  const padL = 48;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(...data.map((d) => d.amount), 1);
  const step = innerW / Math.max(data.length - 1, 1);

  const px = (i: number) => padL + i * step;
  const py = (v: number) => padT + (1 - v / maxVal) * innerH;

  const linePts = data.map((d, i) => `${px(i)},${py(d.amount)}`).join(" ");
  const lineD = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${px(i)} ${py(d.amount)}`)
    .join(" ");
  const areaD =
    lineD +
    ` L${px(data.length - 1)} ${padT + innerH} L${padL} ${padT + innerH} Z`;

  // Y-axis ticks (4 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: padT + (1 - f) * innerH,
    label:
      f === 0
        ? "0"
        : maxVal * f >= 1000
        ? `${((maxVal * f) / 1000).toFixed(0)}k`
        : `${(maxVal * f).toFixed(0)}`,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

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

      {/* Area fill */}
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Line */}
      <polyline
        points={linePts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data point dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={px(i)}
          cy={py(d.amount)}
          r="3"
          fill="currentColor"
        />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={px(i)}
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
