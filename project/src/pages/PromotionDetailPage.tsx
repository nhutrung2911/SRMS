import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BarChart } from '@/components/charts/BarChart';
import {
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Percent,
  Package,
  Calendar,
  AlertCircle,
  StopCircle,
  Loader2,
} from 'lucide-react';
import api from '@/services/api';

const statusVariant: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  active: 'success',
  scheduled: 'info',
  ended: 'neutral',
  draft: 'warning',
};

const roiStatusVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  Success: 'success',
  Weak: 'warning',
  Failed: 'danger',
  'No Data': 'neutral',
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export function PromotionDetailPage({
  navigate,
  promotionId,
  addToast,
}: PageProps & { promotionId: string; addToast?: (t: any) => void }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrManager = user.role_id === 1 || user.role_id === 2;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/promotions/${promotionId}`);
      setDetail(res.data);
    } catch (err) {
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load promotion details' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (promotionId) {
      fetchDetail();
    }
  }, [promotionId]);

  const handleEndCampaign = async () => {
    if (!window.confirm('Are you sure you want to end this promotion campaign early?')) return;
    setEnding(true);
    try {
      await api.put(`/promotions/${promotionId}`, { status: 'Expired' });
      addToast?.({ type: 'success', title: 'Success', message: 'Campaign ended successfully' });
      fetchDetail();
    } catch (err: any) {
      addToast?.({
        type: 'error',
        title: 'Error',
        message: err.response?.data?.message || 'Failed to update campaign status',
      });
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-ink-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-3" />
        <span className="text-sm">Loading promotion details...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4 text-center py-12">
        <h2 className="text-lg font-semibold text-ink-900">Promotion not found</h2>
        <Button variant="secondary" onClick={() => navigate('promotions')}>
          Back to Promotions
        </Button>
      </div>
    );
  }

  // Before / During / After comparison chart
  const comparison = detail.comparison || {};
  const comparisonData: { label: string; value: number; color?: string }[] = [];

  if (comparison.before_revenue > 0) {
    comparisonData.push({ label: 'Before', value: comparison.before_revenue, color: '#94A3B8' });
  }
  if (comparison.during_revenue > 0) {
    comparisonData.push({ label: 'During', value: comparison.during_revenue, color: '#1E66F3' });
  }
  if (comparison.after_status === 'available' && comparison.after_revenue > 0) {
    comparisonData.push({ label: 'After', value: comparison.after_revenue, color: '#10B981' });
  }

  const kpis = [
    { icon: ShoppingBag, label: 'Orders', value: detail.orders_count?.toLocaleString() ?? '0' },
    { icon: DollarSign, label: 'Revenue', value: formatCurrency(detail.revenue ?? 0) },
    { icon: TrendingUp, label: 'Profit', value: formatCurrency(detail.profit ?? 0) },
    { icon: Percent, label: 'Discount Cost', value: formatCurrency(detail.discount_cost ?? 0) },
    {
      icon: TrendingUp,
      label: 'Rev / Discount',
      value: detail.rev_discount_ratio > 0 ? `${detail.rev_discount_ratio}x` : '—',
    },
  ];

  const startDateStr = new Date(detail.start_date).toLocaleDateString('vi-VN');
  const endDateStr = new Date(detail.end_date).toLocaleDateString('vi-VN');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={detail.name}
        subtitle={`Period: ${startDateStr} – ${endDateStr}`}
        breadcrumbs={[
          { label: 'Operations', page: 'promotions' },
          { label: 'Promotions', page: 'promotions' },
          { label: detail.name },
        ]}
        onNavigate={navigate}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('promotions')}
            >
              Back
            </Button>
            {isAdminOrManager && detail.display_status !== 'ended' && (
              <Button
                variant="danger"
                size="md"
                loading={ending}
                icon={<StopCircle className="w-4 h-4" />}
                onClick={handleEndCampaign}
              >
                End Campaign
              </Button>
            )}
          </div>
        }
      />

      <Card padding="lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-ink-900">{detail.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-bold border border-brand-200">
                {detail.discount_type === 'PERCENT'
                  ? `-${detail.discount_value}%`
                  : `-${Number(detail.discount_value).toLocaleString('vi-VN')}đ`}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-sm text-ink-500">
              <Badge variant={statusVariant[detail.display_status] ?? 'neutral'} dot>
                {detail.display_status}
              </Badge>
              <Badge variant={roiStatusVariant[detail.roi_status] ?? 'neutral'}>
                Performance: {detail.roi_status}
              </Badge>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {startDateStr} – {endDateStr}
              </span>
              <span>·</span>
              <span>{detail.products?.length ?? 0} applied products</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="md" hover>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4 text-ink-400" />
              <span className="text-xs font-medium text-ink-500">{kpi.label}</span>
            </div>
            <div className="text-lg font-bold text-ink-900">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="lg">
            <CardHeader
              title="Before / During / After"
              subtitle="Product revenue comparison across promotion phases"
            />
            {comparisonData.length > 0 ? (
              <div className="space-y-3">
                <BarChart data={comparisonData} height={250} />
                {comparison.after_status === 'collecting' && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs mt-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>
                      <strong>Giai đoạn Sau chiến dịch (After):</strong> Đang thu thập dữ liệu (Chiến dịch hiện vẫn đang hoạt động hoặc vừa kết thúc).
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-ink-400 text-sm gap-2">
                <Package className="w-8 h-8 text-ink-300" />
                <span>No order revenue recorded for this campaign period yet</span>
              </div>
            )}
          </Card>
        </div>

        <Card padding="lg">
          <CardHeader title="Efficiency Analysis" subtitle="Campaign performance metrics" />
          <div className="space-y-3 divide-y divide-ink-100 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Revenue Uplift</span>
              <span
                className={`font-semibold ${
                  comparison.uplift >= 0 ? 'text-success-600' : 'text-danger-600'
                }`}
              >
                {comparison.uplift >= 0 ? '+' : ''}
                {comparison.uplift}%
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Profit Margin</span>
              <span className="font-semibold text-ink-900">{detail.margin}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Rev-to-Discount Ratio</span>
              <span className="font-semibold text-ink-900">
                {detail.rev_discount_ratio > 0 ? `${detail.rev_discount_ratio}x` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-ink-500">Discount per Order</span>
              <span className="font-semibold text-ink-900">
                {detail.cost_per_order > 0 ? formatCurrency(detail.cost_per_order) : '—'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader
          title="Promotion Products"
          subtitle={`Products included in this campaign (${detail.products?.length ?? 0} items)`}
        />
        <div className="space-y-2">
          {(!detail.products || detail.products.length === 0) ? (
            <div className="text-center py-6 text-sm text-ink-400">
              No products assigned to this campaign
            </div>
          ) : (
            detail.products.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0 hover:bg-ink-50/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center text-ink-500 flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink-900">{p.name}</div>
                    <div className="text-xs text-ink-400">
                      SKU: {p.sku} · {p.category || 'General'} · {p.brand || 'No brand'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-xs text-ink-400">Selling Price</div>
                    <div className="font-medium text-ink-900">{formatCurrency(p.price)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-400">Stock</div>
                    <div
                      className={`font-semibold ${
                        p.stock === 0
                          ? 'text-danger-600'
                          : p.stock <= (p.reorderLevel ?? 10)
                          ? 'text-warning-600'
                          : 'text-ink-900'
                      }`}
                    >
                      {p.stock} units
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('product-detail', { productId: p.id.toString() })}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
