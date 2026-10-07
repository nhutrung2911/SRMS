import { useState, useCallback, useEffect } from 'react';
import type { PageId, BreadcrumbItem } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { ToastContainer, type Toast } from '@/components/ui/Toast';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { parseRoute, updateBrowserUrl, getPageTitle, type RouteState } from '@/lib/router';

import { DashboardPage } from '@/pages/DashboardPage';
import { RevenueAnalyticsPage } from '@/pages/RevenueAnalyticsPage';
import { ForecastPage } from '@/pages/ForecastPage';
import { ProductAnalyticsPage } from '@/pages/ProductAnalyticsPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { CustomerDetailPage } from '@/pages/CustomerDetailPage';
import { InventoryPage } from '@/pages/InventoryPage';

import { PromotionsPage } from '@/pages/PromotionsPage';
import { PromotionDetailPage } from '@/pages/PromotionDetailPage';
import { AIRecommendationsPage } from '@/pages/AIRecommendationsPage';
import { AIInsightDetailPage } from '@/pages/AIInsightDetailPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { ProductEditPage } from '@/pages/ProductEditPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ActivityLogsPage } from '@/pages/ActivityLogsPage';
import { LoginPage } from '@/pages/LoginPage';
import { getCurrentUser, getDefaultPageForRole, isPageAccessible } from '@/lib/auth';

function resolveInitialRoute(): RouteState {
  const token = localStorage.getItem('token');
  const u = getCurrentUser();
  const parsed = parseRoute();

  if (!token) {
    return { page: 'login', params: {} };
  }

  if (parsed) {
    if (parsed.page === 'login') {
      return { page: getDefaultPageForRole(u?.role_id), params: {} };
    }
    if (isPageAccessible(u?.role_id, parsed.page)) {
      return parsed;
    }
  }

  return { page: getDefaultPageForRole(u?.role_id), params: {} };
}

