import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatCurrency } from '@/data';
import api from '@/services/api';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export function ProductAnalyticsPage({ navigate, addToast }: PageProps) {
  const [loading, setLoading] = useState(true);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);
  const [fastMoving, setFastMoving] = useState<any[]>([]);
  const [slowMoving, setSlowMoving] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get('/analytics/products');
        
        // 1. Process Revenue by Category
        const totalRevenue = res.data.revenue_by_category.reduce((sum: number, cat: any) => sum + Number(cat.revenue), 0);
        const colorPalette = ['#1E66F3', '#6366F1', '#10B981', '#F59E0B', '#8B5CF6'];
        const mappedCategories = res.data.revenue_by_category.map((cat: any, index: number) => ({
          label: cat.category,
          value: Number(cat.revenue),
          share: totalRevenue > 0 ? (Number(cat.revenue) / totalRevenue) * 100 : 0,
          color: colorPalette[index % colorPalette.length]
        }));
        
        setRevenueByCategory(mappedCategories);
        setFastMoving(res.data.fast_moving);
        setSlowMoving(res.data.slow_moving);
        setPromotions(res.data.promotion_roi);

      } catch (error: any) {
        if (error.response?.status === 403) {
          addToast?.({ type: 'error', title: 'Access Denied', message: 'You do not have permission to view product analytics.' });
          navigate('dashboard');
        } else {
          console.error('Error fetching analytics:', error);
          addToast?.({ type: 'error', title: 'Data load failed', message: 'Could not fetch product analytics.' });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [addToast, navigate]);

  if (loading) {
    return <div className="h-full flex items-center justify-center p-12 text-ink-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Product Analytics"
        subtitle="Analyze revenue by category, inventory health, and promotion ROI."
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Product Analytics' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue By Category */}
        <div className="lg:col-span-1">
          <Card padding="lg">
            <CardHeader title="Revenue By Category" subtitle="Last 30 Days" />
            <div className="mt-4">
              {revenueByCategory.length > 0 ? (
                <DonutChart data={revenueByCategory} size={240} />
              ) : (
                <div className="h-[240px] flex items-center justify-center text-ink-400">No data available</div>
              )}
            </div>
          </Card>
        </div>

        {/* Inventory Health */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <CardHeader title="Inventory Health" subtitle="Top 5 Fast-Moving & Slow-Moving Products (Last 30 Days)" />
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fast Moving */}
              <div>
                <h3 className="text-sm font-semibold text-success-700 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" /> Fast-Moving (Top Velocity)
                </h3>
                <div className="border border-ink-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Product (ID)</th>
                        <th className="px-3 py-2 font-medium text-right">Sold</th>
                        <th className="px-3 py-2 font-medium text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {fastMoving.map(p => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-ink-900 truncate max-w-[150px]" title={p.name}>{p.name} ({p.id})</td>
                          <td className="px-3 py-2 text-right font-medium text-success-600">{p.sales_velocity}</td>
                          <td className="px-3 py-2 text-right">{p.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slow Moving */}
              <div>
                <h3 className="text-sm font-semibold text-danger-700 flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4" /> Slow-Moving / Dead Stock
                </h3>
                <div className="border border-ink-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-ink-50 text-ink-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Product (ID)</th>
                        <th className="px-3 py-2 font-medium text-right">Sold</th>
                        <th className="px-3 py-2 font-medium text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {slowMoving.map(p => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-ink-900 truncate max-w-[150px]" title={p.name}>{p.name} ({p.id})</td>
                          <td className="px-3 py-2 text-right font-medium text-danger-600">{p.sales_velocity}</td>
                          <td className="px-3 py-2 text-right">
                            {p.stock_quantity > 0 && p.sales_velocity === 0 ? (
                              <span className="flex items-center justify-end gap-1 text-warning-600">
                                <AlertTriangle className="w-3 h-3" /> {p.stock_quantity}
                              </span>
                            ) : (
                              p.stock_quantity
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Promotion ROI */}
      <Card padding="md">
        <CardHeader title="Promotion ROI Analysis" subtitle="Measure the profitability of your discount campaigns." />
        <div className="mt-4">
          <DataTable
            columns={[
              { key: 'name', label: 'Promotion Name', render: (p) => <span className="font-medium text-ink-900">{p.name}</span> },
              { key: 'discount', label: 'Discount', render: (p) => (
                <Badge variant="neutral">{p.discount_type === 'PERCENT' ? `${p.discount_value}%` : formatCurrency(p.discount_value)}</Badge>
              )},
              { key: 'total_orders', label: 'Orders Applied', align: 'right' },
              { key: 'revenue', label: 'Revenue Generated', align: 'right', render: (p) => formatCurrency(p.revenue) },
              { key: 'profit', label: 'Profit Generated', align: 'right', render: (p) => (
                <span className={p.profit < 0 ? 'text-danger-600 font-medium' : 'text-success-600 font-medium'}>
                  {formatCurrency(p.profit)}
                </span>
              )},
              { key: 'margin', label: 'Margin', align: 'right', render: (p) => (
                <span className={p.margin < 0 ? 'text-danger-600 font-medium' : 'text-ink-700'}>
                  {p.revenue == 0 ? '-' : `${p.margin}%`}
                </span>
              )},
              { key: 'status', label: 'ROI Status', align: 'center', render: (p) => {
                if (p.roi_status === 'Success') return <Badge variant="success">Success</Badge>;
                if (p.roi_status === 'Weak') return <Badge variant="warning">Weak</Badge>;
                if (p.roi_status === 'Failed') return <Badge variant="danger">Failed</Badge>;
                return <Badge variant="neutral">No Data</Badge>;
              }}
            ]}
            data={promotions}
            rowKey={(p) => p.id}
          />
        </div>
      </Card>
    </div>
  );
}
