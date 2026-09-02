import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/services/api';

export function ProductEditPage({ navigate, productId, addToast }: PageProps & { productId?: string }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role_id === 1;

  const [loading, setLoading] = useState(!!productId);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('0');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Out of Stock'>('Active');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [catsRes, brandsRes, supsRes] = await Promise.all([
          api.get('/categories'),
          api.get('/brands'),
          api.get('/suppliers')
        ]);
        setCategories(catsRes.data);
        setBrands(brandsRes.data);
        setSuppliers(supsRes.data);

        if (productId) {
          const prodRes = await api.get(`/products/${productId}`);
          const p = prodRes.data;
          setName(p.name);
          setSku(p.sku);
          setCategoryId(p.category_id?.toString() || '');
          setBrandId(p.brand_id?.toString() || '');
          setSupplierId(p.supplier_id?.toString() || '');
          setCost(p.cost_price?.toString() || '');
          setPrice(p.current_price?.toString() || '');
          setStock(p.stock_quantity?.toString() || '0');
          setReorderLevel(p.reorder_level?.toString() || '0');
          setStatus(p.status || 'Active');
        } else {
          if (catsRes.data.length > 0) setCategoryId(catsRes.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        addToast?.({ type: 'error', title: 'Error', message: 'Failed to load product data' });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [productId, addToast]);

  const costNum = parseFloat(cost) || 0;
  const priceNum = parseFloat(price) || 0;
  const margin = priceNum > 0 ? ((priceNum - costNum) / priceNum) * 100 : 0;

  const handleSave = async () => {
    if (!name || !sku || !categoryId || !cost || !price) {
      addToast?.({ type: 'error', title: 'Validation', message: 'Please fill out all required fields' });
      return;
    }
    
    setSaving(true);
    const payload = {
      name,
      sku,
      category_id: parseInt(categoryId),
      brand_id: brandId ? parseInt(brandId) : null,
      supplier_id: supplierId ? parseInt(supplierId) : null,
      cost_price: costNum,
      base_price: priceNum, // Default base_price to current_price for simplicity if no separate field
      current_price: priceNum,
      stock_quantity: parseInt(stock) || 0,
      reorder_level: parseInt(reorderLevel) || 0,
      status
    };

    try {
      if (productId) {
        await api.put(`/products/${productId}`, payload);
        addToast?.({ type: 'success', title: 'Success', message: 'Product updated successfully' });
      } else {
        await api.post('/products', payload);
        addToast?.({ type: 'success', title: 'Success', message: 'Product created successfully' });
      }
      navigate('products');
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to save product' });
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 focus:outline-none focus:border-brand-500 transition-colors disabled:bg-ink-50 disabled:text-ink-500";
  const labelClass = "block text-xs font-medium text-ink-500 mb-1.5";

  if (loading) {
    return <div className="p-8 text-center text-ink-500">Loading product data...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={productId ? (isAdmin ? 'Edit Product' : 'Product Details') : 'Add Product'}
        subtitle={productId ? `Viewing product information` : 'Create a new product in your catalog'}
        breadcrumbs={[
          { label: 'Commerce', page: 'products' },
          { label: 'Products', page: 'products' },
          { label: productId ? (isAdmin ? 'Edit Product' : 'Product Details') : 'Add Product' },
        ]}
        onNavigate={navigate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="lg">
            <CardHeader title="Basic Information" subtitle="Product name and identification" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>Product Name *</label>
                <input disabled={!isAdmin} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Nike Air Max 2024" />
              </div>
              <div>
                <label className={labelClass}>SKU *</label>
                <input disabled={!isAdmin} value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} placeholder="e.g. NAM-2024" />
              </div>
              <div>
                <label className={labelClass}>Brand</label>
                <select disabled={!isAdmin} value={brandId} onChange={(e) => setBrandId(e.target.value)} className={inputClass}>
                  <option value="">Select Brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Pricing" subtitle="Cost and selling price" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Unit Cost (₫) *</label>
                <input disabled={!isAdmin} type="number" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Selling Price (₫) *</label>
                <input disabled={!isAdmin} type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Margin</label>
                <div className="h-9 px-3 rounded-lg bg-ink-50 border border-ink-100 flex items-center text-sm font-medium text-ink-700">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Inventory" subtitle="Stock management settings" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Current Stock</label>
                <input disabled={!isAdmin} type="number" value={stock} onChange={(e) => setStock(e.target.value)} className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className={labelClass}>Reorder Level</label>
                <input disabled={!isAdmin} type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className={inputClass} placeholder="0" />
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Supplier" subtitle="Vendor details" />
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>Supplier</label>
                <select disabled={!isAdmin} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="lg">
            <CardHeader title="Category & Status" />
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Category *</label>
                <select disabled={!isAdmin} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select disabled={!isAdmin} value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputClass}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-ink-100">
              <span className="text-sm text-ink-500">Margin Preview</span>
              <span className={`text-lg font-bold ${margin >= 25 ? 'text-success-600' : margin < 18 ? 'text-danger-600' : 'text-ink-900'}`}>{margin.toFixed(1)}%</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Profit per unit</span><span className="font-medium text-ink-900">₫{(priceNum - costNum).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Cost ratio</span><span className="font-medium text-ink-900">{priceNum > 0 ? ((costNum / priceNum) * 100).toFixed(1) : 0}%</span></div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('products')}>{isAdmin ? 'Cancel' : 'Back'}</Button>
            {isAdmin && (
              <Button variant="primary" className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Product'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
