import { useState } from 'react';
import { formatCurrency } from '@/data';

interface DonutChartProps {
  data: { label: string; value: number; color: string; share: number }[];
  size?: number;
  thickness?: number;
  formatValue?: (v: number) => string;
}

export function DonutChart({ data, size = 200, thickness = 36, formatValue = (v) => formatCurrency(v) }: DonutChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const length = fraction * circumference;
    const seg = {
      ...d,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -offset,
      fraction,
    };
    offset += length;
    return seg;
  });

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={thickness} />
          {segments.map((seg, i) => (
            <circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverIdx === i ? thickness + 4 : thickness}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-width 0.2s', cursor: 'pointer' }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hovered ? (
            <>
              <span className="text-xs text-ink-400">{hovered.label}</span>
              <span className="text-lg font-bold text-ink-900">{formatValue(hovered.value)}</span>
              <span className="text-xs text-ink-500">{hovered.share.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <span className="text-xs text-ink-400">Total</span>
              <span className="text-lg font-bold text-ink-900">{formatValue(total)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-2 w-full">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-ink-50"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ backgroundColor: hoverIdx === i ? '#F8FAFC' : undefined }}
          >
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-ink-600 flex-1">{d.label}</span>
            <span className="text-sm font-medium text-ink-900">{d.share.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
