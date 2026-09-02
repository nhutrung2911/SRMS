import type { PageId } from '@/types';
import type { Toast } from '@/components/ui/Toast';

export interface PageProps {
  navigate: (page: PageId, params?: Record<string, string>) => void;
  addToast?: (toast: Omit<Toast, 'id'>) => void;
}
