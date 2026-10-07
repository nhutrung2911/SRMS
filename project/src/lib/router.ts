import type { PageId } from '@/types';

export interface RouteState {
  page: PageId;
  params: Record<string, string>;
}

const VALID_PAGES: Set<PageId> = new Set([
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
  'pricing',
  'promotions',
  'promotion-detail',
  'ai-recommendations',
  'ai-insight-detail',
  'products',
  'product-edit',
  'users',
  'settings',
  'profile',
  'activity-logs',
  'login',
]);

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: 'Dashboard',
  'revenue-analytics': 'Revenue Analytics',
  forecast: 'Revenue Forecast',
  'products-analytics': 'Product Analytics',
  'product-detail': 'Product Details',
  orders: 'Orders Management',
  'order-detail': 'Order Details',
  'customers-analytics': 'Customer Analytics',
  'customer-detail': 'Customer Details',
  inventory: 'Inventory Management',
  pricing: 'Pricing Strategy',
  promotions: 'Promotions',
  'promotion-detail': 'Promotion Details',
  'ai-recommendations': 'AI Recommendations',
  'ai-insight-detail': 'AI Insights',
  products: 'Product Catalog',
  'product-edit': 'Product Editor',
  users: 'User Management',
  settings: 'Account Settings',
  profile: 'My Profile',
  'activity-logs': 'Activity Log',
  login: 'Sign In',
};

/**
 * Returns a human-friendly document title for a given PageId.
 */
export function getPageTitle(page: PageId): string {
  const title = PAGE_TITLES[page] || 'Smart Revenue Management';
  return `SRMS — ${title}`;
}

/**
 * Parses the current hash or provided string into a valid PageId and parameters dictionary.
 */
export function parseRoute(hashOrUrl?: string): RouteState | null {
  const raw = hashOrUrl !== undefined ? hashOrUrl : (typeof window !== 'undefined' ? window.location.hash : '');
  
  // Clean hash prefix: remove leading '#', '#!', or '/'
  let pathWithQuery = raw.replace(/^#[!/]?/, '').trim();
  if (!pathWithQuery) {
    return null;
  }

  // Separate path from query string
  const [pathname, queryString] = pathWithQuery.split('?');
  const path = pathname.replace(/^\/+|\/+$/g, ''); // strip leading/trailing slashes

  // Parse query string parameters
  const params: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  // Handle path-based routing aliases (e.g., /orders/123 -> order-detail with orderId=123)
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 2) {
    const [section, id] = segments;
    if (section === 'orders' || section === 'order') {
      return { page: 'order-detail', params: { ...params, orderId: id } };
    }
    if (section === 'products' || section === 'product') {
      return { page: 'product-detail', params: { ...params, productId: id } };
    }
    if (section === 'customers' || section === 'customer') {
      return { page: 'customer-detail', params: { ...params, customerId: id } };
    }
    if (section === 'promotions' || section === 'promotion') {
      return { page: 'promotion-detail', params: { ...params, promotionId: id } };
    }
  }

  // Exact page match
  const candidate = (segments[0] || path) as PageId;
  if (VALID_PAGES.has(candidate)) {
    return { page: candidate, params };
  }

  return null;
}

/**
 * Serializes a page and parameters into a canonical hash route string.
 */
export function buildRoute(page: PageId, params: Record<string, string> = {}): string {
  // Use pretty path-based URLs for detail pages if id is present
  if (page === 'order-detail' && params.orderId) {
    const { orderId, ...rest } = params;
    const query = new URLSearchParams(rest).toString();
    return `#/orders/${encodeURIComponent(orderId)}${query ? `?${query}` : ''}`;
  }
  if (page === 'product-detail' && params.productId) {
    const { productId, ...rest } = params;
    const query = new URLSearchParams(rest).toString();
    return `#/products/${encodeURIComponent(productId)}${query ? `?${query}` : ''}`;
  }
  if (page === 'customer-detail' && params.customerId) {
    const { customerId, ...rest } = params;
    const query = new URLSearchParams(rest).toString();
    return `#/customers/${encodeURIComponent(customerId)}${query ? `?${query}` : ''}`;
  }
  if (page === 'promotion-detail' && params.promotionId) {
    const { promotionId, ...rest } = params;
    const query = new URLSearchParams(rest).toString();
    return `#/promotions/${encodeURIComponent(promotionId)}${query ? `?${query}` : ''}`;
  }

  const query = new URLSearchParams(params).toString();
  return `#/${page}${query ? `?${query}` : ''}`;
}

/**
 * Synchronizes browser URL history and document title.
 */
export function updateBrowserUrl(
  page: PageId,
  params: Record<string, string> = {},
  replace: boolean = false
): void {
  if (typeof window === 'undefined') return;

  const targetHash = buildRoute(page, params);

  // If current hash matches target, avoid pushing redundant history states
  if (window.location.hash !== targetHash) {
    if (replace) {
      window.history.replaceState(null, '', targetHash);
    } else {
      window.history.pushState(null, '', targetHash);
    }
  }

  document.title = getPageTitle(page);
}
