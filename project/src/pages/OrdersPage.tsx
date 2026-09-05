import { useState, useEffect, useMemo } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Search, ChevronDown, CheckCircle2, Clock, Package, Truck, XCircle, Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  Completed: 'success', Processing: 'info', Confirmed: 'info', Pending: 'warning', Cancelled: 'danger', Refunded: 'neutral',
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export function OrdersPage({ navigate, initialOrderId, addToast }: PageProps & { initialOrderId?: string }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrManager = user.role_id === 1 || user.role_id === 2;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail Drawer state
  const [drawerOrder, setDrawerOrder] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Create Order Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [newOrder, setNewOrder] = useState<{ customer_id: string; items: { product_id: string; quantity: string; unit_price: string; promotion_id: string }[] }>({
    customer_id: '',
    items: []
  });
  const [savingOrder, setSavingOrder] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      // If backend uses pagination, it returns data in res.data.data
      setOrders(res.data.data || res.data);
    } catch (err) {
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to fetch orders' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (initialOrderId) setDrawerOrder(initialOrderId);
  }, [initialOrderId]);

  useEffect(() => {
    if (drawerOrder) {
      setLoadingDetail(true);
      api.get(`/orders/${drawerOrder}`).then(res => {
        setDetail(res.data);
      }).catch(err => {
        addToast?.({ type: 'error', title: 'Error', message: 'Failed to fetch order details' });
      }).finally(() => {
        setLoadingDetail(false);
      });
    } else {
      setDetail(null);
    }
  }, [drawerOrder]);

  const loadReferenceData = async () => {
    if (customers.length > 0) return;
    try {
      const [cRes, pRes, prRes] = await Promise.all([
        api.get('/reference/customers'),
        api.get('/products'),
        api.get('/reference/promotions')
      ]);
      setCustomers(cRes.data);
      setProducts(pRes.data);
      setPromotions(prRes.data);
    } catch (err) {
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load reference data' });
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!detail) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/orders/${detail.id}`, { status: newStatus });
      addToast?.({ type: 'success', title: 'Success', message: `Order marked as ${newStatus}` });
      setDrawerOrder(null);
      fetchOrders();
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Error' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (search && !o.id.toString().includes(search) && !o.customer_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (status !== 'all' && o.status.toLowerCase() !== status.toLowerCase()) return false;
    return true;
  });

  const handleAddItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { product_id: '', quantity: '1', unit_price: '', promotion_id: '' }]
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...newOrder.items];
    (updated[index] as any)[field] = value;
    
    // Auto-fill price if product is selected
    if (field === 'product_id' && value) {
      const p = products.find(prod => prod.id.toString() === value);
      if (p) updated[index].unit_price = p.current_price.toString();
    }

    setNewOrder({ ...newOrder, items: updated });
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...newOrder.items];
    updated.splice(index, 1);
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleSubmitOrder = async () => {
    if (!newOrder.customer_id || newOrder.items.length === 0) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please select a customer and add at least one item' });
      return;
    }
    
    const hasEmptyItem = newOrder.items.some(i => !i.product_id || !i.quantity || !i.unit_price);
    if (hasEmptyItem) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please fill all item fields' });
      return;
    }

    setSavingOrder(true);
    try {
      const payload = {
        customer_id: parseInt(newOrder.customer_id),
        items: newOrder.items.map(i => ({
          product_id: parseInt(i.product_id),
          quantity: parseInt(i.quantity),
          unit_price: parseFloat(i.unit_price),
          promotion_id: i.promotion_id ? parseInt(i.promotion_id) : null
        }))
      };
      await api.post('/orders', payload);
      addToast?.({ type: 'success', title: 'Success', message: 'Order created successfully' });
      setIsCreating(false);
      setNewOrder({ customer_id: '', items: [] });
      fetchOrders();
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Error creating order' });
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Orders"
        subtitle="Track and manage customer orders across all channels."
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Orders' }]}
        actions={
          <Button variant="primary" onClick={() => { loadReferenceData(); setIsCreating(true); }} icon={<Plus className="w-4 h-4" />}>
            Create Order
          </Button>
        }
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

        <DataTable<any>
          columns={[
            { key: 'id', label: 'Order ID', render: (o) => <span className="font-medium text-ink-900">#{o.id}</span> },
            { key: 'customer_name', label: 'Customer' },
            { key: 'order_date', label: 'Date', render: (o) => new Date(o.order_date).toLocaleDateString() },
            { key: 'final_amount', label: 'Total', align: 'right', render: (o) => formatCurrency(o.final_amount) },
            { key: 'status', label: 'Status', align: 'center', render: (o) => (
              <Badge variant={statusVariant[o.status] || 'neutral'} dot>{o.status}</Badge>
            )},
          ]}
          data={filtered}
          rowKey={(o) => o.id.toString()}
          onRowClick={(o) => setDrawerOrder(o.id.toString())}
          isLoading={loading}
        />
      </Card>

      <Drawer
        open={!!drawerOrder}
        onClose={() => setDrawerOrder(null)}
        title={detail ? `Order #${detail.id}` : 'Loading...'}
        subtitle={detail ? `${detail.customer_name} · ${new Date(detail.order_date).toLocaleString()}` : ''}
        width="max-w-xl"
        footer={
          detail && (
            <>
              <Button variant="secondary" onClick={() => setDrawerOrder(null)}>Close</Button>
              {detail.status === 'Pending' && (
                <Button variant="primary" onClick={() => handleUpdateStatus('Processing')} disabled={updatingStatus}>Process Order</Button>
              )}
              {detail.status === 'Processing' && (
                <Button variant="success" onClick={() => handleUpdateStatus('Completed')} disabled={updatingStatus}>Mark Completed</Button>
              )}
              {isAdminOrManager && (detail.status === 'Pending' || detail.status === 'Processing') && (
                <Button variant="danger" onClick={() => handleUpdateStatus('Cancelled')} disabled={updatingStatus}>Cancel Order</Button>
              )}
              {isAdminOrManager && detail.status === 'Completed' && (
                <Button variant="danger" onClick={() => handleUpdateStatus('Refunded')} disabled={updatingStatus}>Refund Order</Button>
              )}
            </>
          )
        }
      >
        {loadingDetail ? (
          <div className="p-8 text-center text-ink-500">Loading order details...</div>
        ) : detail && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-ink-400 mb-1">Customer Details</div>
                <div className="text-sm font-medium text-ink-900">{detail.customer_name}</div>
                <div className="text-xs text-ink-500">{detail.email || 'No email'} · {detail.phone || 'No phone'}</div>
              </div>
              <Badge variant={statusVariant[detail.status] || 'neutral'} dot size="lg">{detail.status}</Badge>
            </div>

            <div>
              <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-2">Order Items</div>
              <div className="bg-ink-50 rounded-lg p-1 border border-ink-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-500">
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Discount</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items?.map((item: any) => (
                      <tr key={item.id} className="border-t border-ink-100 bg-white">
                        <td className="p-2">
                          <div className="font-medium text-ink-900">{item.product_name}</div>
                          <div className="text-xs text-ink-400">{item.sku}</div>
                          {item.promotion_name && <Badge variant="success" className="mt-1 text-[10px]">{item.promotion_name}</Badge>}
                        </td>
                        <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2 text-right font-medium">{item.quantity}</td>
                        <td className="p-2 text-right text-danger-600">-{formatCurrency(item.discount_amount)}</td>
                        <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-ink-200 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-ink-500">Total Before Discount</span><span className="text-ink-900 font-medium">{formatCurrency(detail.total_amount)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-ink-500">Total Discount</span><span className="text-danger-600 font-medium">-{formatCurrency(detail.discount_amount)}</span></div>
              <div className="flex justify-between text-base font-bold pt-3 mt-3 border-t border-ink-100"><span className="text-ink-900">Final Amount</span><span className="text-brand-600">{formatCurrency(detail.final_amount)}</span></div>
            </div>
            
            {(detail.status === 'Refunded' || detail.status === 'Cancelled') && (
              <div className="bg-danger-50 text-danger-700 p-3 rounded-lg text-sm flex gap-2 items-start">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>This order was {detail.status.toLowerCase()}. Inventory has been restored and revenue reverted.</span>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create New Order"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmitOrder} disabled={savingOrder}>{savingOrder ? 'Saving...' : 'Submit Order'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Customer *</label>
            <select
              value={newOrder.customer_id}
              onChange={(e) => setNewOrder({...newOrder, customer_id: e.target.value})}
              className="w-full h-9 px-3 rounded-lg border border-ink-200 focus:outline-none focus:border-brand-500"
            >
              <option value="">Select Customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink-700">Order Items *</label>
              <Button variant="secondary" size="sm" onClick={handleAddItem} icon={<Plus className="w-4 h-4" />}>Add Item</Button>
            </div>
            
            {newOrder.items.length === 0 ? (
              <div className="text-center p-6 bg-ink-50 rounded-lg border border-dashed border-ink-200 text-ink-500 text-sm">
                No items added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {newOrder.items.map((item, index) => (
                  <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-start bg-ink-50 p-2 rounded-lg border border-ink-100">
                    <div className="flex-1 min-w-[200px]">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full h-9 px-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Product...</option>
                        {products.map(p => <option key={p.id} value={p.id} disabled={p.stock_quantity <= 0}>{p.name} (Stock: {p.stock_quantity})</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <input
                        type="number" min="1" placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full h-9 px-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="w-28">
                      <input
                        type="number" placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        className="w-full h-9 px-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="w-32">
                      <select
                        value={item.promotion_id}
                        onChange={(e) => handleItemChange(index, 'promotion_id', e.target.value)}
                        className="w-full h-9 px-2 rounded-md border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="">No Promo</option>
                        {promotions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <button onClick={() => handleRemoveItem(index)} className="w-9 h-9 flex items-center justify-center text-danger-500 hover:bg-danger-50 rounded-md">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="text-xs text-ink-500 mt-2 bg-brand-50 text-brand-700 p-2 rounded">
            Note: Creating an order sets its status to Pending. Inventory will only be deducted when the order is marked as Completed. Discounts will be calculated automatically by the backend.
          </div>
        </div>
      </Modal>
    </div>
  );
}
