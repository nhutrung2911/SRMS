import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Check, X, Zap } from 'lucide-react';

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-ink-200'}`}
      style={{ height: 22, width: 40 }}
    >
      <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} style={{ width: 18, height: 18, transform: on ? 'translateX(20px)' : 'translateX(2px)' }} />
    </button>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState('general');
  const [notifs, setNotifs] = useState({
    lowStock: true, revenueSummary: true, aiRecs: true, weeklyReport: false, atRiskCustomers: true,
  });

  const inputClass = "w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-800 focus:outline-none focus:border-brand-500";
  const labelClass = "block text-xs font-medium text-ink-500 mb-1.5";

  const toggleNotif = (key: keyof typeof notifs) => setNotifs((p) => ({ ...p, [key]: !p[key] }));

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className={labelClass}>Company Name</label>
              <input defaultValue="Acme Commerce Co." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} defaultValue="VND">
                <option value="VND">Vietnamese Dong (₫)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Timezone</label>
              <select className={inputClass} defaultValue="ICT">
                <option value="ICT">Asia/Ho Chi Minh (ICT)</option>
                <option value="SGT">Asia/Singapore (SGT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Format</label>
              <select className={inputClass} defaultValue="YYYY-MM-DD">
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card padding="lg">
          <CardHeader title="Notification Preferences" subtitle="Choose what alerts you receive" />
          <div className="space-y-1 max-w-2xl">
            {[
              { key: 'lowStock' as const, label: 'Low Stock Alerts', desc: 'Get notified when products fall below reorder level' },
              { key: 'revenueSummary' as const, label: 'Daily Revenue Summary', desc: 'Receive a daily summary of revenue performance' },
              { key: 'aiRecs' as const, label: 'AI Recommendations', desc: 'Get notified when new recommendations are generated' },
              { key: 'weeklyReport' as const, label: 'Weekly Performance Report', desc: 'Receive a comprehensive weekly report every Monday' },
              { key: 'atRiskCustomers' as const, label: 'At-Risk Customer Alerts', desc: 'Get alerted when high-value customers become at-risk' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-ink-100 last:border-0">
                <div>
                  <div className="text-sm font-medium text-ink-900">{item.label}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{item.desc}</div>
                </div>
                <Toggle on={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Shopify', desc: 'E-commerce platform integration', connected: true, color: 'bg-success-50 text-success-600' },
            { name: 'WooCommerce', desc: 'WordPress e-commerce plugin', connected: false, color: 'bg-ink-100 text-ink-600' },
            { name: 'Shopee', desc: 'Southeast Asia marketplace', connected: true, color: 'bg-success-50 text-success-600' },
            { name: 'Lazada', desc: 'Southeast Asia marketplace', connected: false, color: 'bg-ink-100 text-ink-600' },
          ].map((int) => (
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
                {int.connected && <Badge variant="success" dot>Connected</Badge>}
              </div>
              <Button variant={int.connected ? 'secondary' : 'primary'} size="sm" className="w-full">
                {int.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </Card>
          ))}
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
                  <Badge variant="brand" dot>Active</Badge>
                </div>
                <div className="text-sm text-ink-500">₫2,500,000/month · Renews on Sep 11, 2024</div>
              </div>
              <Button variant="primary">Upgrade Plan</Button>
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
                    <span className="text-sm font-medium text-ink-900">{u.value}{u.unit ? u.unit : ''} / {u.max}{u.unit ? u.unit : ''}</span>
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
