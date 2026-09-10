import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { TrendIndicator } from '@/components/ui/TrendIndicator';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { TrendingUp, Info, Calendar, Loader2 } from 'lucide-react';
import api from '@/services/api';
import type { ForecastPoint } from '@/types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export function ForecastPage({ addToast }: PageProps & { addToast?: (t: any) => void }) {
  const [tab, setTab] = useState('next30');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ expected: number; low: number; high: number; trend: number | null }>({
    expected: 0,
    low: 0,
    high: 0,
    trend: 0,
  });
  const [chartData, setChartData] = useState<ForecastPoint[]>([]);

  const fetchForecast = async (period: string) => {
    try {
      setLoading(true);
      const res = await api.get('/forecast', { params: { period } });
      setSummary(res.data.summary);
      setChartData(res.data.data);
    } catch (error) {
      console.error('Failed to load forecast data:', error);
      addToast?.({ type: 'error', title: 'Error', message: 'Failed to load revenue forecast.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(tab);
  }, [tab]);

  const periodLabel = tab === 'next7' ? 'Next 7 Days' : tab === 'next30' ? 'Next 30 Days' : 'Next Month';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Revenue Forecast"
        subtitle="AI-powered revenue predictions based on historical performance and market trends."
        breadcrumbs={[{ label: 'Revenue' }, { label: 'Forecast' }]}
      />

      <Card padding="md">
        <Tabs
          tabs={[
            { id: 'next7', label: 'Next 7 Days' },
            { id: 'next30', label: 'Next 30 Days' },
            { id: 'nextMonth', label: 'Next Month' },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="lg" hover>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-ink-400" />
            <span className="text-sm font-medium text-ink-500">{periodLabel}</span>
          </div>
          <div className="text-2xl font-bold text-ink-900 mb-2">
            {loading ? '—' : formatCurrency(summary.expected)}
          </div>
          <div className="text-sm text-ink-500">Expected Revenue (SMA Model)</div>
        </Card>

        <Card padding="lg" hover>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-ink-400" />
            <span className="text-sm font-medium text-ink-500">Confidence Range</span>
          </div>
          <div className="text-2xl font-bold text-ink-900 mb-2">
            {loading ? '—' : `${formatCurrency(summary.low)} – ${formatCurrency(summary.high)}`}
          </div>
          <div className="text-sm text-ink-500">90% confidence interval (1.645σ)</div>
        </Card>

        <Card padding="lg" hover>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-ink-400" />
            <span className="text-sm font-medium text-ink-500">Trend</span>
          </div>
          <div className="text-2xl font-bold mb-2">
            {loading ? (
              <span className="text-ink-400">—</span>
            ) : summary.trend !== null ? (
              <span
                className={
                  summary.trend > 0
                    ? 'text-success-600'
                    : summary.trend < 0
                    ? 'text-danger-600'
                    : 'text-ink-700'
                }
              >
                {summary.trend > 0 ? `+${summary.trend}%` : `${summary.trend}%`}
              </span>
            ) : (
              <span className="text-ink-400" title="Không đủ dữ liệu so sánh">N/A</span>
            )}
          </div>
          <TrendIndicator
            change={summary.trend as any}
            direction={summary.trend === null || summary.trend === 0 ? 'flat' : summary.trend > 0 ? 'up' : 'down'}
            sublabel="vs preceding period"
          />
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader
          title="Revenue Forecast Chart"
          subtitle="Actual revenue (solid) and Moving Average forecast (dashed) with 90% confidence band"
        />
        {loading ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-ink-400 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            <span className="text-sm">Calculating revenue projections...</span>
          </div>
        ) : chartData.length > 0 ? (
          <ForecastChart data={chartData} height={400} />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-ink-400 text-sm">
            No historical revenue data available for projection
          </div>
        )}
      </Card>

      <Card padding="lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">How this forecast works</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              The forecast uses a Simple Moving Average (SMA) of daily sales from your historical revenue data combined with sample standard deviation to establish a 90% confidence interval. The confidence band broadens gradually over time to reflect increasing uncertainty in future projections.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
