import { useState, useEffect, useMemo } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KpiGrid } from '@/components/ui/KpiCard';
import { DataTable } from '@/components/ui/DataTable';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/data';
import type { CustomerRow, CustomerSegment, CustomerStatus, Kpi } from '@/types';
import { Search, ChevronDown, ChevronLeft, ChevronRight, UserPlus, Loader2 } from 'lucide-react';
import api from '@/services/api';

const segmentVariant: Record<string, any> = {
  champion: 'brand',
  loyal: 'success',
  'potential-loyalist': 'info',
  new: 'neutral',
  'at-risk': 'warning',
  lost: 'danger',
};

const statusVariant: Record<string, any> = {
  active: 'success',
  vip: 'brand',
  dormant: 'neutral',
  'at-risk': 'warning',
};

export function CustomersPage({ navigate, addToast }: PageProps) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // API Data
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [segmentation, setSegmentation] = useState<any[]>([]);
  const [rfmOverview, setRfmOverview] = useState<any>(null);
  
  // Pagination State
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Add Customer Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast?.({ type: 'warning', title: 'Validation error', message: 'Customer name is required.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/customers', {
        name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
      });

      addToast?.({ type: 'success', title: 'Customer registered', message: `Customer "${formName}" was registered successfully.` });
      setAddModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormAddress('');
      fetchAnalytics(currentPage, segment);
    } catch (err: any) {
      const errMsg = err.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join(' ')
        : (err.response?.data?.message || 'Failed to register customer.');
      addToast?.({ type: 'danger', title: 'Registration failed', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAnalytics = async (page = 1, filterSegment = 'all') => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/customers?page=${page}&segment=${filterSegment}`);
      const data = res.data;

      // Map KPIs
      setKpis([
        { id: 'total', label: 'Total Customers', value: data.kpis.total.toString(), rawValue: data.kpis.total, change: 0, direction: 'flat', format: 'number' },
        { id: 'new', label: 'New Customers', value: data.kpis.new.toString(), rawValue: data.kpis.new, change: 0, direction: 'flat', sublabel: 'Last 30 Days', format: 'number' },
        { id: 'returning', label: 'Returning', value: data.kpis.returning.toString(), rawValue: data.kpis.returning, change: 0, direction: 'flat', sublabel: '> 1 Order', format: 'number' },
        { id: 'vip', label: 'VIP Customers', value: data.kpis.vip.toString(), rawValue: data.kpis.vip, change: 0, direction: 'flat', format: 'number' },
        { id: 'atrisk', label: 'At-Risk Customers', value: data.kpis.at_risk.toString(), rawValue: data.kpis.at_risk, change: 0, direction: 'flat', format: 'number' },
      ]);

      // Map Segmentation
      const colorMap: Record<string, string> = {
        'Champions': '#1E66F3',
        'Loyal': '#10B981',
        'Average': '#F59E0B',
        'Recent': '#3B82F6',
        'At Risk': '#EF4444',
        'Lost': '#64748B',
      };
      
      setSegmentation(data.segmentation.map((s: any) => ({
        ...s,
        color: colorMap[s.segment] || '#CBD5E1'
      })));

      setRfmOverview(data.rfm_overview);

      // Pagination
      setCustomers(data.customers.data);
      setCurrentPage(data.customers.current_page);
      setTotalPages(data.customers.last_page);
      setTotalRecords(data.customers.total);

    } catch (error: any) {
      if (error.response?.status === 403) {
        addToast?.({ type: 'error', title: 'Access Denied', message: 'You do not have permission to view customer analytics.' });
        navigate('dashboard');
      } else {
        console.error('Error fetching analytics:', error);
        addToast?.({ type: 'error', title: 'Data load failed', message: 'Could not fetch customer analytics.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(currentPage, segment);
  }, [currentPage, segment]);

  // Client-side search filtering (since we didn't implement backend search yet)
  const filtered = useMemo(() => {
    if (!search) return customers;
    return customers.filter((c) => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, customers]);

  if (loading && kpis.length === 0) {
    return <div className="h-full flex items-center justify-center p-12 text-ink-500">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Customer Analytics"
        subtitle="Understand customer behavior, segments, and lifetime value."
        breadcrumbs={[{ label: 'Commerce' }, { label: 'Customer Analytics' }]}
        actions={
          <Button variant="primary" size="md" icon={<UserPlus className="w-4 h-4" />} onClick={() => setAddModalOpen(true)}>
            Add Customer
          </Button>
        }
      />

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <CardHeader title="Customer Segmentation" subtitle="RFM-based segments" />
          <div className="space-y-3 mt-4">
            {segmentation.map((seg) => (
              <div key={seg.segment} className="flex items-center gap-3">
                <div className="w-28 text-sm text-ink-600 truncate flex-shrink-0">{seg.segment}</div>
                <div className="flex-1">
                  <Progress value={seg.share} color="" className="" trackClassName="" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-ink-400">{seg.count} customers · {seg.share}%</span>
                    <span className="text-xs font-medium text-ink-700">{formatCurrency(seg.revenue)}</span>
                  </div>
                </div>
                <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="RFM Overview" subtitle="Recency, Frequency, Monetary analysis" />
          <div className="space-y-4 mt-4">
            {rfmOverview && [
              { label: 'Recency', desc: 'Avg days since last purchase', value: Math.max(0, 100 - rfmOverview.recency), max: 100, color: 'bg-brand-600', display: `${rfmOverview.recency} days` },
              { label: 'Frequency', desc: 'Avg. orders per customer', value: rfmOverview.frequency * 10, max: 100, color: 'bg-success-600', display: `${rfmOverview.frequency} orders` },
              { label: 'Monetary', desc: 'Avg. customer spend', value: (rfmOverview.monetary / 100000000) * 100, max: 100, color: 'bg-info-600', display: formatCurrency(rfmOverview.monetary) },
            ].map((rfm) => (
              <div key={rfm.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-ink-700">{rfm.label}</span>
                    <span className="text-xs text-ink-400 ml-2">{rfm.desc}</span>
                  </div>
                  <Badge variant="neutral">{rfm.display}</Badge>
                </div>
                <Progress value={rfm.value} max={rfm.max} color={rfm.color} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search currently loaded customers..."
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="relative">
              <select
                value={segment}
                onChange={(e) => {
                  setSegment(e.target.value);
                  setCurrentPage(1); // Reset page on filter
                }}
                className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:border-brand-500 cursor-pointer capitalize"
              >
                <option value="all">All Segments</option>
                <option value="champion">Champions</option>
                <option value="loyal">Loyal</option>
                <option value="potential-loyalist">Potential Loyalists</option>
                <option value="new">New</option>
                <option value="at-risk">At Risk</option>
                <option value="lost">Lost</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-500 mr-2">Total: {totalRecords}</span>
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded bg-ink-100 text-ink-600 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-ink-700">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded bg-ink-100 text-ink-600 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <DataTable<CustomerRow>
          columns={[
            { key: 'name', label: 'Customer', render: (c) => (
              <div>
                <div className="font-medium text-ink-900">{c.name}</div>
                <div className="text-xs text-ink-400">{c.email}</div>
              </div>
            )},
            { key: 'segment', label: 'Segment', align: 'center', render: (c) => (
              <Badge variant={segmentVariant[c.segment] || 'neutral'}>{c.segment.replace('-', ' ')}</Badge>
            )},
            { key: 'orders', label: 'Orders', align: 'right' },
            { key: 'totalSpent', label: 'Total Spent', align: 'right', render: (c) => formatCurrency(c.totalSpent) },
            { key: 'lastPurchase', label: 'Last Purchase', align: 'right' },
            { key: 'aov', label: 'AOV', align: 'right', render: (c) => formatCurrency(c.aov) },
            { key: 'clv', label: 'CLV', align: 'right', render: (c) => formatCurrency(c.clv) },
            { key: 'status', label: 'Status', align: 'center', render: (c) => (
              <Badge variant={statusVariant[c.status] || 'neutral'} dot>{c.status}</Badge>
            )},
          ]}
          data={filtered}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate('customer-detail', { customerId: c.id })}
        />
      </Card>

      {/* Create Customer Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">
              Customer Name <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nguyen Van A"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="e.g. customer@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 0901234567"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Shipping Address</label>
            <textarea
              rows={2}
              placeholder="e.g. 123 Nguyen Trai, Q.1, TP.HCM"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-ink-100">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setAddModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
              icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            >
              {submitting ? 'Registering...' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
