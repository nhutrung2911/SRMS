import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Zap, Check, AlertCircle } from 'lucide-react';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-ink-200'}`}
      style={{ height: 22, width: 40 }}
    >
      <span
        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform`}
        style={{ width: 18, height: 18, transform: on ? 'translateX(20px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

interface StoredSettings {
  general: {
    companyName: string;
    currency: string;
    timezone: string;
    dateFormat: string;
  };
  notifications: {
    lowStock: boolean;
    revenueSummary: boolean;
    aiRecs: boolean;
    weeklyReport: boolean;
    atRiskCustomers: boolean;
  };
  integrations: Record<string, boolean>;
}

const DEFAULT_SETTINGS: StoredSettings = {
  general: {
    companyName: 'Acme Commerce Co.',
    currency: 'VND',
    timezone: 'ICT',
    dateFormat: 'YYYY-MM-DD',
  },
  notifications: {
    lowStock: true,
    revenueSummary: true,
    aiRecs: true,
    weeklyReport: false,
    atRiskCustomers: true,
  },
  integrations: {
    Shopify: true,
    WooCommerce: false,
    Shopee: true,
    Lazada: false,
  },
};

export function SettingsPage({ addToast }: Partial<PageProps>) {
  const [tab, setTab] = useState('general');

  // Load persisted settings
  const [settings, setSettings] = useState<StoredSettings>(() => {
    try {
      const saved = localStorage.getItem('srms_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          general: { ...DEFAULT_SETTINGS.general, ...parsed.general },
          notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
          integrations: { ...DEFAULT_SETTINGS.integrations, ...parsed.integrations },
        };
      }
    } catch {
      // ignore JSON parse error
    }
    return DEFAULT_SETTINGS;
  });

  // General tab form state
  const [generalForm, setGeneralForm] = useState(settings.general);
  const [savingGeneral, setSavingGeneral] = useState(false);

  useEffect(() => {
    setGeneralForm(settings.general);
  }, [settings.general]);

  const saveSettingsToStorage = (updated: StoredSettings) => {
    setSettings(updated);
    try {
      localStorage.setItem('srms_settings', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalForm.companyName.trim()) {
      addToast?.({ type: 'warning', title: 'Validation', message: 'Company name cannot be empty.' });
      return;
    }

    setSavingGeneral(true);
    setTimeout(() => {
      const updated = {
        ...settings,
        general: generalForm,
      };
      saveSettingsToStorage(updated);
      setSavingGeneral(false);
      addToast?.({
        type: 'success',
        title: 'Settings Saved',
        message: 'Workspace configuration has been saved successfully.',
      });
    }, 300);
  };

  const toggleNotif = (key: keyof StoredSettings['notifications'], label: string) => {
    const nextVal = !settings.notifications[key];
    const updated = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: nextVal,
      },
    };
    saveSettingsToStorage(updated);
    addToast?.({
      type: 'info',
      title: 'Preference Updated',
      message: `${label} is now ${nextVal ? 'enabled' : 'disabled'}.`,
    });
  };

  const toggleIntegration = (name: string) => {
    const isCurrentlyConnected = !!settings.integrations[name];
    const nextVal = !isCurrentlyConnected;
    const updated = {
      ...settings,
      integrations: {
        ...settings.integrations,
        [name]: nextVal,
      },
    };
    saveSettingsToStorage(updated);
    addToast?.({
      type: nextVal ? 'success' : 'warning',
      title: 'Integration Updated',
      message: `${name} has been ${nextVal ? 'connected successfully' : 'disconnected'}.`,
    });
  };

  const inputClass =
    'w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 focus:outline-none focus:border-brand-500 transition-colors';
  const labelClass = 'block text-xs font-medium text-ink-500 mb-1.5';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Configure your workspace, notifications, and integrations."
        breadcrumbs={[{ label: 'System' }, { label: 'Settings' }]}
      />

      <Card padding="md">
        <Tabs
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'integrations', label: 'Integrations' },
            { id: 'billing', label: 'Billing' },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      </Card>

      {tab === 'general' && (
        <Card padding="lg">
          <CardHeader title="General Settings" subtitle="Workspace configuration" />
          <form onSubmit={handleSaveGeneral}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  value={generalForm.companyName}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, companyName: e.target.value }))}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select
                  value={generalForm.currency}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, currency: e.target.value }))}
                  className={inputClass}
                >
                  <option value="VND">Vietnamese Dong (₫)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Timezone</label>
                <select
                  value={generalForm.timezone}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, timezone: e.target.value }))}
                  className={inputClass}
                >
                  <option value="ICT">Asia/Ho Chi Minh (ICT)</option>
                  <option value="SGT">Asia/Singapore (SGT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date Format</label>
                <select
                  value={generalForm.dateFormat}
                  onChange={(e) => setGeneralForm((p) => ({ ...p, dateFormat: e.target.value }))}
                  className={inputClass}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <Button type="submit" variant="primary" loading={savingGeneral}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card padding="lg">
          <CardHeader title="Notification Preferences" subtitle="Choose what alerts you receive" />
          <div className="space-y-1 max-w-2xl">
            {[
              {
                key: 'lowStock' as const,
                label: 'Low Stock Alerts',
                desc: 'Get notified when products fall below reorder level',
              },
              {
                key: 'revenueSummary' as const,
                label: 'Daily Revenue Summary',
                desc: 'Receive a daily summary of revenue performance',
              },
              {
                key: 'aiRecs' as const,
                label: 'AI Recommendations',
                desc: 'Get notified when new recommendations are generated',
              },
              {
                key: 'weeklyReport' as const,
                label: 'Weekly Performance Report',
                desc: 'Receive a comprehensive weekly report every Monday',
              },
              {
                key: 'atRiskCustomers' as const,
                label: 'At-Risk Customer Alerts',
                desc: 'Get alerted when high-value customers become at-risk',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-ink-900">{item.label}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{item.desc}</div>
                </div>
                <Toggle
                  on={settings.notifications[item.key]}
                  onChange={() => toggleNotif(item.key, item.label)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              name: 'Shopify',
              desc: 'E-commerce platform integration',
              color: 'bg-success-50 text-success-600',
            },
            {
              name: 'WooCommerce',
              desc: 'WordPress e-commerce plugin',
              color: 'bg-ink-100 text-ink-600',
            },
            {
              name: 'Shopee',
              desc: 'Southeast Asia marketplace',
              color: 'bg-success-50 text-success-600',
            },
            {
              name: 'Lazada',
              desc: 'Southeast Asia marketplace',
              color: 'bg-ink-100 text-ink-600',
            },
          ].map((int) => {
            const isConnected = !!settings.integrations[int.name];
            return (
              <Card key={int.name} padding="lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${int.color}`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink-900">{int.name}</div>
                      <div className="text-xs text-ink-400">{int.desc}</div>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge variant="success" dot>
                      Connected
                    </Badge>
                  )}
                </div>
                <Button
                  variant={isConnected ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleIntegration(int.name)}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'billing' && (
        <div className="space-y-6">
          <Card padding="lg">
            <CardHeader title="Current Plan" subtitle="Your subscription details" />
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-ink-900">Business Plan</span>
                  <Badge variant="brand" dot>
                    Active
                  </Badge>
                </div>
                <div className="text-sm text-ink-500">₫2,500,000/month · Renews on Nov 15, 2026</div>
              </div>
              <Button
                variant="primary"
                onClick={() =>
                  addToast?.({
                    type: 'info',
                    title: 'Subscription',
                    message:
                      'Plan management portal is currently under maintenance. Contact support for enterprise upgrades.',
                  })
                }
              >
                Upgrade Plan
              </Button>
            </div>
          </Card>

          <Card padding="lg">
            <CardHeader title="Usage" subtitle="Current billing cycle consumption" />
            <div className="space-y-4 max-w-2xl">
              {[
                { label: 'Products Tracked', value: 248, max: 500, color: 'bg-brand-600' },
                { label: 'Orders This Month', value: 2482, max: 5000, color: 'bg-success-600' },
                { label: 'AI Recommendations', value: 47, max: 100, color: 'bg-info-600' },
                { label: 'Storage Used', value: 3.2, max: 10, color: 'bg-warning-600', unit: 'GB' },
              ].map((u) => (
                <div key={u.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-ink-600">{u.label}</span>
                    <span className="text-sm font-medium text-ink-900">
                      {u.value}
                      {u.unit ? u.unit : ''} / {u.max}
                      {u.unit ? u.unit : ''}
                    </span>
                  </div>
                  <Progress value={u.value} max={u.max} color={u.color} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
