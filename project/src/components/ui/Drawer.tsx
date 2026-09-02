import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative w-full bg-white shadow-2xl flex flex-col h-full animate-slide-in-right', width)}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-ink-200 flex-shrink-0">
          <div className="min-w-0">
            {title && <h3 className="text-lg font-semibold text-ink-900">{title}</h3>}
            {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-200 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
