import type { BreadcrumbItem, PageId } from '@/types';
import { Breadcrumb } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  onNavigate?: (page: PageId, params?: Record<string, string>) => void;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, onNavigate, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && onNavigate && (
        <div className="mb-3">
          <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-ink-500 mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
