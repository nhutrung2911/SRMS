import { Card } from './Card';
import { TrendIndicator } from './TrendIndicator';
import { Sparkline } from '@/components/charts/Sparkline';
import type { Kpi as KpiType } from '@/types';

export function KpiCard({ kpi }: { kpi: KpiType }) {
  return (
    <Card padding="md" hover className="group">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-ink-500">{kpi.label}</span>
        {kpi.spark && (
          <div className="w-20 h-8 opacity-70 group-hover:opacity-100 transition-opacity">
            <Sparkline data={kpi.spark} direction={kpi.direction} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-ink-900 tracking-tight mb-1.5">{kpi.value}</div>
      <TrendIndicator change={kpi.change} direction={kpi.direction} sublabel={kpi.sublabel} />
    </Card>
  );
}

export function KpiGrid({ kpis }: { kpis: KpiType[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}
