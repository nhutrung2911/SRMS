import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mb-4 text-ink-400">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Unable to load data', description = 'Something went wrong. Please try again.', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-danger-50 flex items-center justify-center mb-4 text-danger-500">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}
