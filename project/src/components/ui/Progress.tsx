interface ProgressProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  trackClassName?: string;
}

export function Progress({ value, max = 100, color = 'bg-brand-600', className, trackClassName }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`h-2 w-full rounded-full bg-ink-100 overflow-hidden ${trackClassName ?? ''}`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color} ${className ?? ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
