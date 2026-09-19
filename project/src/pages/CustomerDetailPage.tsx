import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LineChart } from '@/components/charts/LineChart';
import { RecommendationCard } from '@/components/InsightCard';
import { formatCurrency } from '@/data';
import type { TrendPoint, Recommendation } from '@/types';
import { ArrowLeft, ShoppingBag, DollarSign, TrendingUp, Clock, MapPin, Calendar, Phone, Mail, Loader2, Award, ExternalLink } from 'lucide-react';
import api from '@/services/api';

const segmentVariant: Record<string, 'brand' | 'success' | 'info' | 'neutral' | 'warning' | 'danger'> = {
  champions: 'brand',
  champion: 'brand',
  loyal: 'success',
  'potential-loyalist': 'info',
  average: 'info',
  recent: 'neutral',
  new: 'neutral',
  'at-risk': 'warning',
  lost: 'danger',
};

const statusVariant: Record<string, 'success' | 'brand' | 'neutral' | 'warning'> = {
  active: 'success',
  vip: 'brand',
  dormant: 'neutral',
  'at-risk': 'warning',
};

const segmentDesc: Record<string, string> = {
  champions: 'Top-tier customers who buy frequently and spend the most. They are your brand advocates.',
  champion: 'Top-tier customers who buy frequently and spend the most. They are your brand advocates.',
  loyal: 'Consistent customers with strong purchase frequency and above-average spend.',
  'potential-loyalist': 'Growing customers showing consistent behavior. High potential to become loyal.',
  average: 'Regular buyers with moderate frequency and average spend. Candidate for loyalty growth.',
  recent: 'Recently registered customers. Nurturing them is critical for long-term value.',
  new: 'Recently acquired customers. Nurturing them is critical for long-term value.',
  'at-risk': 'Previously active customers who have not purchased recently. Need re-engagement.',
  lost: 'Customers who have not purchased in 90+ days. Consider win-back campaigns.',
};

