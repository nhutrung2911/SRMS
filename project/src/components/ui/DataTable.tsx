import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface TableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function DataTable<T>({ columns, data, rowKey, onRowClick, emptyState, className, isLoading }: DataTableProps<T>) {
  return (
    <div className={cn('w-full overflow-x-auto scrollbar-thin', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wider whitespace-nowrap',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.align !== 'right' && col.align !== 'center' && 'text-left',
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16 text-center">
                <div className="flex flex-col items-center justify-center text-ink-400">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
                  <span className="text-sm">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                {emptyState ?? <span className="text-ink-400">No data available</span>}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-ink-100 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-ink-50/60',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-ink-700 whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                  >
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
