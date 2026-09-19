import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiGrid } from '@/components/ui/KpiCard';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatCurrency } from '@/data';
import type { Kpi, TrendPoint } from '@/types';
import { Calendar, Download, ChevronDown, Loader2 } from 'lucide-react';
import api from '@/services/api';

export function RevenueAnalyticsPage({ addToast }: PageProps) {
  const [range, setRange] = useState('30_days');
  const [loading, setLoading] = useState(true);

  // Real API data state
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<TrendPoint[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<{ category: string; revenue: number; color: string }[]>([]);
  const [segmentRevenue, setSegmentRevenue] = useState<{ segment: string; revenue: number; color: string; share: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ product: string; sku: string; revenue: number; color: string }[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRevenueData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/revenue?range=${range}`);
        if (!isMounted) return;

        const data = res.data;
        setKpis(data.kpis || []);
        setMonthlyTrend(data.monthly_trend || []);
        setCategoryRevenue(data.category_revenue || []);
        setSegmentRevenue(data.segment_revenue || []);
        setTopProducts(data.top_products || []);
      } catch (err: any) {
        console.error('Failed to fetch revenue analytics:', err);
        addToast?.({
          type: 'danger',
          title: 'Error loading analytics',
          message: err.response?.data?.message || 'Could not load revenue data.',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRevenueData();
    return () => { isMounted = false; };
  }, [range, addToast]);

  const handleExport = () => {
    if (monthlyTrend.length === 0) {
      addToast?.({ type: 'warning', title: 'Export notice', message: 'No revenue data available to export.' });
      return;
    }

    const headers = ['Period', 'Revenue (VND)', 'Profit (VND)', 'Orders'];
    const rows = monthlyTrend.map((t) => [t.label, t.revenue, t.profit, t.orders]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revenue_analytics_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast?.({
      type: 'success',
      title: 'Report exported',
      message: `Revenue analytics report (${range}) downloaded successfully.`,
    });
  };

  const rangeLabels: Record<string, string> = {
    '7_days': 'Last 7 Days',
    '30_days': 'Last 30 Days',
    '90_days': 'Last 90 Days',
    'year': 'Past 1 Year',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Revenue Analytics"
        subtitle="Deep dive into revenue, profit, and growth metrics across categories and customer segments."
        breadcrumbs={[{ label: 'Revenue' }, { label: 'Revenue Analytics' }]}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="appearance-none h-9 pl-9 pr-8 rounded-lg border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm"
              >
                <option value="7_days">Last 7 Days</option>
                <option value="30_days">Last 30 Days</option>
                <option value="90_days">Last 90 Days</option>
                <option value="year">Past 1 Year</option>
              </select>
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
            </div>

            <Button
              variant="primary"
              size="md"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Export
            </Button>
          </div>
        }
      />

      {loading && kpis.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-2 text-ink-500">
          <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
          <span className="text-sm">Loading revenue metrics...</span>
        </div>
      ) : (
        <>
          <KpiGrid kpis={kpis} />

          {/* Trend Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <CardHeader
                title="Revenue Trend"
                subtitle="Monthly revenue performance across all recorded cycles"
              />
              {monthlyTrend.length > 0 ? (
                <LineChart data={monthlyTrend} series={['revenue']} height={300} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-ink-400 text-sm">
                  No monthly trend records available.
                </div>
              )}
            </Card>
            <Card padding="lg">
              <CardHeader
                title="Profit Trend"
                subtitle="Monthly gross profit performance across recorded cycles"
              />
              {monthlyTrend.length > 0 ? (
                <LineChart data={monthlyTrend} series={['profit']} height={300} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-ink-400 text-sm">
                  No profit trend records available.
                </div>
              )}
            </Card>
          </div>

          {/* Breakdown by Category & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card padding="lg">
              <CardHeader
                title="Revenue by Category"
                subtitle="Performance across product categories from completed orders"
              />
              {categoryRevenue.length > 0 ? (
                <BarChart
                  data={categoryRevenue.map((c) => ({
                    label: c.category,
                    value: c.revenue,
                    color: c.color,
                  }))}
                  height={280}
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-ink-400 text-sm">
                  No category data recorded for completed orders.
                </div>
              )}
            </Card>

            <Card padding="lg">
              <CardHeader
                title="Top Products by Revenue"
                subtitle="Top performing products by cumulative sales"
              />
              {topProducts.length > 0 ? (
                <BarChart
                  data={topProducts.map((p) => ({
                    label: p.product.length > 18 ? p.product.slice(0, 18) + '...' : p.product,
                    value: p.revenue,
                    color: p.color,
                  }))}
                  height={280}
                />
              ) : (
                <div className="h-[280px] flex items-center justify-center text-ink-400 text-sm">
                  No product sales data available.
                </div>
              )}
            </Card>
          </div>

          {/* Customer Segment Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card padding="lg" className="lg:col-span-1">
              <CardHeader
                title="Revenue by Segment"
                subtitle="Share of revenue contributed by customer segments"
              />
              {segmentRevenue.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <DonutChart
                    data={segmentRevenue.map((s) => ({
                      label: s.segment,
                      value: s.revenue,
                      color: s.color,
                      share: s.share,
                    }))}
                    size={220}
                  />
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-ink-400 text-sm">
                  No customer segment revenue data available.
                </div>
              )}
            </Card>

            <Card padding="lg" className="lg:col-span-2">
              <CardHeader
                title="Customer Segment Revenue Breakdown"
                subtitle="Quantitative breakdown across RFM tiers"
              />
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Segment</th>
                      <th className="py-2.5 px-3 text-right">Revenue</th>
                      <th className="py-2.5 px-3 text-right">Contribution Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {segmentRevenue.map((seg) => (
                      <tr key={seg.segment} className="hover:bg-ink-50 transition-colors">
                        <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-ink-900">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          {seg.segment}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-ink-800">
                          {formatCurrency(seg.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-ink-600">
                          <span className="font-semibold text-ink-900">{seg.share}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
