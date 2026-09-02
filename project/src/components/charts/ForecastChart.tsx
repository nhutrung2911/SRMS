import { useState, useMemo } from 'react';
import type { ForecastPoint } from '@/types';
import { formatCurrency } from '@/data';

interface ForecastChartProps {
  data: ForecastPoint[];
  height?: number;
}

export function ForecastChart({ data, height = 360 }: ForecastChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const padding = { top: 24, right: 20, bottom: 36, left: 68 };
  const width = 900;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { maxVal, minVal, xPositions, scaleX } = useMemo(() => {
    const allVals = data.flatMap((d) => [d.actual, d.forecast, d.lower, d.upper].filter((v): v is number => v !== null));
    const max = Math.max(...allVals) * 1.08;
    const min = Math.min(...allVals) * 0.85;
    const stepX = innerW / Math.max(1, data.length - 1);
    const xPs = data.map((_, i) => padding.left + i * stepX);
    const sc = (val: number) => padding.top + innerH - ((val - min) / (max - min)) * innerH;
    return { maxVal: max, minVal: min, xPositions: xPs, scaleX: sc };
  }, [data, innerW, innerH]);

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => minVal + ((maxVal - minVal) / yTicks) * i);

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

  // Build actual line path (first 20 points)
  const actualData = data.filter((d) => d.actual !== null);
  const actualPath = actualData
    .map((d, i) => {
      const dataIdx = data.indexOf(d);
      return `${i === 0 ? 'M' : 'L'} ${xPositions[dataIdx].toFixed(1)} ${scaleX(d.actual!).toFixed(1)}`;
    })
    .join(' ');

  // Build forecast line path (last actual + forecast points)
  const forecastData = data.filter((d) => d.forecast !== null);
  const lastActual = actualData[actualData.length - 1];
  const lastActualIdx = data.indexOf(lastActual);
  const forecastStart = `M ${xPositions[lastActualIdx].toFixed(1)} ${scaleX(lastActual.actual!).toFixed(1)} `;
  const forecastPath =
    forecastStart +
    forecastData
      .map((d) => {
        const dataIdx = data.indexOf(d);
        return `L ${xPositions[dataIdx].toFixed(1)} ${scaleX(d.forecast!).toFixed(1)}`;
      })
      .join(' ');

  // Confidence band
  const upperPath = forecastData
    .map((d, i) => {
      const dataIdx = data.indexOf(d);
      return `${i === 0 ? 'M' : 'L'} ${xPositions[dataIdx].toFixed(1)} ${scaleX(d.upper!).toFixed(1)}`;
    })
    .join(' ');
  const lowerPath = forecastData
    .slice()
    .reverse()
    .map((d) => {
      const dataIdx = data.indexOf(d);
      return `L ${xPositions[dataIdx].toFixed(1)} ${scaleX(d.lower!).toFixed(1)}`;
    })
    .join(' ');
  const bandPath = `${upperPath} ${lowerPath} Z`;

  // Divider line between actual and forecast
  const dividerX = xPositions[lastActualIdx];

  const labelInterval = Math.max(1, Math.ceil(data.length / 12));

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
        <defs>
          <linearGradient id="forecast-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E66F3" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1E66F3" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {tickValues.map((tv, i) => {
          const y = scaleX(tv);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#94A3B8" fontFamily="Inter">
                {formatCurrency(tv)}
              </text>
            </g>
          );
        })}

        {/* Forecast region background */}
        <rect
          x={dividerX}
          y={padding.top}
          width={width - padding.right - dividerX}
          height={innerH}
          fill="#F8FAFC"
        />

        {/* Divider line */}
        <line
          x1={dividerX}
          y1={padding.top}
          x2={dividerX}
          y2={padding.top + innerH}
          stroke="#CBD5E1"
          strokeWidth={1}
          strokeDasharray="5 3"
        />
        <text x={dividerX + 8} y={padding.top + 14} fontSize="11" fill="#94A3B8" fontFamily="Inter" fontWeight="500">
          Forecast →
        </text>

        {/* Confidence band */}
        <path d={bandPath} fill="url(#forecast-band)" />

        {/* Actual line */}
        <path d={actualPath} fill="none" stroke="#1E66F3" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Forecast line (dashed) */}
        <path d={forecastPath} fill="none" stroke="#1E66F3" strokeWidth={2.5} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={xPositions[i]} y={height - padding.bottom + 20} textAnchor="middle" fontSize="11" fill="#94A3B8" fontFamily="Inter">
              {d.label}
            </text>
          );
        })}

        {/* Hover indicator */}
        {hoverIdx !== null && (
          <g>
            <line x1={xPositions[hoverIdx]} y1={padding.top} x2={xPositions[hoverIdx]} y2={padding.top + innerH} stroke="#CBD5E1" strokeWidth={1} strokeDasharray="4 2" />
            {data[hoverIdx].actual !== null && (
              <circle cx={xPositions[hoverIdx]} cy={scaleX(data[hoverIdx].actual!)} r={5} fill="white" stroke="#1E66F3" strokeWidth={2.5} />
            )}
            {data[hoverIdx].forecast !== null && (
              <circle cx={xPositions[hoverIdx]} cy={scaleX(data[hoverIdx].forecast!)} r={5} fill="white" stroke="#1E66F3" strokeWidth={2.5} />
            )}
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
          {data[hoverIdx].actual !== null && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-ink-300">Actual:</span>
              <span className="font-medium">{formatCurrency(data[hoverIdx].actual!)}</span>
            </div>
          )}
          {data[hoverIdx].forecast !== null && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400" />
                <span className="text-ink-300">Forecast:</span>
                <span className="font-medium">{formatCurrency(data[hoverIdx].forecast!)}</span>
              </div>
              <div className="text-ink-400 mt-1">
                Range: {formatCurrency(data[hoverIdx].lower!)} – {formatCurrency(data[hoverIdx].upper!)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-0 right-0 flex items-center gap-4 text-xs text-ink-500">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-brand-600 rounded" />
          <span>Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-brand-600" />
          <span>Forecast</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 bg-brand-50 rounded" />
          <span>Confidence</span>
        </div>
      </div>
    </div>
  );
}
