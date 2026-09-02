import { useState } from 'react';
import { formatCurrency } from '@/data';

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  formatValue?: (v: number) => string;
  maxBars?: number;
}

export function BarChart({ data, height = 280, formatValue = (v) => formatCurrency(v), maxBars = 12 }: BarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value));
  const visible = data.slice(0, maxBars);
  const barHeight = Math.min(36, (height - 20) / visible.length);
  const gap = 8;

  return (
    <div className="w-full space-y-2" style={{ height }}>
      {visible.map((d, i) => {
        const pct = (d.value / max) * 100;
        const isHover = hoverIdx === i;
        return (
          <div
            key={d.label}
            className="group flex items-center gap-3"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ height: barHeight }}
          >
            <div className="w-24 text-sm text-ink-600 truncate flex-shrink-0 text-right">{d.label}</div>
            <div className="flex-1 relative h-full flex items-center">
              <div className="absolute inset-0 bg-ink-50 rounded-md" />
              <div
                className="relative h-full rounded-md transition-all duration-500 flex items-center justify-end px-2"
                style={{
                  width: `${pct}%`,
                  backgroundColor: d.color ?? '#1E66F3',
                  opacity: isHover ? 1 : 0.85,
                }}
              >
                <span
                  className={`text-xs font-medium transition-opacity ${
                    pct > 20 ? 'text-white' : 'text-ink-700'
                  }`}
                  style={{ paddingLeft: pct > 20 ? 0 : `${(100 / pct) * 20}%` }}
                >
                  {formatValue(d.value)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
