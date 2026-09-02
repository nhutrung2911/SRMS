import { useState } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiGrid } from '@/components/ui/KpiCard';
import { DataTable } from '@/components/ui/DataTable';
import { BarChart } from '@/components/charts/BarChart';
import { promotionKpis, promotions, formatCurrency } from '@/data';
import type { PromotionRow } from '@/types';
import { Search, ChevronDown } from 'lucide-react';

const statusVariant: Record<PromotionRow['status'], 'success' | 'info' | 'neutral' | 'warning'> = {
  active: 'success', scheduled: 'info', ended: 'neutral', draft: 'warning',
};

export function PromotionsPage({ navigate }: PageProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = promotions.filter((p) => {
    if (search && !p.campaign.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== 'all' && p.status !== status) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Promotion Performance"
        subtitle="Measure the real impact of promotions on revenue, profit, and customer behavior."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Promotions' }]}
      />

      <KpiGrid kpis={promotionKpis} />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
        </div>

        <DataTable<PromotionRow>
          columns={[
            { key: 'campaign', label: 'Campaign', render: (p) => (
              <div>
                <div className="font-medium text-ink-900">{p.campaign}</div>
                <div className="text-xs text-ink-400">{p.period}</div>
              </div>
            )},
            { key: 'products', label: 'Products', align: 'center', render: (p) => `${p.products.length} items` },
            { key: 'orders', label: 'Orders', align: 'right' },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (p) => formatCurrency(p.revenue) },
            { key: 'profit', label: 'Profit', align: 'right', render: (p) => formatCurrency(p.profit) },
            { key: 'discountCost', label: 'Discount Cost', align: 'right', render: (p) => formatCurrency(p.discountCost) },
            { key: 'roi', label: 'ROI', align: 'right', render: (p) => p.roi > 0 ? `${p.roi}%` : '—' },
            { key: 'status', label: 'Status', align: 'center', render: (p) => (
              <Badge variant={statusVariant[p.status]} dot>{p.status}</Badge>
            )},
          ]}
          data={filtered}
          rowKey={(p) => p.id}
          onRowClick={(p) => navigate('promotion-detail', { promotionId: p.id })}
        />
      </Card>
    </div>
  );
}
