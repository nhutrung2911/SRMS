import { useState } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { TrendIndicator } from '@/components/ui/TrendIndicator';
import { ForecastChart } from '@/components/charts/ForecastChart';
import { forecastData, forecastSummary, formatCurrency } from '@/data';
import { TrendingUp, Info, Calendar } from 'lucide-react';

export function ForecastPage(_: PageProps) {
  const [tab, setTab] = useState('next30');

  const summary = tab === 'next7' ? forecastSummary.next7Days : tab === 'next30' ? forecastSummary.next30Days : forecastSummary.nextMonth;
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
          <div className="text-2xl font-bold text-ink-900 mb-2">{formatCurrency(summary.expected)}</div>
          <div className="text-sm text-ink-500">Expected Revenue</div>
        </Card>
        <Card padding="lg" hover>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-ink-400" />
            <span className="text-sm font-medium text-ink-500">Confidence Range</span>
          </div>
          <div className="text-2xl font-bold text-ink-900 mb-2">{formatCurrency(summary.low)} – {formatCurrency(summary.high)}</div>
          <div className="text-sm text-ink-500">90% confidence interval</div>
        </Card>
        <Card padding="lg" hover>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-ink-400" />
            <span className="text-sm font-medium text-ink-500">Trend</span>
          </div>
          <div className="text-2xl font-bold text-success-600 mb-2">+{summary.trend}%</div>
          <TrendIndicator change={summary.trend} direction="up" sublabel="vs current period" />
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader title="Revenue Forecast Chart" subtitle="Actual revenue (solid) and AI forecast (dashed) with confidence band" />
        <ForecastChart data={forecastData} height={400} />
      </Card>

      <Card padding="lg">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 mb-1">How this forecast works</h3>
            <p className="text-sm text-ink-500 leading-relaxed">
              The forecast combines three signals: historical revenue trends from the past 90 days, seasonal patterns detected in your sales data, and current market momentum. The confidence band widens over time to reflect increasing uncertainty. Forecasts update daily as new sales data arrives.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
