import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { orders, getOrderDetail, formatCurrency } from '@/data';
import type { OrderRow, OrderStatus, PaymentMethod } from '@/types';
import { Search, ChevronDown, CheckCircle2, Clock, Package, Truck, XCircle } from 'lucide-react';

const statusVariant: Record<OrderStatus, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success', processing: 'info', pending: 'warning', cancelled: 'danger', refunded: 'neutral',
};

const paymentLabel: Record<PaymentMethod, string> = {
  card: 'Credit Card', cod: 'Cash on Delivery', bank: 'Bank Transfer', wallet: 'E-Wallet',
};

export function OrdersPage({ navigate, initialOrderId }: PageProps & { initialOrderId?: string }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [drawerOrder, setDrawerOrder] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderId) setDrawerOrder(initialOrderId);
  }, [initialOrderId]);

  const filtered = orders.filter((o) => {
    if (search && !o.id.toLowerCase().includes(search.toLowerCase()) && !o.customer.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== 'all' && o.status !== status) return false;
    return true;
  });

  const detail = drawerOrder ? getOrderDetail(drawerOrder) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Orders"
        subtitle="Track and manage customer orders across all channels."
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Orders' }]}
      />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order ID or customer..."
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
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
        </div>

        <DataTable<OrderRow>
          columns={[
            { key: 'id', label: 'Order ID', render: (o) => <span className="font-medium text-ink-900">{o.id}</span> },
            { key: 'customer', label: 'Customer' },
            { key: 'date', label: 'Date' },
            { key: 'items', label: 'Items', align: 'right' },
            { key: 'total', label: 'Total', align: 'right', render: (o) => formatCurrency(o.total) },
            { key: 'payment', label: 'Payment', align: 'center', render: (o) => paymentLabel[o.payment] },
            { key: 'status', label: 'Status', align: 'center', render: (o) => (
              <Badge variant={statusVariant[o.status]} dot>{o.status}</Badge>
            )},
          ]}
          data={filtered}
          rowKey={(o) => o.id}
          onRowClick={(o) => setDrawerOrder(o.id)}
        />

        <div className="flex items-center justify-between mt-4 px-4 py-3 border-t border-ink-100">
          <span className="text-sm text-ink-500">Showing {filtered.length} of {orders.length} orders</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <span className="text-sm text-ink-600">Page 1 of 1</span>
            <Button variant="ghost" size="sm" disabled>Next</Button>
          </div>
        </div>
      </Card>

      <Drawer
        open={!!detail}
        onClose={() => setDrawerOrder(null)}
        title={detail?.id}
        subtitle={`${detail?.customer} · ${detail?.date}`}
        width="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOrder(null)}>Close</Button>
            <Button variant="primary">Print Invoice</Button>
          </>
        }
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-400 mb-1">Customer</div>
                <div className="text-sm font-medium text-ink-900">{detail.customer}</div>
              </div>
              <Badge variant={statusVariant[detail.status]} dot>{detail.status}</Badge>
            </div>

            <div>
              <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">Items</div>
              <div className="space-y-2">
                {detail.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-2 border-b border-ink-100">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{item.productName}</div>
                      <div className="text-xs text-ink-400">{item.qty} × {formatCurrency(item.price)}</div>
                    </div>
                    <span className="text-sm font-medium text-ink-900">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-ink-500">Subtotal</span><span className="text-ink-900">{formatCurrency(detail.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-500">Discount</span><span className="text-danger-600">-{formatCurrency(detail.discount)}</span></div>
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-ink-100"><span className="text-ink-900">Total</span><span className="text-ink-900">{formatCurrency(detail.total)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-500">Payment Method</span><span className="text-ink-900">{paymentLabel[detail.payment]}</span></div>
            </div>

            <div>
              <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-3">Timeline</div>
              <div className="space-y-3">
                {detail.timeline.map((event, i) => {
                  const Icon = i === 0 ? Package : i === 1 ? CheckCircle2 : i === 2 ? Package : i === 3 ? Truck : CheckCircle2;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${event.done ? 'bg-success-50 text-success-600' : 'bg-ink-100 text-ink-400'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm ${event.done ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{event.label}</div>
                        <div className="text-xs text-ink-400">{event.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
