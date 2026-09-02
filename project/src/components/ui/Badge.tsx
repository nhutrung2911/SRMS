import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'brand'
  | 'excellent'
  | 'good'
  | 'average'
  | 'at-risk'
  | 'high'
  | 'medium'
  | 'low'
  | 'critical';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-100 text-ink-600 border-ink-200',
  success: 'bg-success-50 text-success-700 border-success-200',
  danger: 'bg-danger-50 text-danger-700 border-danger-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  info: 'bg-info-50 text-info-700 border-info-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
  excellent: 'bg-success-50 text-success-700 border-success-200',
  good: 'bg-info-50 text-info-700 border-info-200',
  average: 'bg-warning-50 text-warning-700 border-warning-200',
  'at-risk': 'bg-danger-50 text-danger-700 border-danger-200',
  high: 'bg-danger-50 text-danger-700 border-danger-200',
  medium: 'bg-warning-50 text-warning-700 border-warning-200',
  low: 'bg-ink-100 text-ink-600 border-ink-200',
  critical: 'bg-danger-600 text-white border-danger-700',
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: 'bg-ink-400',
  success: 'bg-success-500',
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
  brand: 'bg-brand-500',
  excellent: 'bg-success-500',
  good: 'bg-info-500',
  average: 'bg-warning-500',
  'at-risk': 'bg-danger-500',
  high: 'bg-danger-500',
  medium: 'bg-warning-500',
  low: 'bg-ink-400',
  critical: 'bg-white',
};

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}
