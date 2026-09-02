import { useState } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { users } from '@/data';
import type { UserRow } from '@/types';
import { UserPlus, ChevronDown, Users, CheckCircle2, Shield, Mail } from 'lucide-react';

const roleVariant: Record<UserRow['role'], 'brand' | 'info' | 'neutral'> = {
  admin: 'brand', manager: 'info', analyst: 'neutral', viewer: 'neutral',
};
const statusVariant: Record<UserRow['status'], 'success' | 'warning' | 'danger'> = {
  active: 'success', invited: 'warning', suspended: 'danger',
};

export function UsersPage({ addToast }: PageProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const stats = [
    { icon: Users, label: 'Total Users', value: users.length, color: 'text-brand-600 bg-brand-50' },
    { icon: CheckCircle2, label: 'Active', value: users.filter((u) => u.status === 'active').length, color: 'text-success-600 bg-success-50' },
    { icon: Shield, label: 'Admins', value: users.filter((u) => u.role === 'admin').length, color: 'text-info-600 bg-info-50' },
    { icon: Mail, label: 'Pending Invites', value: users.filter((u) => u.status === 'invited').length, color: 'text-warning-600 bg-warning-50' },
  ];

  const sendInvite = () => {
    setInviteOpen(false);
    setInviteEmail('');
    addToast?.({ type: 'success', title: 'Invitation sent', message: `Invitation sent to ${inviteEmail || 'the user'}.` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Users"
        subtitle="Manage team members and their access levels."
        breadcrumbs={[{ label: 'System' }, { label: 'Users' }]}
        actions={<Button variant="primary" size="md" icon={<UserPlus className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>Invite User</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} padding="md" hover>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-ink-900">{s.value}</div>
            <div className="text-xs text-ink-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card padding="md">
        <DataTable<UserRow>
          columns={[
            { key: 'name', label: 'User', render: (u) => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div className="font-medium text-ink-900">{u.name}</div>
                  <div className="text-xs text-ink-400">{u.email}</div>
                </div>
              </div>
            )},
            { key: 'role', label: 'Role', align: 'center', render: (u) => (
              <div className="relative inline-block">
                <select
                  value={u.role}
                  onChange={() => {}}
                  className="appearance-none h-7 pl-2 pr-6 rounded-md border border-ink-200 bg-white text-xs font-medium text-ink-700 cursor-pointer capitalize"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="analyst">Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-400 pointer-events-none" />
              </div>
            )},
            { key: 'status', label: 'Status', align: 'center', render: (u) => (
              <Badge variant={statusVariant[u.status]} dot>{u.status}</Badge>
            )},
            { key: 'lastActive', label: 'Last Active', align: 'right' },
          ]}
          data={users}
          rowKey={(u) => u.id}
        />
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={sendInvite}>Send Invitation</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1.5">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500 capitalize"
            >
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
