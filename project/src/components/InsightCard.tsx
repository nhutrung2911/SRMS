import type { Insight, Recommendation } from '@/types';
import { formatCurrency } from '@/data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Lightbulb, TrendingUp, Users, Tag, Package, Clock } from 'lucide-react';

const typeConfig = {
  inventory: { icon: Package, color: 'text-warning-600', bg: 'bg-warning-50', border: 'border-warning-200', label: 'Inventory Risk' },
  pricing: { icon: Tag, color: 'text-info-600', bg: 'bg-info-50', border: 'border-info-200', label: 'Pricing Opportunity' },
  promotion: { icon: TrendingUp, color: 'text-success-600', bg: 'bg-success-50', border: 'border-success-200', label: 'Promotion Insight' },
  customer: { icon: Users, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-200', label: 'Customer Insight' },
  revenue: { icon: AlertTriangle, color: 'text-danger-600', bg: 'bg-danger-50', border: 'border-danger-200', label: 'Revenue Alert' },
};

export function InsightCard({ insight, onView, onAction }: { insight: Insight; onView?: () => void; onAction?: () => void }) {
  const cfg = typeConfig[insight.type];
  const Icon = insight.type === 'inventory' ? AlertTriangle : insight.type === 'pricing' ? Lightbulb : cfg.icon;
  const impactVariant = insight.impact === 'high' ? 'high' : insight.impact === 'medium' ? 'medium' : 'low';

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 transition-shadow hover:shadow-card-hover`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
          <Icon className={`w-4.5 h-4.5 ${cfg.color}`} style={{ width: 18, height: 18 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            <Badge variant={impactVariant} dot>Impact: {insight.impact}</Badge>
          </div>
          <h4 className="text-sm font-semibold text-ink-900">{insight.title}</h4>
        </div>
      </div>
      <p className="text-sm text-ink-600 leading-relaxed mb-3">{insight.description}</p>
      <div className="bg-white/60 rounded-lg p-3 mb-3">
        <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">Recommended Action</div>
        <p className="text-sm text-ink-700">{insight.action}</p>
      </div>
      <div className="flex items-center gap-2">
        {insight.relatedProduct && (
          <Button variant="secondary" size="sm" onClick={onView}>View Product</Button>
        )}
        <Button variant="primary" size="sm" onClick={onAction}>Take Action</Button>
      </div>
    </div>
  );
}

export function RecommendationCard({ rec, onDismiss, onApply }: { rec: any; onDismiss?: () => void; onApply?: () => void }) {
  const cfg = typeConfig[rec.type as keyof typeof typeConfig] || { icon: Lightbulb, color: 'text-ink-600', bg: 'bg-ink-50', border: 'border-ink-200', label: 'Insight' };
  const Icon = rec.type === 'inventory' ? AlertTriangle : rec.type === 'pricing' ? Lightbulb : cfg.icon;
  const priorityVariant = rec.priority === 'high' ? 'high' : rec.priority === 'medium' ? 'medium' : 'low';
  const statusConfig: Record<string, any> = {
    pending: { label: 'Pending', variant: 'warning' },
    applied: { label: 'Applied', variant: 'success' },
    dismissed: { label: 'Dismissed', variant: 'neutral' },
  };

  const statusInfo = statusConfig[rec.status] || { label: rec.status, variant: 'neutral' };

  return (
    <div className="rounded-xl border border-ink-200/60 bg-white p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant} dot>{rec.priority.toUpperCase()} PRIORITY</Badge>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        {rec.confidence && (
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <span>Confidence</span>
            <span className="font-semibold text-ink-700">{rec.confidence}%</span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 mb-3">
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${cfg.color}`} />
        <h4 className="text-sm font-semibold text-ink-900">{rec.title}</h4>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-1">Reason</div>
          <p className="text-ink-600">{rec.reason}</p>
        </div>

        <div>
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-1.5">Recommended Action</div>
          <p className="text-ink-700 flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-brand-600 mt-0.5 flex-shrink-0" />
            <span>{rec.action}</span>
          </p>
        </div>
      </div>

      {rec.impactAnalysis && (
        <div className="mt-3 p-3 rounded-lg bg-ink-50 border border-ink-100">
          <div className="text-xs font-semibold text-ink-900 uppercase tracking-wider mb-2">Post-Action Impact (Daily Avg)</div>
          {!rec.impactAnalysis.hasEnoughData ? (
            <div className="text-xs text-ink-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Gathering data... (Need at least 2 days)
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Revenue</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink-900">{formatCurrency(rec.impactAnalysis.before.revenue)} → {formatCurrency(rec.impactAnalysis.after.revenue)}</span>
                  {rec.impactAnalysis.change.revenue !== null && (
                    <span className={`text-xs font-medium ${rec.impactAnalysis.change.revenue > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {rec.impactAnalysis.change.revenue > 0 ? '↑' : '↓'} {Math.abs(rec.impactAnalysis.change.revenue)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500">Profit</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink-900">{formatCurrency(rec.impactAnalysis.before.profit)} → {formatCurrency(rec.impactAnalysis.after.profit)}</span>
                  {rec.impactAnalysis.change.profit !== null && (
                    <span className={`text-xs font-medium ${rec.impactAnalysis.change.profit > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {rec.impactAnalysis.change.profit > 0 ? '↑' : '↓'} {Math.abs(rec.impactAnalysis.change.profit)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-100">
        <div className="text-xs text-ink-400">
          {rec.createdDate && <span>Generated {rec.createdDate}</span>}
          {rec.relatedProduct && <span> · {rec.relatedProduct}</span>}
        </div>
        <div className="flex items-center gap-2">
          {rec.status === 'pending' && (
            <>
              <Button variant="secondary" size="sm" onClick={onDismiss}>Dismiss</Button>
              <Button variant="primary" size="sm" onClick={onApply}>Apply</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
