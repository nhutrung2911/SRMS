import { useState } from 'react';
import { Search, Bell, Menu, ChevronDown, HelpCircle, LogOut, User, Settings } from 'lucide-react';

interface TopNavProps {
  onOpenMobileSidebar: () => void;
  breadcrumb?: React.ReactNode;
}

export function TopNav({ onOpenMobileSidebar, breadcrumb }: TopNavProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-ink-200/60 h-16 flex items-center px-4 lg:px-6 gap-3">
      {/* Mobile menu */}
      <button
        onClick={onOpenMobileSidebar}
        className="lg:hidden p-2 -ml-1 rounded-lg text-ink-600 hover:bg-ink-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <div className="flex-1 min-w-0 hidden md:block">
        {breadcrumb}
      </div>

      {/* Search */}
      <div className="relative flex-1 md:flex-initial md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-ink-100 border border-transparent text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:bg-white focus:border-ink-300 transition-colors"
        />
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-2 rounded-lg text-ink-600 hover:bg-ink-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
        </button>
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-pop border border-ink-200 z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">Notifications</span>
                <span className="text-xs text-brand-600 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {[
                  { title: 'Low stock alert: Dyson V15', time: '5 min ago', color: 'bg-warning-500' },
                  { title: 'New recommendation available', time: '1 hour ago', color: 'bg-brand-500' },
                  { title: 'Revenue goal reached for July', time: '3 hours ago', color: 'bg-success-500' },
                  { title: 'At-risk customer segment growing', time: '1 day ago', color: 'bg-danger-500' },
                ].map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50 cursor-pointer border-b border-ink-50">
                    <span className={`w-2 h-2 rounded-full ${n.color} mt-1.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink-800">{n.title}</div>
                      <div className="text-xs text-ink-400 mt-0.5">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Help */}
      <button className="p-2 rounded-lg text-ink-600 hover:bg-ink-100 transition-colors hidden sm:block">
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* User */}
      <div className="relative">
        <button
          onClick={() => setUserOpen(!userOpen)}
          className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-ink-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {(() => {
              const u = localStorage.getItem('user');
              const name = u ? JSON.parse(u).name : 'Nguyễn Như Trung';
              const parts = name.split(' ');
              return parts.length > 1 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
            })()}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium text-ink-900 leading-tight">
              {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : 'Nguyễn Như Trung'}
            </div>
            <div className="text-xs text-ink-400 leading-tight">Admin</div>
          </div>
          <ChevronDown className="w-4 h-4 text-ink-400 hidden md:block" />
        </button>
        {userOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-pop border border-ink-200 z-50 overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-ink-100">
                <div className="text-sm font-medium text-ink-900">
                  {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).name : 'Nguyễn Như Trung'}
                </div>
                <div className="text-xs text-ink-400">
                  {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : 'admin@srms.com'}
                </div>
              </div>
              <div className="py-1">
                {[
                  { icon: User, label: 'My Profile' },
                  { icon: Settings, label: 'Account Settings' },
                ].map((item) => (
                  <button key={item.label} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 transition-colors">
                    <item.icon className="w-4 h-4 text-ink-400" />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="border-t border-ink-100 py-1">
                <button 
                  onClick={async () => {
                    try {
                      await fetch('/api/logout', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('token')}`,
                          'Accept': 'application/json'
                        }
                      });
                    } catch (e) { console.error(e); }
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
