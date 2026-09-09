import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiGrid } from '@/components/ui/KpiCard';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Search, ChevronDown, Plus, Tag, Calendar, CheckSquare, Square } from 'lucide-react';
import api from '@/services/api';
import type { Kpi } from '@/types';

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

export function PromotionsPage({ navigate, addToast }: PageProps & { addToast?: (t: any) => void }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminOrManager = user.role_id === 1 || user.role_id === 2;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [promotions, setPromotions] = useState<any[]>([]);
  const [kpisData, setKpisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Create Modal state
  const [isCreating, setIsCreating] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [savingPromo, setSavingPromo] = useState(false);

  const [form, setForm] = useState({
    name: '',
    discount_type: 'PERCENT',
    discount_value: '',
    start_date: new Date().toISOString().split('T')[0] + ' 00:00:00',
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] + ' 23:59:59',
    min_order_value: '0',
    status: 'Active',
    product_ids: [] as number[],
  });

  const fetchKpis = async () => {
    try {
      const res = await api.get('/promotions/kpis');
      setKpisData(res.data);
    } catch (err) {
      console.error('Failed to load promotion KPIs', err);
    }
  };

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/promotions', {
        params: {
          search: search || undefined,
          status: status !== 'all' ? status : undefined,
        },
      });
      setPromotions(res.data);
    } catch (err) {
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load promotions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchPromotions();
  }, [status]);

  // Load products list for create modal
  useEffect(() => {
    if (isCreating && availableProducts.length === 0) {
      api.get('/products').then((res) => {
        setAvailableProducts(res.data);
      }).catch(() => {
        addToast?.({ type: 'error', title: 'Error', message: 'Failed to load products list' });
      });
    }
  }, [isCreating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPromotions();
  };

  const toggleProductSelect = (id: number) => {
    setForm((prev) => {
      const exists = prev.product_ids.includes(id);
      return {
        ...prev,
        product_ids: exists
          ? prev.product_ids.filter((p) => p !== id)
          : [...prev.product_ids, id],
      };
    });
  };

  const toggleSelectAll = () => {
    if (form.product_ids.length === filteredProducts.length) {
      setForm((prev) => ({ ...prev, product_ids: [] }));
    } else {
      setForm((prev) => ({
        ...prev,
        product_ids: filteredProducts.map((p) => p.id),
      }));
    }
  };

  const handleCreateSubmit = async () => {
    if (!form.name.trim()) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please enter a campaign name' });
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please enter a valid discount value' });
      return;
    }
    if (form.product_ids.length === 0) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please select at least one product' });
      return;
    }

    setSavingPromo(true);
    try {
      await api.post('/promotions', {
        name: form.name.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        start_date: form.start_date,
        end_date: form.end_date,
        min_order_value: parseFloat(form.min_order_value || '0'),
        status: form.status,
        product_ids: form.product_ids,
      });

      addToast?.({ type: 'success', title: 'Success', message: 'Promotion campaign created successfully' });
      setIsCreating(false);
      setForm({
        name: '',
        discount_type: 'PERCENT',
        discount_value: '',
        start_date: new Date().toISOString().split('T')[0] + ' 00:00:00',
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] + ' 23:59:59',
        min_order_value: '0',
        status: 'Active',
        product_ids: [],
      });
      fetchKpis();
      fetchPromotions();
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to create promotion' });
    } finally {
      setSavingPromo(false);
    }
  };

  // Build KPIs cards
  const kpis: Kpi[] = [
    {
      id: 'active',
      label: 'Active Promotions',
      value: kpisData?.active_promotions?.toString() ?? '—',
      rawValue: kpisData?.active_promotions ?? 0,
      sublabel: 'Currently running',
      format: 'number',
    },
    {
      id: 'revFromPromo',
      label: 'Revenue from Promotions',
      value: kpisData ? formatCurrency(kpisData.revenue_from_promotions) : '—',
      rawValue: kpisData?.revenue_from_promotions ?? 0,
      sublabel: 'From completed orders',
      format: 'currency',
    },
    {
      id: 'discountCost',
      label: 'Discount Cost',
      value: kpisData ? formatCurrency(kpisData.discount_cost) : '—',
      rawValue: kpisData?.discount_cost ?? 0,
      sublabel: 'Total discount granted',
      format: 'currency',
    },
    {
      id: 'revDiscountRatio',
      label: 'Rev-to-Discount Ratio',
      value: kpisData?.rev_discount_ratio ? `${kpisData.rev_discount_ratio}x` : '—',
      rawValue: kpisData?.rev_discount_ratio ?? 0,
      sublabel: 'Revenue / discount cost',
      format: 'number',
    },
    {
      id: 'profitImpact',
      label: 'Profit Impact',
      value: kpisData ? formatCurrency(kpisData.profit_impact) : '—',
      rawValue: kpisData?.profit_impact ?? 0,
      sublabel: `Margin: ${kpisData?.margin ?? 0}%`,
      format: 'currency',
    },
  ];

  const filteredProducts = availableProducts.filter((p) => {
    if (!productSearch) return true;
    const query = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Promotion Performance"
        subtitle="Measure the real impact of promotions on revenue, profit, and customer behavior."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Promotions' }]}
        actions={
          isAdminOrManager && (
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Promotion
            </Button>
          )
        }
      />

      <KpiGrid kpis={kpis} />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns by name and press Enter..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500"
            />
          </form>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="ended">Ended</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
        </div>

        <DataTable<any>
          isLoading={loading}
          columns={[
            {
              key: 'campaign',
              label: 'Campaign',
              render: (p) => (
                <div>
                  <div className="font-medium text-ink-900 flex items-center gap-2">
                    <span>{p.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-semibold">
                      {p.discount_type === 'PERCENT'
                        ? `-${parseFloat(p.discount_value)}%`
                        : `-${Number(p.discount_value).toLocaleString('vi-VN')}đ`}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(p.start_date).toLocaleDateString('vi-VN')} – {new Date(p.end_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: 'products',
              label: 'Products',
              align: 'center',
              render: (p) => `${p.total_products} items`,
            },
            {
              key: 'orders',
              label: 'Orders',
              align: 'right',
              render: (p) => p.orders_count.toLocaleString(),
            },
            {
              key: 'revenue',
              label: 'Revenue',
              align: 'right',
              render: (p) => formatCurrency(p.total_revenue),
            },
            {
              key: 'profit',
              label: 'Profit',
              align: 'right',
              render: (p) => (
                <span className={p.total_profit < 0 ? 'text-danger-600 font-medium' : 'text-ink-900'}>
                  {formatCurrency(p.total_profit)}
                </span>
              ),
            },
            {
              key: 'discountCost',
              label: 'Discount Cost',
              align: 'right',
              render: (p) => formatCurrency(p.total_discount),
            },
            {
              key: 'revDiscountRatio',
              label: 'Rev / Discount',
              align: 'right',
              render: (p) => (p.rev_discount_ratio > 0 ? `${p.rev_discount_ratio}x` : '—'),
            },
            {
              key: 'roi_status',
              label: 'Performance',
              align: 'center',
              render: (p) => (
                <Badge variant={roiStatusVariant[p.roi_status] ?? 'neutral'} dot>
                  {p.roi_status}
                </Badge>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              align: 'center',
              render: (p) => (
                <Badge variant={statusVariant[p.display_status] ?? 'neutral'} dot>
                  {p.display_status}
                </Badge>
              ),
            },
          ]}
          data={promotions}
          rowKey={(p) => p.id.toString()}
          onRowClick={(p) => navigate('promotion-detail', { promotionId: p.id.toString() })}
        />
      </Card>

      {/* Create Promotion Modal */}
      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create New Promotion Campaign"
        width="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={savingPromo} onClick={handleCreateSubmit}>
              Create Campaign
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">Campaign Name *</label>
            <input
              type="text"
              placeholder="e.g. Autumn Flash Sale 2026"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Discount Type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="PERCENT">Percentage Discount (%)</option>
                <option value="FIXED">Fixed Amount (VNĐ)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                Discount Value * {form.discount_type === 'PERCENT' ? '(%)' : '(VNĐ)'}
              </label>
              <input
                type="number"
                min="0.1"
                step={form.discount_type === 'PERCENT' ? '1' : '1000'}
                placeholder={form.discount_type === 'PERCENT' ? '15' : '50000'}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Start Date *</label>
              <input
                type="datetime-local"
                value={form.start_date.replace(' ', 'T').substring(0, 16)}
                onChange={(e) => setForm({ ...form, start_date: e.target.value.replace('T', ' ') + ':00' })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">End Date *</label>
              <input
                type="datetime-local"
                value={form.end_date.replace(' ', 'T').substring(0, 16)}
                onChange={(e) => setForm({ ...form, end_date: e.target.value.replace('T', ' ') + ':59' })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Min Order Value (VNĐ)</label>
              <input
                type="number"
                min="0"
                value={form.min_order_value}
                onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="Active">Active (Live immediately if dates match)</option>
                <option value="Draft">Draft (Saved for review)</option>
              </select>
            </div>
          </div>

          {/* Product Multi-selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink-700">
                Applied Products * ({form.product_ids.length} selected)
              </label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                {form.product_ids.length === filteredProducts.length ? 'Deselect All' : 'Select All Filtered'}
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded border border-ink-200 text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-ink-200 rounded-lg divide-y divide-ink-100 bg-white">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-400">No products found</div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = form.product_ids.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductSelect(p.id)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-ink-50 text-xs transition-colors ${
                        isSelected ? 'bg-brand-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-ink-300 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-medium text-ink-900">{p.name}</div>
                          <div className="text-ink-400 text-[11px]">{p.sku}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-ink-800">{formatCurrency(p.current_price ?? 0)}</div>
                        <div className="text-ink-400 text-[11px]">Stock: {p.stock_quantity ?? 0}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
