import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { KpiGrid } from '@/components/ui/KpiCard';
import { LineChart } from '@/components/charts/LineChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatCurrency } from '@/data';
import { Calendar, Download, ChevronRight } from 'lucide-react';
import api from '@/services/api';

export function DashboardPage({ navigate, addToast }: PageProps) {
  const [kpiGranularity, setKpiGranularity] = useState<'today' | 'month' | 'year'>('month');
  const [chartGranularity, setChartGranularity] = useState<'7_days' | '30_days' | '90_days'>('30_days');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [kpiRes, chartRes] = await Promise.all([
          api.get(`/dashboard/kpis?type=${kpiGranularity}`),
          api.get(`/dashboard/chart?type=${chartGranularity}`)
        ]);

        const data = kpiRes.data.kpis;
        // Map to KpiCard format expected by KpiGrid
        const profitMargin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;

        setKpis([
          {
            id: 'revenue',
            label: 'Total Revenue',
            value: formatCurrency(data.revenue),
            change: data.revenue_growth !== null ? Number(data.revenue_growth.toFixed(1)) : null,
            direction: data.revenue_growth > 0 ? 'up' : (data.revenue_growth < 0 ? 'down' : 'flat'),
            sublabel: data.revenue_growth !== null ? 'vs prev. period' : 'No prior data'
          },
          {
            id: 'profit',
            label: 'Total Profit',
            value: formatCurrency(data.profit),
            change: data.profit_growth !== null ? Number(data.profit_growth.toFixed(1)) : null,
            direction: data.profit_growth > 0 ? 'up' : (data.profit_growth < 0 ? 'down' : 'flat'),
            sublabel: data.profit_growth !== null ? 'vs prev. period' : 'No prior data'
          },
          {
            id: 'margin',
            label: 'Profit Margin',
            value: `${profitMargin.toFixed(1)}%`,
          },
          {
            id: 'orders',
            label: 'Total Orders',
            value: data.orders.toString(),
            change: data.orders_growth !== null ? Number(data.orders_growth.toFixed(1)) : null,
            direction: data.orders_growth > 0 ? 'up' : (data.orders_growth < 0 ? 'down' : 'flat'),
            sublabel: data.orders_growth !== null ? 'vs prev. period' : 'No prior data'
          },
          {
            id: 'aov',
            label: 'Average Order Value',
            value: formatCurrency(data.average_order_value),
            change: data.aov_growth !== null ? Number(data.aov_growth.toFixed(1)) : null,
            direction: data.aov_growth > 0 ? 'up' : (data.aov_growth < 0 ? 'down' : 'flat'),
            sublabel: data.aov_growth !== null ? 'vs prev. period' : 'No prior data'
          }
        ]);

        // Segment data for Pie Chart
        const colorMap: Record<string, string> = {
          'Champions': '#10B981',
          'Loyal': '#1E66F3',
          'Recent': '#6366F1',
          'Average': '#F59E0B',
          'At Risk': '#F97316',
          'Lost': '#EF4444',
          'Inactive': '#94A3B8'
        };

        const totalSegments = kpiRes.data.customer_segments.reduce((acc: number, cur: any) => acc + cur.count, 0);
        
        const segmentsMapped = kpiRes.data.customer_segments.map((s: any) => ({
          label: s.segment_name,
          value: s.count,
          share: totalSegments > 0 ? Math.round((s.count / totalSegments) * 100) : 0,
          color: colorMap[s.segment_name] || '#CBD5E1'
        }));
        setSegmentData(segmentsMapped);

        // Chart Data Mapping
        const formattedChart = chartRes.data.map((d: any) => ({
          label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Number(d.total_revenue),
          profit: Number(d.total_profit),
          orders: Number(d.total_orders)
        }));
        setChartData(formattedChart);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        addToast?.({ type: 'error', title: 'Data load failed', message: 'Could not fetch dashboard metrics.' });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [kpiGranularity, chartGranularity]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Monitor business performance and customer distribution."
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-0.5">
              {(['today', 'month', 'year'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setKpiGranularity(g)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                    kpiGranularity === g ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <Button variant="primary" size="md" icon={<Download className="w-4 h-4" />}>
              Export Report
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      {loading ? (
        <div className="h-24 flex items-center justify-center text-ink-500">Loading metrics...</div>
      ) : (
        <KpiGrid kpis={kpis} />
      )}

      {/* Main Content Area (2/3 + 1/3 layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Profit Trend (2/3 Width) */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <CardHeader
              title="Revenue & Profit Trend"
              subtitle="Track performance over time"
              action={
                <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-0.5">
                  {([
                    { value: '7_days', label: '7 Days' }, 
                    { value: '30_days', label: '30 Days' }, 
                    { value: '90_days', label: '90 Days' }
                  ] as const).map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setChartGranularity(g.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        chartGranularity === g.value ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              }
            />
            {loading ? (
              <div className="h-[340px] flex items-center justify-center">Loading chart...</div>
            ) : (
              <LineChart
                data={chartData}
                series={['revenue', 'profit']}
                height={340}
                formatValue={formatCurrency}
              />
            )}
          </Card>
        </div>

        {/* Customer Segments (1/3 Width) */}
        <div className="lg:col-span-1">
          <Card padding="lg">
            <CardHeader
              title="Customer Segments (RFM)"
              subtitle="Distribution of customer base"
            />
            <div className="mt-4">
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">Loading...</div>
              ) : (
                <DonutChart data={segmentData} size={280} />
              )}
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
