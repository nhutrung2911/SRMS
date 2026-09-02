import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
  none: '',
};

export function Card({ children, className, padding = 'md', hover = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-ink-200/60 shadow-card',
        hover && 'transition-shadow hover:shadow-card-hover',
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-ink-900 truncate">{title}</h3>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
