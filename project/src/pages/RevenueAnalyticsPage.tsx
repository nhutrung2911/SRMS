import { useState } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiGrid } from '@/components/ui/KpiCard';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import {
  revenueAnalyticsKpis,
  revenueTrendMonthly,
  categoryRevenue,
  channelRevenue,
  revenueByProduct,
  revenueByCustomerSegment,
  formatCurrency,
} from '@/data';
import { Calendar, Download, ChevronDown } from 'lucide-react';

export function RevenueAnalyticsPage({ addToast }: PageProps) {
  const [category, setCategory] = useState('all');
  const [segment, setSegment] = useState('all');
  const [channel, setChannel] = useState('all');

  const filters = [
    { label: 'Date Range', value: 'Last 30 Days', options: ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year'] },
    { label: 'Category', value: category, set: setCategory, options: ['all', 'Electronics', 'Fashion', 'Sports', 'Beauty', 'Home'] },
    { label: 'Customer Segment', value: segment, set: setSegment, options: ['all', 'Champions', 'Loyal', 'New', 'At Risk'] },
    { label: 'Sales Channel', value: channel, set: setChannel, options: ['all', 'Website', 'Mobile App', 'Marketplace', 'In-Store'] },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Revenue Analytics"
        subtitle="Deep dive into revenue, profit, and growth metrics across your business."
        breadcrumbs={[{ label: 'Revenue' }, { label: 'Revenue Analytics' }]}
        actions={
          <>
            <Button variant="secondary" size="md" icon={<Calendar className="w-4 h-4" />}>
              Last 30 Days <ChevronDown className="w-3 h-3" />
            </Button>
            <Button variant="primary" size="md" icon={<Download className="w-4 h-4" />} onClick={() => addToast?.({ type: 'success', title: 'Report exported', message: 'Revenue analytics report has been downloaded.' })}>
              Export
            </Button>
          </>
        }
      />

      <KpiGrid kpis={revenueAnalyticsKpis} />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          {filters.map((f) => (
            <div key={f.label} className="relative">
              <select
                value={f.value}
                onChange={(e) => f.set?.(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="all">{f.label}: All</option>
                {f.options.filter((o) => o !== 'all').map((o) => (
                  <option key={o} value={o}>{f.label}: {o}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <CardHeader title="Revenue Trend" subtitle="Monthly revenue performance" />
          <LineChart data={revenueTrendMonthly} series={['revenue']} height={300} />
        </Card>
        <Card padding="lg">
          <CardHeader title="Profit Trend" subtitle="Monthly gross profit" />
          <LineChart data={revenueTrendMonthly} series={['profit']} height={300} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <CardHeader title="Revenue by Category" subtitle="Performance across product categories" />
          <BarChart data={categoryRevenue.map((c) => ({ label: c.category, value: c.revenue, color: c.color }))} height={280} />
        </Card>
        <Card padding="lg">
          <CardHeader title="Revenue by Product" subtitle="Top performing products" />
          <BarChart data={revenueByProduct.map((p) => ({ label: p.product, value: p.revenue, color: p.color }))} height={280} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <CardHeader title="Revenue by Customer Segment" subtitle="Contribution by segment" />
          <DonutChart data={revenueByCustomerSegment.map((s) => ({ label: s.segment, value: s.revenue, color: s.color, share: s.share }))} size={200} />
        </Card>
        <Card padding="lg">
          <CardHeader title="Revenue by Channel" subtitle="Sales distribution" />
          <DonutChart data={channelRevenue.map((c) => ({ label: c.channel, value: c.revenue, color: c.color, share: c.share }))} size={200} />
        </Card>
      </div>
    </div>
  );
}
