import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KpiGrid } from '@/components/ui/KpiCard';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import type { RiskLevel } from '@/types';
import { Search, ChevronDown, Package, Edit2 } from 'lucide-react';
import api from '@/services/api';

const riskVariant: Record<RiskLevel, 'critical' | 'high' | 'medium' | 'low'> = {
  critical: 'critical', high: 'high', medium: 'medium', low: 'low',
};

export function InventoryPage({ navigate, addToast }: PageProps) {
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  
  const [kpis, setKpis] = useState<any[]>([]);
  const [inventoryRows, setInventoryRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [adjustType, setAdjustType] = useState('IN');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const fetchData = async () => {
    try {
      const [kpiRes, listRes] = await Promise.all([
        api.get('/inventory/kpis'),
        api.get('/inventory')
      ]);
      setKpis(kpiRes.data);
      setInventoryRows(listRes.data);
    } catch (error) {
      console.error(error);
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to fetch inventory data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjust = async () => {
    if (!adjustQty || isNaN(Number(adjustQty))) return;
    try {
      await api.post(`/inventory/${adjustItem.productId}/adjust`, {
        type: adjustType,
        quantity: parseInt(adjustQty, 10),
        note: adjustNote
      });
      addToast?.({ type: 'success', title: 'Success', message: 'Stock adjusted successfully' });
      setAdjustItem(null);
      fetchData(); // reload
    } catch (error: any) {
      addToast?.({ type: 'error', title: 'Failed', message: error.response?.data?.message || 'Could not adjust stock' });
    }
  };

  const filtered = inventoryRows.filter((r) => {
    if (search && !r.productName.toLowerCase().includes(search.toLowerCase()) && !r.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (risk !== 'all' && r.risk !== risk) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.risk as RiskLevel] - order[b.risk as RiskLevel];
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventory Intelligence"
        subtitle="Monitor stock levels, identify risks, and optimize replenishment."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Inventory' }]}
        actions={<Button variant="secondary" size="md" icon={<Package className="w-4 h-4" />}>Reorder Report</Button>}
      />

      {kpis.length > 0 && <KpiGrid kpis={kpis} />}

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full h-9 pl-9 pr-4 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div className="relative">
            <select
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
        </div>

        <DataTable<any>
          columns={[
            { key: 'productName', label: 'Product', render: (r) => (
              <div>
                <div className="font-medium text-ink-900">{r.productName}</div>
                <div className="text-xs text-ink-400">{r.sku} · {r.category}</div>
              </div>
            )},
            { key: 'currentStock', label: 'Current Stock', align: 'right', render: (r) => (
              <span className={r.currentStock === 0 ? 'text-danger-600 font-semibold' : r.currentStock < r.reorderLevel ? 'text-warning-600 font-semibold' : 'text-ink-700'}>{r.currentStock}</span>
            )},
            { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
            { key: 'salesVelocity', label: 'Velocity', align: 'right', render: (r) => `${r.salesVelocity}/day` },
            { key: 'daysRemaining', label: 'Days Left', align: 'right', render: (r) => (
              <span className={r.daysRemaining <= 3 ? 'text-danger-600 font-semibold' : r.daysRemaining <= 7 ? 'text-warning-600 font-semibold' : 'text-ink-700'}>
                {r.daysRemaining > 900 ? 'N/A' : `${r.daysRemaining}d`}
              </span>
            )},
            { key: 'risk', label: 'Risk', align: 'center', render: (r) => (
              <Badge variant={riskVariant[r.risk as RiskLevel]} dot>{r.risk}</Badge>
            )},
            { key: 'recommendation', label: 'Recommendation', render: (r) => (
              <span className={r.risk === 'critical' || r.risk === 'high' ? 'text-danger-600 text-sm font-medium' : r.risk === 'medium' ? 'text-warning-600 text-sm' : 'text-ink-500 text-sm'}>{r.recommendation}</span>
            )},
            { key: 'actions', label: '', align: 'right', render: (r) => (
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Edit2 className="w-3.5 h-3.5" />}
                onClick={(e) => { e.stopPropagation(); setAdjustItem(r); setAdjustQty(''); setAdjustNote(''); }}
              >
                Adjust
              </Button>
            )}
          ]}
          data={sorted}
          rowKey={(r) => r.productId}
          onRowClick={(r) => navigate('product-detail', { productId: r.productId })}
          isLoading={loading}
        />
      </Card>

      <Modal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        title="Adjust Stock"
      >
        {adjustItem && (
          <div className="space-y-4">
            <div>
              <div className="font-semibold text-ink-900">{adjustItem.productName}</div>
              <div className="text-sm text-ink-500">Current stock: {adjustItem.currentStock}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Adjustment Type</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-ink-200 focus:outline-none focus:border-brand-500 bg-white"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value)}
              >
                <option value="IN">Stock In (+)</option>
                <option value="OUT">Stock Out (-)</option>
                <option value="ADJUSTMENT">Adjustment (±)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Quantity</label>
              <input
                type="number"
                className="w-full h-10 px-3 rounded-lg border border-ink-200 focus:outline-none focus:border-brand-500"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                placeholder="Enter amount..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                className="w-full h-10 px-3 rounded-lg border border-ink-200 focus:outline-none focus:border-brand-500"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Reason for adjustment..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-ink-100 mt-6">
              <Button variant="secondary" onClick={() => setAdjustItem(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleAdjust}>Confirm Adjustment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
