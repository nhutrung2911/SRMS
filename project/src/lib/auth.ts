import type { PageId } from '@/types';

export type UserRole = 'admin' | 'director' | 'manager' | 'staff' | 'customer_service';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role?: UserRole;
  status?: string;
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user.role) {
      const map: Record<number, UserRole> = {
        1: 'admin',
        2: 'manager',
        3: 'staff',
        4: 'director',
        5: 'customer_service',
      };
      user.role = map[user.role_id] || 'staff';
    }
    return user;
  } catch {
    return null;
  }
}

export function getRoleDisplayName(roleId?: number, role?: string): string {
  switch (roleId) {
    case 1: return 'Admin';
    case 2: return 'Manager';
    case 3: return 'Staff';
    case 4: return 'Director';
    case 5: return 'Customer Service';
    default:
      if (role === 'admin') return 'Admin';
      if (role === 'director') return 'Director';
      if (role === 'manager') return 'Manager';
      if (role === 'staff') return 'Staff';
      if (role === 'customer_service') return 'Customer Service';
      return 'Staff';
  }
}

export function getDefaultPageForRole(roleId?: number): PageId {
  if (roleId === 5) return 'customers-analytics';
  if (roleId === 3) return 'orders';
  return 'dashboard';
}

export function isPageAccessible(roleId: number | undefined, page: PageId): boolean {
  if (!roleId) return false;
  if (roleId === 1) return true; // Admin has full access

  if (roleId === 4) {
    // Director: Read-only access to all modules, plus Activity Log. Forbidden: Users & System Settings, Product Edit.
    const forbidden: PageId[] = ['users', 'settings', 'product-edit'];
    return !forbidden.includes(page);
  }

  if (roleId === 2) {
    // Manager: Operational & Analytics modules
    const allowed: PageId[] = [
      'dashboard',
      'revenue-analytics',
      'forecast',
      'products-analytics',
      'product-detail',
      'orders',
      'order-detail',
      'customers-analytics',
      'customer-detail',
      'inventory',
      'promotions',
      'promotion-detail',
      'ai-recommendations',
      'ai-insight-detail',
      'products',
    ];
    return allowed.includes(page);
  }

  if (roleId === 3) {
    // Staff: Orders, Inventory, Promotions, Catalog products, Customer detail
    const allowed: PageId[] = [
      'orders',
      'order-detail',
      'inventory',
      'promotions',
      'promotion-detail',
      'products',
      'customer-detail',
    ];
    return allowed.includes(page);
  }

  if (roleId === 5) {
    // Customer Service: Only Customer Analytics and Customer Detail
    const allowed: PageId[] = ['customers-analytics', 'customer-detail'];
    return allowed.includes(page);
  }

  return false;
}
