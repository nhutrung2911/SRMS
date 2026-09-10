import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { InsightCard } from '@/components/InsightCard';
import { Sparkles, Info, Loader2 } from 'lucide-react';
import api from '@/services/api';
import type { Insight } from '@/types';

export function AIInsightDetailPage({ navigate, addToast }: PageProps & { addToast?: (t: any) => void }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await api.get('/insights');
      setInsights(res.data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load AI business insights.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="AI Insights"
        subtitle="Deep-dive into AI-generated business insights and their supporting evidence."
        breadcrumbs={[{ label: 'Intelligence' }, { label: 'AI Insights' }]}
      />

      <Card padding="lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">How AI Insights work</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              Insights are dynamically synthesized from your actual operational data across inventory turnover, sales velocity, RFM customer segments, and active promotions. Each insight is backed by verified quantitative evidence to support proactive managerial decision-making.
            </p>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-sm">Synthesizing real-time business insights...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-12 text-ink-400 text-sm">
          No critical anomalies or action-required insights detected at this moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onView={() =>
                insight.relatedProduct &&
                navigate('product-detail', { productId: insight.relatedProduct })
              }
              onAction={() => navigate('ai-recommendations')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
