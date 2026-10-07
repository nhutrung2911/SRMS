import { useState, useEffect } from 'react';
import type { PageProps } from './types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import {
  User,
  Shield,
  KeyRound,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Layers,
} from 'lucide-react';
import api from '@/services/api';
import { getCurrentUser, getRoleDisplayName, updateStoredUser } from '@/lib/auth';

export function ProfilePage({ addToast }: PageProps) {
  const [tab, setTab] = useState('profile');
  const currentUser = getCurrentUser();

  // Profile Form state
  const [name, setName] = useState(currentUser?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.name) {
      setName(currentUser.name);
    }
  }, [currentUser?.name]);

  const roleName = getRoleDisplayName(currentUser?.role_id, currentUser?.role);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast?.({ type: 'warning', title: 'Validation', message: 'Name cannot be empty.' });
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api.put('/user/profile', { name: name.trim() });
      updateStoredUser({ name: name.trim() });
      addToast?.({ type: 'success', title: 'Profile Updated', message: res.data.message || 'Profile information updated successfully.' });
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Update Failed', message: err.response?.data?.message || 'Could not update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast?.({ type: 'warning', title: 'Validation', message: 'Please enter your current password.' });
      return;
    }
    if (newPassword.length < 6) {
      addToast?.({ type: 'warning', title: 'Validation', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast?.({ type: 'warning', title: 'Validation', message: 'New passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await api.put('/user/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });

      addToast?.({ type: 'success', title: 'Password Changed', message: res.data.message || 'Your password has been changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      addToast?.({ type: 'error', title: 'Error', message: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const getRoleBadgeVariant = (roleId?: number) => {
    switch (roleId) {
      case 1: return 'brand'; // Admin
      case 2: return 'info'; // Manager
      case 3: return 'success'; // Staff
      case 4: return 'warning'; // Director
      case 5: return 'neutral'; // Customer Service
      default: return 'neutral';
    }
  };

  const getRoleResponsibilities = (roleId?: number) => {
    switch (roleId) {
      case 1:
        return [
          'Full administrative system access & configuration',
          'Manage system users and access privileges',
          'Full CRUD permissions on catalog, inventory, orders, and promotions',
          'Access to system activity logs and audit trails',
        ];
      case 4:
        return [
          'Executive oversight: read-only access across all revenue and operations modules',
          'Dedicated access to Activity Logs for auditing manager and system actions',
          'Strictly prevented from performing modifying, creation, or deletion actions',
        ];
      case 2:
        return [
          'Manage inventory stock adjustments and view warehouse levels',
          'Create, update, and manage promotional campaigns',
          'Authorize order cancellation and refunds with automatic audit logging',
          'Review and apply automated AI recommendations',
        ];
      case 3:
        return [
          'Create orders and advance routine order status (Processing, Completed)',
          'Create and update customer profiles during transactions',
          'View inventory stock and active promotions at point of sale',
        ];
      case 5:
        return [
          'Specialized access to Customer Analytics and RFM segments',
          'View customer details and update customer contact information',
          'Restricted from financial revenue and inventory adjustments',
        ];
      default:
        return ['Standard staff operational access'];
    }
  };

  const inputClass = "w-full h-10 px-3.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-ink-700 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal credentials, account security, and view your system access permissions."
        breadcrumbs={[{ label: 'Account' }, { label: 'My Profile' }]}
      />

      {/* User Hero Banner */}
      <Card padding="lg" className="bg-gradient-to-r from-white via-white to-brand-50/40 border border-ink-200/60 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white text-2xl font-bold font-display shadow-md flex-shrink-0">
              {currentUser?.name
                ? currentUser.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-ink-900 font-display">{currentUser?.name || 'User'}</h2>
                <Badge variant={getRoleBadgeVariant(currentUser?.role_id)} size="md">
                  {roleName}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-500 mt-1.5">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-ink-400" />
                  {currentUser?.email || 'N/A'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-ink-400" />
                  Role ID: {currentUser?.role_id}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-ink-400" />
                  ID #{currentUser?.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <Card padding="md">
        <Tabs
          tabs={[
            { id: 'profile', label: 'Profile Information' },
            { id: 'security', label: 'Security & Password' },
            { id: 'permissions', label: 'Role & Permissions' },
          ]}
          activeTab={tab}
          onTabChange={setTab}
        />
      </Card>

      {/* Tab: Profile Information */}
      {tab === 'profile' && (
        <Card padding="lg" className="border border-ink-200/60 shadow-sm">
          <CardHeader
            title="Personal Details"
            subtitle="Update your display name and view account information"
          />
          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-xl">
            <div>
              <label className={labelClass}>Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={currentUser?.email || ''}
                  className="w-full h-10 px-3.5 rounded-lg border border-ink-200 bg-ink-50 text-sm text-ink-500 cursor-not-allowed"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-ink-400 mt-1">Email address is managed by workspace administrator.</p>
            </div>

            <div>
              <label className={labelClass}>System Role</label>
              <div className="p-3 rounded-lg bg-ink-50 border border-ink-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink-900">{roleName}</div>
                  <div className="text-xs text-ink-500">Internal role assigned to your account</div>
                </div>
                <Badge variant={getRoleBadgeVariant(currentUser?.role_id)} size="sm">
                  {roleName}
                </Badge>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Security & Password */}
      {tab === 'security' && (
        <Card padding="lg" className="border border-ink-200/60 shadow-sm">
          <CardHeader
            title="Change Password"
            subtitle="Ensure your account is using a secure, confidential password"
          />
          <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-xl">
            <div>
              <label className={labelClass}>Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>New Password *</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter minimum 6 characters"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={inputClass}
              />
            </div>

            <div className="p-3 rounded-lg bg-ink-50 border border-ink-100 text-xs text-ink-600 space-y-1">
              <div className="font-semibold text-ink-800">Password Requirements:</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 6 ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                Minimum of 6 characters
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${newPassword && newPassword === confirmPassword ? 'bg-emerald-500' : 'bg-ink-300'}`} />
                Passwords match
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" type="submit" disabled={updatingPassword}>
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab: Role & Permissions */}
      {tab === 'permissions' && (
        <Card padding="lg" className="border border-ink-200/60 shadow-sm">
          <CardHeader
            title="Authorized Scope & Role Privileges"
            subtitle={`Your account is assigned to the "${roleName}" security group.`}
          />
          <div className="space-y-4 max-w-2xl">
            <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100">
              <div className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                Key Role Scope:
              </div>
              <ul className="mt-2 space-y-2 text-xs text-brand-800">
                {getRoleResponsibilities(currentUser?.role_id).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-ink-500 bg-ink-50 p-3.5 rounded-lg border border-ink-100">
              For security reasons, privilege escalation or role re-assignment must be requested through your system administrator.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
