import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/charts/LineChart';
import { RecommendationCard } from '@/components/InsightCard';
import { products, recommendations, formatCurrency } from '@/data';
import type { TrendPoint } from '@/types';
import { Package, DollarSign, Percent, Boxes, Activity, TrendingUp, ArrowLeft } from 'lucide-react';

export function ProductDetailPage({ navigate, productId }: PageProps & { productId: string }) {
  const product = products.find((p) => p.id === productId) ?? products[0];
  const daysRemaining = product.salesVelocity > 0 ? Math.floor(product.stock / product.salesVelocity) : 999;
  const riskLevel = product.stock === 0 ? 'critical' : daysRemaining <= 5 ? 'high' : daysRemaining <= 14 ? 'medium' : 'low';

  const trendData: TrendPoint[] = product.trendData.map((v, i) => ({
    label: `W${i + 1}`,
    revenue: v * product.price,
    profit: v * product.price * (product.margin / 100),
    orders: v,
  }));

  const kpis = [
    { icon: DollarSign, label: 'Revenue', value: formatCurrency(product.revenue), color: 'text-brand-600 bg-brand-50' },
    { icon: Activity, label: 'Units Sold', value: product.unitsSold.toLocaleString(), color: 'text-info-600 bg-info-50' },
    { icon: TrendingUp, label: 'Profit', value: formatCurrency(product.profit), color: 'text-success-600 bg-success-50' },
    { icon: Percent, label: 'Margin', value: `${product.margin}%`, color: 'text-success-600 bg-success-50' },
    { icon: Boxes, label: 'Stock', value: product.stock.toString(), color: product.stock < product.reorderLevel ? 'text-danger-600 bg-danger-50' : 'text-ink-600 bg-ink-100' },
    { icon: Package, label: 'Velocity', value: `${product.salesVelocity}/day`, color: 'text-warning-600 bg-warning-50' },
  ];

  const riskBadge = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' } as const;
  const relatedRecs = recommendations.filter((r) => r.relatedProduct === product.id || r.type === 'pricing').slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={product.name}
        subtitle={`${product.sku} · ${product.category} · ${product.brand}`}
        breadcrumbs={[
          { label: 'Commerce', page: 'products-analytics' },
          { label: 'Product Analytics', page: 'products-analytics' },
          { label: product.name },
        ]}
        onNavigate={navigate}
        actions={<Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('products-analytics')}>Back</Button>}
      />

      <Card padding="lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="brand">{product.category}</Badge>
                <Badge variant="neutral">{product.brand}</Badge>
                <Badge variant="success" dot>Active</Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-ink-400">Current Price</div>
            <div className="text-xl font-bold text-ink-900">{formatCurrency(product.price)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} padding="md" hover>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div className="text-xs font-medium text-ink-500 mb-1">{kpi.label}</div>
            <div className="text-lg font-bold text-ink-900">{kpi.value}</div>
          </Card>
        ))}
      </div>

      <Card padding="lg">
        <CardHeader title="Sales Trend" subtitle="Weekly sales performance over last 12 weeks" />
        <LineChart data={trendData} series={['revenue', 'profit']} height={320} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <CardHeader title="Pricing" subtitle="Current pricing structure" />
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Current Price</span>
              <span className="text-sm font-semibold text-ink-900">{formatCurrency(product.price)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Unit Cost</span>
              <span className="text-sm font-semibold text-ink-900">{formatCurrency(product.cost)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Gross Margin</span>
              <span className="text-sm font-semibold text-success-600">{product.margin}%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-ink-500">Profit per Unit</span>
              <span className="text-sm font-semibold text-ink-900">{formatCurrency(product.price - product.cost)}</span>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Inventory" subtitle="Stock status and risk assessment" />
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Current Stock</span>
              <span className={`text-sm font-semibold ${product.stock === 0 ? 'text-danger-600' : product.stock < product.reorderLevel ? 'text-warning-600' : 'text-ink-900'}`}>{product.stock} units</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Reorder Level</span>
              <span className="text-sm font-semibold text-ink-900">{product.reorderLevel} units</span>
            </div>
            <div className="flex justify-between py-2 border-b border-ink-100">
              <span className="text-sm text-ink-500">Days Remaining</span>
              <span className={`text-sm font-semibold ${daysRemaining <= 3 ? 'text-danger-600' : daysRemaining <= 7 ? 'text-warning-600' : 'text-ink-900'}`}>{daysRemaining > 900 ? 'N/A' : `${daysRemaining} days`}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-ink-500">Risk Level</span>
              <Badge variant={riskBadge[riskLevel as keyof typeof riskBadge]} dot>{riskLevel}</Badge>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-base font-semibold text-ink-900 mb-4">AI Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatedRecs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onView={() => navigate('ai-recommendations')} onApply={() => navigate('ai-recommendations')} />
          ))}
        </div>
      </div>
    </div>
  );
}
