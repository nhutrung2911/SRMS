interface SparklineProps {
  data: number[];
  direction: 'up' | 'down' | 'flat';
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({ data, direction, width = 80, height = 32, strokeWidth = 1.5 }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - strokeWidth * 2) - strokeWidth,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  const color = direction === 'up' ? '#10B981' : direction === 'down' ? '#EF4444' : '#64748B';
  const gradId = `spark-${direction}-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
