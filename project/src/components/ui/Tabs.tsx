import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-ink-200 overflow-x-auto scrollbar-thin', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
              isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-md font-medium',
                isActive ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500',
              )}>
                {tab.count}
              </span>
            )}
            {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
          </button>
        );
      })}
    </div>
  );
}
