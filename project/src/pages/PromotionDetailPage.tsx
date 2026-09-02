import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BarChart } from '@/components/charts/BarChart';
import { promotions, products, formatCurrency } from '@/data';
import type { PromotionRow } from '@/types';
import { ArrowLeft, ShoppingBag, DollarSign, TrendingUp, Percent, Package } from 'lucide-react';

const statusVariant: Record<PromotionRow['status'], 'success' | 'info' | 'neutral' | 'warning'> = {
  active: 'success', scheduled: 'info', ended: 'neutral', draft: 'warning',
};

export function PromotionDetailPage({ navigate, promotionId }: PageProps & { promotionId: string }) {
  const promo = promotions.find((p) => p.id === promotionId) ?? promotions[0];
  const promoProducts = promo.products.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  const comparisonData: { label: string; value: number; color?: string }[] = [];
  if (promo.beforeRevenue > 0) comparisonData.push({ label: 'Before', value: promo.beforeRevenue, color: '#94A3B8' });
  if (promo.duringRevenue > 0) comparisonData.push({ label: 'During', value: promo.duringRevenue, color: '#1E66F3' });
  if (promo.afterRevenue > 0) comparisonData.push({ label: 'After', value: promo.afterRevenue, color: '#10B981' });

  const uplift = promo.beforeRevenue > 0 ? ((promo.duringRevenue - promo.beforeRevenue) / promo.beforeRevenue) * 100 : 0;

  const kpis = [
    { icon: ShoppingBag, label: 'Orders', value: promo.orders.toLocaleString() },
    { icon: DollarSign, label: 'Revenue', value: formatCurrency(promo.revenue) },
    { icon: TrendingUp, label: 'Profit', value: formatCurrency(promo.profit) },
    { icon: Percent, label: 'Discount Cost', value: formatCurrency(promo.discountCost) },
    { icon: TrendingUp, label: 'ROI', value: promo.roi > 0 ? `${promo.roi}%` : '—' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={promo.campaign}
        subtitle={promo.period}
        breadcrumbs={[
          { label: 'Operations', page: 'promotions' },
          { label: 'Promotions', page: 'promotions' },
          { label: promo.campaign },
        ]}
        onNavigate={navigate}
        actions={<Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('promotions')}>Back</Button>}
      />

      <Card padding="lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{promo.campaign}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusVariant[promo.status]} dot>{promo.status}</Badge>
              <span className="text-sm text-ink-400">{promo.period}</span>
              <span className="text-sm text-ink-400">· {promo.products.length} products</span>
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
            <CardHeader title="Before / During / After" subtitle="Revenue comparison across promotion phases" />
            {comparisonData.length > 0 ? (
              <BarChart data={comparisonData} height={250} />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-ink-400 text-sm">
                No data available for this promotion period
              </div>
            )}
          </Card>
        </div>
        <Card padding="lg">
          <CardHeader title="ROI Analysis" subtitle="Promotion efficiency" />
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Revenue Uplift</span>
              <span className={`text-sm font-semibold ${uplift >= 0 ? 'text-success-600' : 'text-danger-600'}`}>{uplift >= 0 ? '+' : ''}{uplift.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Profit Margin</span>
              <span className="text-sm font-semibold text-ink-900">{promo.revenue > 0 ? ((promo.profit / promo.revenue) * 100).toFixed(1) : 0}%</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Discount Efficiency</span>
              <span className="text-sm font-semibold text-ink-900">{promo.discountCost > 0 ? `${(promo.revenue / promo.discountCost).toFixed(0)}x` : '—'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-ink-500">Cost per Order</span>
              <span className="text-sm font-semibold text-ink-900">{promo.orders > 0 ? formatCurrency(promo.discountCost / promo.orders) : '—'}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader title="Promotion Products" subtitle="Products included in this campaign" />
        <div className="space-y-2">
          {promoProducts.map((p) => p && (
            <div key={p.id} className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center">
                  <Package className="w-4 h-4 text-ink-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-ink-900">{p.name}</div>
                  <div className="text-xs text-ink-400">{p.category} · {p.brand}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="text-xs text-ink-400">Price</div>
                  <div className="font-medium text-ink-900">{formatCurrency(p.price)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-400">Stock</div>
                  <div className={`font-medium ${p.stock === 0 ? 'text-danger-600' : p.stock < p.reorderLevel ? 'text-warning-600' : 'text-ink-900'}`}>{p.stock}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('product-detail', { productId: p.id })}>View</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