export function CustomerDetailPage({ navigate, customerId }: PageProps & { customerId: string }) {
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomer = async () => {
      setLoading(true);
      try {
        const [custRes, recRes] = await Promise.all([
          api.get(`/customers/${customerId}`),
          api.get('/recommendations').catch(() => ({ data: [] })),
        ]);

        if (!isMounted) return;

        setCustomer(custRes.data.customer);
        setOrders(custRes.data.orders || []);
        setTrendData(custRes.data.trend || []);

        const recs = recRes.data || [];
        const custSegment = custRes.data.customer?.segment || '';
        const filteredRecs = recs.filter((r: Recommendation) => {
          if (custSegment.includes('risk') || custSegment.includes('lost')) {
            return r.type === 'customer' || r.type === 'promotion';
          }
          return r.type === 'customer';
        }).slice(0, 2);
        setRecommendations(filteredRecs);
      } catch (err) {
        console.error('Failed to fetch customer detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCustomer();
    return () => { isMounted = false; };
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        <span className="text-sm text-ink-500 font-medium">Loading customer profile...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Customer Not Found"
          subtitle="The requested customer profile could not be located."
          breadcrumbs={[{ label: 'Commerce', page: 'customers-analytics' }, { label: 'Customer' }]}
          onNavigate={navigate}
          actions={
            <Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('customers-analytics')}>
              Back to Customers
            </Button>
          }
        />
        <Card padding="lg">
          <div className="text-center py-8 text-ink-500">
            Customer ID #{customerId} does not exist in the database.
          </div>
        </Card>
      </div>
    );
  }

  const kpis = [
    { icon: ShoppingBag, label: 'Total Orders', value: customer.total_orders.toString() },
    { icon: DollarSign, label: 'Total Spent', value: formatCurrency(customer.total_spent) },
    { icon: TrendingUp, label: 'Avg Order Value (AOV)', value: formatCurrency(customer.aov) },
    { icon: DollarSign, label: 'Lifetime Value (CLV)', value: formatCurrency(customer.clv) },
    {
      icon: Clock,
      label: 'Last Purchase',
      value: customer.recency_days !== null ? `${customer.recency_days} days ago` : 'Never',
    },
  ];

  const joinedDate = customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A';
  const segmentKey = customer.segment || 'recent';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={customer.name}
        subtitle={customer.email !== 'N/A' ? customer.email : `Customer #${customer.id}`}
        breadcrumbs={[
          { label: 'Commerce', page: 'customers-analytics' },
          { label: 'Customer Analytics', page: 'customers-analytics' },
          { label: customer.name },
        ]}
        onNavigate={navigate}
        actions={
          <Button variant="secondary" size="md" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('customers-analytics')}>
            Back
          </Button>
        }
      />

      <Card padding="lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-lg font-semibold shadow-sm">
              {customer.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-ink-900">{customer.name}</h2>
                {customer.rfm?.is_vip && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Award className="w-3 h-3" /> VIP
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={segmentVariant[segmentKey] || 'neutral'}>
                  {customer.segment_name}
                </Badge>
                <Badge variant={statusVariant[customer.status] || 'neutral'} dot>
                  {customer.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
            {customer.phone && customer.phone !== 'N/A' && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-ink-400" />
                {customer.phone}
              </div>
            )}
            {customer.address && customer.address !== 'N/A' && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-ink-400" />
                {customer.address}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-ink-400" />
              Joined {joinedDate}
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
              title="Purchase Trend"
              subtitle="Monthly spending performance from completed orders"
            />
            {trendData.length > 0 ? (
              <LineChart data={trendData} series={['revenue']} height={300} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-ink-400 text-sm">
                No completed purchase history available for trend analysis.
              </div>
            )}
          </Card>
        </div>
        <Card padding="lg">
          <CardHeader title="RFM & Segment Snapshot" subtitle={customer.segment_name} />
          <p className="text-sm text-ink-600 leading-relaxed mb-4">
            {segmentDesc[segmentKey] || segmentDesc['recent']}
          </p>
          <div className="space-y-3 text-sm border-t border-ink-100 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-ink-500">Recency (R Score)</span>
              <span className="font-semibold text-ink-900 px-2 py-0.5 rounded bg-ink-100 text-xs">
                Score {customer.rfm?.r_score ?? '—'}/5
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500">Frequency (F Score)</span>
              <span className="font-semibold text-ink-900 px-2 py-0.5 rounded bg-ink-100 text-xs">
                Score {customer.rfm?.f_score ?? '—'}/5
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500">Monetary (M Score)</span>
              <span className="font-semibold text-ink-900 px-2 py-0.5 rounded bg-ink-100 text-xs">
                Score {customer.rfm?.m_score ?? '—'}/5
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-ink-100">
              <span className="text-ink-500">AOV</span>
              <span className="font-medium text-ink-800">{formatCurrency(customer.aov)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-500">Lifetime Spending</span>
              <span className="font-medium text-ink-800">{formatCurrency(customer.total_spent)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Real Orders Table */}
      <Card padding="lg">
        <CardHeader
          title="Recent Orders"
          subtitle={`Showing up to ${orders.length} recent orders placed by ${customer.name}`}
        />
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-ink-100 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Final Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-ink-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink-900">#{ord.id}</td>
                    <td className="py-3 px-4 text-ink-600">
                      {new Date(ord.order_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center text-ink-700">{ord.items_count}</td>
                    <td className="py-3 px-4 text-right text-ink-700 font-medium">
                      {formatCurrency(ord.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-ink-500">
                      {ord.discount_amount > 0 ? `-${formatCurrency(ord.discount_amount)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-ink-900">
                      {formatCurrency(ord.final_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                          ord.status === 'Completed'
                            ? 'bg-success-50 text-success-700'
                            : ord.status === 'Pending'
                            ? 'bg-warning-50 text-warning-700'
                            : ord.status === 'Cancelled'
                            ? 'bg-danger-50 text-danger-700'
                            : 'bg-ink-100 text-ink-700'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => navigate('order-detail', { orderId: ord.id.toString() })}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center justify-center gap-1 mx-auto"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-ink-400 text-sm">
            This customer has not placed any orders yet.
          </div>
        )}
      </Card>

      {recommendations.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-ink-900 mb-4">Recommendations for This Segment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onView={() => navigate('ai-recommendations')}
                onApply={() => navigate('ai-recommendations')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
