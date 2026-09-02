import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const config = {
  success: { icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-50', border: 'border-success-200' },
  error: { icon: XCircle, color: 'text-danger-600', bg: 'bg-danger-50', border: 'border-danger-200' },
  warning: { icon: AlertCircle, color: 'text-warning-600', bg: 'bg-warning-50', border: 'border-warning-200' },
  info: { icon: Info, color: 'text-info-600', bg: 'bg-info-50', border: 'border-info-200' },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => {
        const c = config[toast.type];
        const Icon = c.icon;
        return (
          <div
            key={toast.id}
            className={cn('flex items-start gap-3 p-4 rounded-xl border bg-white shadow-pop animate-slide-in-right')}
          >
            <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
              <Icon className={cn('w-4.5 h-4.5', c.color)} style={{ width: 18, height: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-900">{toast.title}</div>
              {toast.message && <div className="text-xs text-ink-500 mt-0.5">{toast.message}</div>}
            </div>
            <button onClick={() => onDismiss(toast.id)} className="flex-shrink-0 text-ink-400 hover:text-ink-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
