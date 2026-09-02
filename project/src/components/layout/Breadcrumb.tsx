import type { BreadcrumbItem, PageId } from '@/types';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (page: PageId, params?: Record<string, string>) => void;
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ink-300" />}
            {isLast || !item.page ? (
              <span className="text-ink-900 font-medium">{item.label}</span>
            ) : (
              <button
                onClick={() => onNavigate(item.page!, item.params)}
                className="text-ink-500 hover:text-ink-900 transition-colors"
              >
                {item.label}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
