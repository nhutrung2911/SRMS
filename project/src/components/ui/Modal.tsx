import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in', width)}>
        {title && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-ink-200">
            <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto scrollbar-thin px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
