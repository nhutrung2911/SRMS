import { useState, useEffect, useCallback } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Megaphone,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import api from '@/services/api';
import type { ActivityLog } from '@/types';

export function ActivityLogsPage({ navigate }: PageProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [subjectType, setSubjectType] = useState('all');
  const [actionSearch, setActionSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '15');
      if (subjectType !== 'all') params.append('subject_type', subjectType);
      if (actionSearch) params.append('action', actionSearch);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await api.get(`/activity-logs?${params.toString()}`);
      setLogs(res.data.data || []);
      setLastPage(res.data.last_page || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, subjectType, actionSearch, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSubjectClick = (type: string, id: number) => {
    if (type === 'order') {
      navigate('orders');
    } else if (type === 'promotion') {
      navigate('promotions');
    } else if (type === 'recommendation') {
      navigate('ai-recommendations');
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('refund')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <RotateCcw className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (action.includes('cancel') || action.includes('dismiss')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <XCircle className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    if (action.includes('apply') || action.includes('created')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <Sparkles className="w-3.5 h-3.5" />
        {action}
      </span>
    );
  };

  const getSubjectIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-brand-600" />;
      case 'promotion':
        return <Megaphone className="w-4 h-4 text-emerald-600" />;
      case 'recommendation':
        return <Sparkles className="w-4 h-4 text-indigo-600" />;
      default:
        return <History className="w-4 h-4 text-ink-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Log"
        subtitle="Centralized audit trail of managerial actions, state transitions, and system changes."
      />

      {/* Filter Toolbar */}
      <Card className="p-4 bg-white shadow-sm border border-ink-200/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Subject Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-ink-400" />
              <select
                value={subjectType}
                onChange={(e) => {
                  setSubjectType(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 focus:outline-none focus:border-brand-500"
              >
                <option value="all">All Modules</option>
                <option value="order">Orders</option>
                <option value="promotion">Promotions</option>
                <option value="recommendation">AI Recommendations</option>
              </select>
            </div>

            {/* Action Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search action or keyword..."
                value={actionSearch}
                onChange={(e) => {
                  setActionSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:border-brand-500 w-48 sm:w-64"
              />
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-400 hidden sm:block" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2.5 rounded-lg border border-ink-200 bg-white text-xs text-ink-800 focus:outline-none focus:border-brand-500"
                title="From Date"
              />
              <span className="text-xs text-ink-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-2.5 rounded-lg border border-ink-200 bg-white text-xs text-ink-800 focus:outline-none focus:border-brand-500"
                title="To Date"
              />
            </div>
          </div>

          <div className="text-xs text-ink-500 font-medium">
            Total: <span className="font-bold text-ink-800">{total}</span> records
          </div>
        </div>
      </Card>

      {/* Activity Logs Timeline / Table */}
      <Card className="bg-white shadow-sm border border-ink-200/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-ink-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mb-3" />
            <p className="text-sm">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldAlert className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-ink-800">No activity logs found</h3>
            <p className="text-xs text-ink-500 mt-1">Try adjusting the filter criteria or date range.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 hover:bg-ink-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-ink-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getSubjectIcon(log.subject_type)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getActionBadge(log.action)}
                      <span className="text-xs text-ink-400">·</span>
                      <span className="text-xs text-ink-500">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-ink-900 leading-snug">
                      {log.description}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(log.metadata).map(([k, v]) => (
                          <span
                            key={k}
                            className="inline-block px-2 py-0.5 rounded bg-ink-100 text-[11px] font-mono text-ink-600"
                          >
                            {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center flex-shrink-0">
                  {/* User info */}
                  <div className="text-right">
                    <div className="text-xs font-semibold text-ink-800 flex items-center gap-1 justify-end">
                      <User className="w-3 h-3 text-ink-400" />
                      {log.user_name || 'System User'}
                    </div>
                    <div className="text-[11px] text-ink-400 capitalize">
                      {log.user_role || 'Manager'}
                    </div>
                  </div>

                  {/* Subject link */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSubjectClick(log.subject_type, log.subject_id)}
                    className="flex items-center gap-1.5 text-xs text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200"
                  >
                    View
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && lastPage > 1 && (
          <div className="px-5 py-3 border-t border-ink-100 flex items-center justify-between">
            <span className="text-xs text-ink-500">
              Page {page} of {lastPage}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                className="flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
