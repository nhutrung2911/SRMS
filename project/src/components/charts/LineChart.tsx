import { useState, useMemo } from 'react';
import type { TrendPoint } from '@/types';
import { formatCurrency } from '@/data';

interface LineChartProps {
  data: TrendPoint[];
  series: ('revenue' | 'profit' | 'orders')[];
  height?: number;
  formatValue?: (v: number) => string;
}

const seriesConfig = {
  revenue: { color: '#1E66F3', label: 'Revenue' },
  profit: { color: '#10B981', label: 'Profit' },
  orders: { color: '#F59E0B', label: 'Orders' },
};

export function LineChart({ data, series, height = 320, formatValue = (v) => formatCurrency(v) }: LineChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const padding = { top: 20, right: 16, bottom: 32, left: 64 };
  const width = 800;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { maxVal, scales, xPositions } = useMemo(() => {
    const allValues = data.flatMap((d) => series.map((s) => d[s]));
    const max = Math.max(...allValues) * 1.1;
    const min = 0;
    const stepX = innerW / Math.max(1, data.length - 1);
    const xPs = data.map((_, i) => padding.left + i * stepX);
    const sc = series.reduce((acc, s) => {
      acc[s] = (val: number) => padding.top + innerH - ((val - min) / (max - min)) * innerH;
      return acc;
    }, {} as Record<string, (val: number) => number>);
    return { maxVal: max, scales: sc, xPositions: xPs };
  }, [data, series, innerW, innerH]);

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxVal / yTicks) * i);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let minDist = Infinity;
    xPositions.forEach((xp, i) => {
      const dist = Math.abs(xp - x);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoverIdx(closest);
  };

  const labelInterval = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid lines */}
        {tickValues.map((tv, i) => {
          const y = padding.top + innerH - (tv / maxVal) * innerH;
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94A3B8" fontFamily="Inter">
                {formatValue(tv)}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={xPositions[i]}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#94A3B8"
              fontFamily="Inter"
            >
              {d.label}
            </text>
          );
        })}

        {/* Series lines */}
        {series.map((s) => {
          const cfg = seriesConfig[s];
          const path = data
            .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPositions[i].toFixed(1)} ${scales[s](d[s]).toFixed(1)}`)
            .join(' ');
          const areaPath = `${path} L ${xPositions[data.length - 1].toFixed(1)} ${padding.top + innerH} L ${xPositions[0].toFixed(1)} ${padding.top + innerH} Z`;
          const gradId = `line-grad-${s}`;
          return (
            <g key={s}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cfg.color} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {series.length === 1 && <path d={areaPath} fill={`url(#${gradId})`} />}
              <path d={path} fill="none" stroke={cfg.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}

        {/* Hover indicator */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={xPositions[hoverIdx]}
              y1={padding.top}
              x2={xPositions[hoverIdx]}
              y2={padding.top + innerH}
              stroke="#CBD5E1"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            {series.map((s) => (
              <circle
                key={s}
                cx={xPositions[hoverIdx]}
                cy={scales[s](data[hoverIdx][s])}
                r={5}
                fill="white"
                stroke={seriesConfig[s].color}
                strokeWidth={2.5}
              />
            ))}
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && (
        <div
          className="absolute bg-ink-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-pop z-10 whitespace-nowrap"
          style={{
            left: `${(xPositions[hoverIdx] / width) * 100}%`,
            top: 4,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-ink-200 mb-1">{data[hoverIdx].label}</div>
          {series.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: seriesConfig[s].color }} />
              <span className="text-ink-300">{seriesConfig[s].label}:</span>
              <span className="font-medium">{formatValue(data[hoverIdx][s])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
