import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import type { ProductRow } from '@/types';
import { Search, ChevronDown, Plus, Pencil, Trash2, Package } from 'lucide-react';
import api from '@/services/api';

export function ProductsPage({ navigate, addToast }: PageProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role_id === 1;

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && p.category_name !== category) return false;
    if (status !== 'all' && p.status.toLowerCase() !== status.toLowerCase()) return false;
    return true;
  });

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/products/${deleteId}`);
      addToast?.({ type: 'success', title: 'Product deleted', message: 'The product has been removed.' });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Delete Failed', message: err.response?.data?.message || 'Could not delete product' });
      setDeleteId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Products"
        subtitle="Manage your product catalog, pricing, and inventory status."
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Products' }]}
        actions={isAdmin ? <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('product-edit')}>Add Product</Button> : undefined}
      />

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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="out of stock">Out of Stock</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
          </div>
        </div>

        <DataTable<any>
          columns={[
            { key: 'name', label: 'Product', render: (p) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-ink-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-ink-400" />
                </div>
                <div>
                  <div className="font-medium text-ink-900">{p.name}</div>
                  <div className="text-xs text-ink-400">{p.sku}</div>
                </div>
              </div>
            )},
            { key: 'category_name', label: 'Category' },
            { key: 'brand_name', label: 'Brand', render: (p) => p.brand_name || '-' },
            { key: 'current_price', label: 'Price', align: 'right', render: (p) => formatCurrency(p.current_price) },
            { key: 'stock_quantity', label: 'Stock', align: 'right', render: (p) => (
              <span className={p.stock_quantity === 0 ? 'text-danger-600 font-semibold' : p.stock_quantity < p.reorder_level ? 'text-warning-600 font-semibold' : 'text-ink-700'}>{p.stock_quantity}</span>
            )},
            { key: 'status', label: 'Status', align: 'center', render: (p) => (
              <Badge variant={p.status === 'Active' ? 'success' : p.status === 'Inactive' ? 'neutral' : 'warning'} dot>{p.status}</Badge>
            )},
            { key: 'actions', label: '', align: 'right', render: (p) => (
              <div className="flex items-center justify-end gap-1">
                {isAdmin && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); navigate('product-edit', { productId: p.id.toString() }); }} className="p-1.5 rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id.toString()); }} className="p-1.5 rounded-md text-ink-400 hover:bg-danger-50 hover:text-danger-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )},
          ]}
          data={filtered}
          rowKey={(p) => p.id.toString()}
          onRowClick={(p) => navigate('product-edit', { productId: p.id.toString() })}
          isLoading={loading}
        />
      </Card>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Product"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">Are you sure you want to delete this product? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
