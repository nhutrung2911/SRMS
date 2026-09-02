import { useState } from 'react';
import type { PageId } from '@/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Package,
  ShoppingCart,
  Users,
  Boxes,
  Tags,
  Megaphone,
  Sparkles,
  Lightbulb,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Revenue',
    items: [
      { id: 'revenue-analytics', label: 'Revenue Analytics', icon: BarChart3 },
      { id: 'forecast', label: 'Forecast', icon: LineChart },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { id: 'products-analytics', label: 'Product Analytics', icon: Package },
      { id: 'orders', label: 'Orders', icon: ShoppingCart },
      { id: 'customers-analytics', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Boxes },
      { id: 'promotions', label: 'Promotions', icon: Megaphone },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { id: 'ai-recommendations', label: 'AI Recommendations', icon: Lightbulb },
      { id: 'ai-insight-detail', label: 'AI Insights', icon: Sparkles },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'users', label: 'Users', icon: UserCog },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-ink-900/40 z-40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen bg-white border-r border-ink-200/60 flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-ink-200/60 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <div className="text-sm font-bold text-ink-900 font-display tracking-tight">SRMS</div>
              <div className="text-[10px] text-ink-400 truncate">Revenue Management</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold text-ink-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPage === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onCloseMobile();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                        collapsed && 'justify-center',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-600 rounded-r-full" />}
                      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {collapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-ink-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-pop">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-ink-200/60 p-2 flex-shrink-0 hidden lg:block">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> <span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}
