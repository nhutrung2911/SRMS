import { cn } from '@/lib/utils';
import type { TrendDirection } from '@/types';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  change: number;
  direction: TrendDirection;
  sublabel?: string;
  className?: string;
  showIcon?: boolean;
}

export function TrendIndicator({ change, direction, sublabel, className, showIcon = true }: TrendIndicatorProps) {
  const isUp = direction === 'up';
  const isDown = direction === 'down';
  const isFlat = direction === 'flat';
  const color = isUp ? 'text-success-600' : isDown ? 'text-danger-600' : 'text-ink-500';
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const bgColor = isUp ? 'bg-success-50' : isDown ? 'bg-danger-50' : 'bg-ink-100';

  if (change === null || change === undefined) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold text-ink-500 bg-ink-100">
          —
        </span>
        {sublabel && <span className="text-xs text-ink-400">{sublabel}</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold', color, bgColor)}>
        {showIcon && <Icon className="w-3 h-3" />}
        {Math.abs(change)}%
      </span>
      {sublabel && <span className="text-xs text-ink-400">{sublabel}</span>}
    </div>
  );
}
