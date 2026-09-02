import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { RecommendationCard } from '@/components/InsightCard';
import { Sparkles, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import api from '@/services/api';

export function AIRecommendationsPage({ addToast }: PageProps) {
  const [tab, setTab] = useState('all');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyRec, setApplyRec] = useState<any>(null);
  const [dismissRec, setDismissRec] = useState<any>(null);

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/recommendations');
      setRecommendations(res.data);
    } catch (error) {
      console.error('Failed to load recommendations', error);
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load recommendations' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const filtered = tab === 'all' ? recommendations : recommendations.filter((r) => r.type === tab);

  const counts = {
    all: recommendations.length,
    pricing: recommendations.filter((r) => r.type === 'pricing').length,
    promotion: recommendations.filter((r) => r.type === 'promotion').length,
    inventory: recommendations.filter((r) => r.type === 'inventory').length,
    customer: recommendations.filter((r) => r.type === 'customer').length,
  };

  const highPriority = recommendations.filter((r) => r.priority === 'high' && r.status === 'pending').length;
  const pending = recommendations.filter((r) => r.status === 'pending').length;
  const applied = recommendations.filter((r) => r.status === 'applied').length;

  const confirmApply = async () => {
    if (!applyRec) return;
    try {
      await api.post(`/recommendations/${applyRec.id}/apply`);
      addToast?.({ type: 'success', title: 'Recommendation applied', message: 'The recommendation has been successfully applied.' });
      setApplyRec(null);
      fetchRecommendations();
    } catch (error) {
      console.error(error);
      addToast?.({ type: 'error', title: 'Action failed', message: 'Could not apply recommendation.' });
    }
  };

  const confirmDismiss = async () => {
    if (!dismissRec) return;
    try {
      await api.post(`/recommendations/${dismissRec.id}/dismiss`);
      addToast?.({ type: 'success', title: 'Dismissed', message: 'The recommendation has been dismissed.' });
      setDismissRec(null);
      fetchRecommendations();
    } catch (error) {
      console.error(error);
      addToast?.({ type: 'error', title: 'Action failed', message: 'Could not dismiss recommendation.' });
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center p-12 text-ink-500">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Recommendations"
        subtitle="AI-generated actions to optimize revenue, inventory, and customer engagement."
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'Recommendations' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-danger-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger-600" /></div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{highPriority}</div>
              <div className="text-sm text-ink-500">Pending High Priority</div>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-50 flex items-center justify-center"><Clock className="w-5 h-5 text-warning-600" /></div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{pending}</div>
              <div className="text-sm text-ink-500">Pending Review</div>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-success-600" /></div>
            <div>
              <div className="text-2xl font-bold text-ink-900">{applied}</div>
              <div className="text-sm text-ink-500">Applied</div>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="md">
        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'pricing', label: 'Pricing', count: counts.pricing },
            { id: 'promotion', label: 'Promotion', count: counts.promotion },
            { id: 'inventory', label: 'Inventory', count: counts.inventory },
            { id: 'customer', label: 'Customer', count: counts.customer },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      </Card>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onDismiss={() => setDismissRec(rec)}
              onApply={() => setApplyRec(rec)}
            />
          ))}
        </div>
      ) : (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-ink-400" />
            </div>
            <h3 className="text-sm font-semibold text-ink-800">No recommendations found</h3>
            <p className="text-sm text-ink-500 mt-1 max-w-sm">There are no recommendations in this category.</p>
          </div>
        </Card>
      )}

      {/* Apply Modal */}
      <Modal
        open={!!applyRec}
        onClose={() => setApplyRec(null)}
        title="Apply Recommendation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyRec(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmApply}>Confirm & Apply</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600 mb-4">Are you sure you want to apply the following action?</p>
        {applyRec && (
          <div className="bg-ink-50 p-4 rounded-lg border border-ink-100">
             <div className="font-semibold text-ink-900 mb-1">{applyRec.title}</div>
             <div className="text-ink-700 text-sm">{applyRec.action}</div>
             {applyRec.type === 'pricing' && (
                <div className="mt-3 text-xs text-brand-600 font-medium bg-brand-50 p-2 rounded">
                  <AlertTriangle className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                  This will automatically update the product price in the database.
                </div>
             )}
          </div>
        )}
      </Modal>

      {/* Dismiss Modal */}
      <Modal
        open={!!dismissRec}
        onClose={() => setDismissRec(null)}
        title="Dismiss Recommendation"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDismissRec(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDismiss}>Dismiss</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">Are you sure you want to dismiss this recommendation? It will be marked as rejected and removed from your pending list.</p>
      </Modal>
    </div>
  );
}
