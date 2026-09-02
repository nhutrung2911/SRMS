import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-ink-200/60 p-5', className)}>
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function SkeletonRow({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-ink-100">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
