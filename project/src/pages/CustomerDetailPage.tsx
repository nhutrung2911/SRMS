import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/charts/LineChart';
import { RecommendationCard } from '@/components/InsightCard';
import { customers, recommendations, formatCurrency } from '@/data';
import type { TrendPoint, CustomerSegment, CustomerStatus } from '@/types';
import { ArrowLeft, ShoppingBag, DollarSign, TrendingUp, Clock, MapPin, Calendar } from 'lucide-react';

const segmentVariant: Record<CustomerSegment, 'brand' | 'success' | 'info' | 'neutral' | 'warning' | 'danger'> = {
  champion: 'brand', loyal: 'success', 'potential-loyalist': 'info', new: 'neutral', 'at-risk': 'warning', lost: 'danger',
};
const statusVariant: Record<CustomerStatus, 'success' | 'brand' | 'neutral' | 'warning'> = {
  active: 'success', vip: 'brand', dormant: 'neutral', 'at-risk': 'warning',
};
const segmentDesc: Record<CustomerSegment, string> = {
  champion: 'Top-tier customers who buy frequently and spend the most. They are your brand advocates.',
  loyal: 'Consistent customers with strong purchase frequency and above-average spend.',
  'potential-loyalist': 'Growing customers showing consistent behavior. High potential to become loyal.',
  new: 'Recently acquired customers. Nurturing them is critical for long-term value.',
  'at-risk': 'Previously active customers who have not purchased recently. Need re-engagement.',
  lost: 'Customers who have not purchased in 90+ days. Consider win-back campaigns.',
};

export function CustomerDetailPage({ navigate, customerId }: PageProps & { customerId: string }) {
  const customer = customers.find((c) => c.id === customerId) ?? customers[0];

  const trendData: TrendPoint[] = Array.from({ length: 12 }, (_, i) => {
    const baseRev = customer.aov * Math.max(1, customer.orders / 12);
    const rev = Math.round(baseRev * (0.7 + Math.random() * 0.6));
    return { label: `M${i + 1}`, revenue: rev, profit: Math.round(rev * 0.22), orders: Math.max(1, Math.round(customer.orders / 12 * (0.5 + Math.random()))) };
  });

  const kpis = [
    { icon: ShoppingBag, label: 'Total Orders', value: customer.orders.toString() },
    { icon: DollarSign, label: 'Total Spent', value: formatCurrency(customer.totalSpent) },
    { icon: TrendingUp, label: 'Avg Order Value', value: formatCurrency(customer.aov) },
    { icon: DollarSign, label: 'Lifetime Value', value: formatCurrency(customer.clv) },
    { icon: Clock, label: 'Last Purchase', value: customer.lastPurchase },
  ];

  const relatedRecs = customer.segment === 'at-risk' || customer.segment === 'lost'
    ? recommendations.filter((r) => r.type === 'customer').slice(0, 2)
    : recommendations.filter((r) => r.type === 'customer' && r.id === 'REC007').slice(0, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={customer.name}
        subtitle={customer.email}
        breadcrumbs={[
          { label: 'Commerce', page: 'customers-analytics' },
          { label: 'Customer Analytics', page: 'customers-analytics' },
          { label: customer.name },
        ]}
        onNavigate={navigate}
        actions={<Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('customers-analytics')}>Back</Button>}
      />

      <Card padding="lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-lg font-semibold">
              {customer.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">{customer.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={segmentVariant[customer.segment]}>{customer.segment.replace('-', ' ')}</Badge>
                <Badge variant={statusVariant[customer.status]} dot>{customer.status}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-ink-500">
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{customer.location}</div>
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />Joined {customer.joinedDate}</div>
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
            <CardHeader title="Purchase History" subtitle="Monthly purchase trend" />
            <LineChart data={trendData} series={['revenue']} height={300} />
          </Card>
        </div>
        <Card padding="lg">
          <CardHeader title="Segment Info" subtitle={customer.segment.replace('-', ' ')} />
          <p className="text-sm text-ink-600 leading-relaxed mb-4">{segmentDesc[customer.segment]}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">Location</span><span className="font-medium text-ink-800">{customer.location}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">Joined</span><span className="font-medium text-ink-800">{customer.joinedDate}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">AOV</span><span className="font-medium text-ink-800">{formatCurrency(customer.aov)}</span></div>
            <div className="flex justify-between"><span className="text-ink-500">CLV</span><span className="font-medium text-ink-800">{formatCurrency(customer.clv)}</span></div>
          </div>
        </Card>
      </div>

      {relatedRecs.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-ink-900 mb-4">Recommendations for This Customer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedRecs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} onView={() => navigate('ai-recommendations')} onApply={() => navigate('ai-recommendations')} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
