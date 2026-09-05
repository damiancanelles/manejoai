import { useState } from 'react';
import { money, type MonthBucket } from '../lib/invoiceStats';

// Single hue (sequential default, matching the app's brand indigo) - one
// series, so no legend: the section heading above the chart already says
// what's plotted.
const BAR_COLOR = '#4f46e5';
const GRID_COLOR = '#e1e0d9';
const AXIS_COLOR = '#c3c2b7';
const MUTED_TEXT = '#898781';

function niceMax(dollars: number): number {
  if (dollars <= 0) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(dollars)));
  const normalized = dollars / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function shortLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(y).slice(2)}`;
}

export default function MonthlyIncomeChart({ data }: { data: MonthBucket[] }) {
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);

  const width = 720;
  const height = 220;
  const marginLeft = 64;
  const marginBottom = 24;
  const marginTop = 12;
  const marginRight = 8;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const maxCents = Math.max(...data.map((d) => d.cents), 0);
  const axisMaxDollars = niceMax(maxCents / 100);
  const axisMax = axisMaxDollars * 100;

  const barSlot = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(24, Math.max(barSlot - 6, 2));

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => axisMax * t);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Gross income by month">
        {ticks.map((tickCents, i) => {
          const y = marginTop + plotHeight - (tickCents / axisMax) * plotHeight;
          return (
            <g key={i}>
              <line x1={marginLeft} x2={width - marginRight} y1={y} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={marginLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED_TEXT}>
                {tickCents === 0 ? '$0' : `$${Math.round(tickCents / 100).toLocaleString('en-US')}`}
              </text>
            </g>
          );
        })}
        <line
          x1={marginLeft}
          x2={width - marginRight}
          y1={marginTop + plotHeight}
          y2={marginTop + plotHeight}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = axisMax > 0 ? (d.cents / axisMax) * plotHeight : 0;
          const x = marginLeft + i * barSlot + (barSlot - barWidth) / 2;
          const y = marginTop + plotHeight - barHeight;
          const isHovered = hover?.index === i;
          return (
            <g key={d.key}>
              {barHeight > 0 && (
                <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} ry={4} fill={BAR_COLOR} opacity={isHovered ? 0.85 : 1} />
              )}
              {/* transparent hit area spans the full column, taller than the bar itself */}
              <rect
                x={marginLeft + i * barSlot}
                y={marginTop}
                width={barSlot}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                onPointerMove={(e) => {
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  setHover({ index: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onPointerLeave={() => setHover(null)}
                onFocus={(e) => {
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;
                  const rect = svg.getBoundingClientRect();
                  setHover({ index: i, x: x + barWidth / 2, y: rect.height / 2 });
                }}
                onBlur={() => setHover(null)}
              />
              <text x={marginLeft + i * barSlot + barSlot / 2} y={height - 8} textAnchor="middle" fontSize={10} fill={MUTED_TEXT}>
                {shortLabel(d.key)}
              </text>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded border border-slate-200 bg-white px-2 py-1 text-xs shadow-md"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          <div className="font-semibold text-slate-900">{money(data[hover.index].cents)}</div>
          <div className="text-slate-500">{data[hover.index].label}</div>
        </div>
      )}
    </div>
  );
}