function App() {
  const [route, setRoute] = useState<RouteState>(resolveInitialRoute);
  const page = route.page;
  const params = route.params;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const navigate = useCallback((newPage: PageId, newParams: Record<string, string> = {}, replace: boolean = false) => {
    if (newPage === 'login') {
      setRoute({ page: 'login', params: {} });
      updateBrowserUrl('login', {}, replace);
      return;
    }

    const u = getCurrentUser();
    let targetPage = newPage;
    let targetParams = newParams;

    if (u && !isPageAccessible(u.role_id, newPage)) {
      targetPage = getDefaultPageForRole(u.role_id);
      targetParams = {};
    }

    setRoute({ page: targetPage, params: targetParams });
    updateBrowserUrl(targetPage, targetParams, replace);
    window.scrollTo({ top: 0 });
  }, []);

  // Listen to browser Back/Forward (popstate) and Hash change events
  useEffect(() => {
    updateBrowserUrl(route.page, route.params, true);

    const onLocationChange = () => {
      const token = localStorage.getItem('token');
      const u = getCurrentUser();
      const parsed = parseRoute();

      if (!token) {
        setRoute((prev) => {
          if (prev.page !== 'login') {
            updateBrowserUrl('login', {}, true);
            return { page: 'login', params: {} };
          }
          return prev;
        });
        return;
      }

      if (!parsed || parsed.page === 'login') {
        const defaultPage = getDefaultPageForRole(u?.role_id);
        setRoute({ page: defaultPage, params: {} });
        updateBrowserUrl(defaultPage, {}, true);
        return;
      }

      if (isPageAccessible(u?.role_id, parsed.page)) {
        setRoute(parsed);
        document.title = getPageTitle(parsed.page);
      } else {
        const defaultPage = getDefaultPageForRole(u?.role_id);
        setRoute({ page: defaultPage, params: {} });
        updateBrowserUrl(defaultPage, {}, true);
      }
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);

    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Login page is standalone
  if (page === 'login') {
    return (
      <>
        <LoginPage onSuccess={() => {
          const u = getCurrentUser();
          navigate(getDefaultPageForRole(u?.role_id), {}, true);
        }} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Build breadcrumb based on current page
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    switch (page) {
      case 'dashboard':
        return [{ label: 'Overview' }, { label: 'Dashboard' }];
      case 'revenue-analytics':
        return [{ label: 'Revenue' }, { label: 'Revenue Analytics' }];
      case 'forecast':
        return [{ label: 'Revenue' }, { label: 'Forecast' }];
      case 'products-analytics':
        return [{ label: 'Commerce' }, { label: 'Product Analytics' }];
      case 'product-detail':
        return [{ label: 'Commerce', page: 'products-analytics' }, { label: 'Product Analytics', page: 'products-analytics' }, { label: params.productId ?? 'Product' }];
      case 'orders':
        return [{ label: 'Commerce' }, { label: 'Orders' }];
      case 'order-detail':
        return [{ label: 'Commerce', page: 'orders' }, { label: 'Orders', page: 'orders' }, { label: params.orderId ?? 'Order' }];
      case 'customers-analytics':
        return [{ label: 'Commerce' }, { label: 'Customer Analytics' }];
      case 'customer-detail':
        return [{ label: 'Commerce', page: 'customers-analytics' }, { label: 'Customer Analytics', page: 'customers-analytics' }, { label: params.customerId ?? 'Customer' }];
      case 'inventory':
        return [{ label: 'Operations' }, { label: 'Inventory' }];

      case 'promotions':
        return [{ label: 'Operations' }, { label: 'Promotions' }];
      case 'promotion-detail':
        return [{ label: 'Operations', page: 'promotions' }, { label: 'Promotions', page: 'promotions' }, { label: params.promotionId ?? 'Promotion' }];
      case 'ai-recommendations':
        return [{ label: 'Intelligence' }, { label: 'Recommendations' }];
      case 'ai-insight-detail':
        return [{ label: 'Intelligence' }, { label: 'AI Insights' }];
      case 'products':
        return [{ label: 'Commerce' }, { label: 'Products' }];
      case 'product-edit':
        return [{ label: 'Commerce', page: 'products' }, { label: 'Products', page: 'products' }, { label: params.productId ? 'Edit Product' : 'Add Product' }];
      case 'users':
        return [{ label: 'System' }, { label: 'Users' }];
      case 'settings':
        return [{ label: 'System' }, { label: 'Settings' }];
      case 'profile':
        return [{ label: 'Account' }, { label: 'My Profile' }];
      case 'activity-logs':
        return [{ label: 'System' }, { label: 'Activity Log' }];
      default:
        return [{ label: 'SRMS' }];
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage navigate={navigate} addToast={addToast} />;
      case 'revenue-analytics': return <RevenueAnalyticsPage navigate={navigate} addToast={addToast} />;
      case 'forecast': return <ForecastPage navigate={navigate} addToast={addToast} />;
      case 'products-analytics': return <ProductAnalyticsPage navigate={navigate} addToast={addToast} />;
      case 'product-detail': return <ProductEditPage navigate={navigate} productId={params.productId} />;
      case 'orders': return <OrdersPage navigate={navigate} />;
      case 'order-detail': return <OrdersPage navigate={navigate} initialOrderId={params.orderId} />;
      case 'customers-analytics': return <CustomersPage navigate={navigate} addToast={addToast} />;
      case 'customer-detail': return <CustomerDetailPage navigate={navigate} customerId={params.customerId ?? '1'} addToast={addToast} />;
      case 'inventory': return <InventoryPage navigate={navigate} addToast={addToast} />;

      case 'promotions': return <PromotionsPage navigate={navigate} addToast={addToast} />;
      case 'promotion-detail': return <PromotionDetailPage navigate={navigate} promotionId={params.promotionId ?? '21'} addToast={addToast} />;
      case 'ai-recommendations': return <AIRecommendationsPage navigate={navigate} addToast={addToast} />;
      case 'ai-insight-detail': return <AIInsightDetailPage navigate={navigate} addToast={addToast} />;
      case 'products': return <ProductsPage navigate={navigate} addToast={addToast} />;
      case 'product-edit': return <ProductEditPage navigate={navigate} productId={params.productId} />;
      case 'activity-logs': return <ActivityLogsPage navigate={navigate} />;
      case 'users': return <UsersPage navigate={navigate} addToast={addToast} />;
      case 'settings': return <SettingsPage navigate={navigate} addToast={addToast} />;
      case 'profile': return <ProfilePage navigate={navigate} addToast={addToast} />;
      default: return <DashboardPage navigate={navigate} addToast={addToast} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        currentPage={page}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          onOpenMobileSidebar={() => setMobileOpen(true)}
          breadcrumb={<Breadcrumb items={getBreadcrumbs()} onNavigate={navigate} />}
          onNavigate={navigate}
        />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
