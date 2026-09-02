export type PageId =
  | 'dashboard'
  | 'revenue-analytics'
  | 'forecast'
  | 'products-analytics'
  | 'product-detail'
  | 'orders'
  | 'order-detail'
  | 'customers-analytics'
  | 'customer-detail'
  | 'inventory'
  | 'pricing'
  | 'promotions'
  | 'promotion-detail'
  | 'ai-recommendations'
  | 'ai-insight-detail'
  | 'products'
  | 'product-edit'
  | 'users'
  | 'settings'
  | 'login';

export type TrendDirection = 'up' | 'down' | 'flat';

export type PerformanceBadge = 'excellent' | 'good' | 'average' | 'at-risk';

export type RiskLevel = 'high' | 'medium' | 'low' | 'critical';

export type InsightType = 'inventory' | 'pricing' | 'promotion' | 'customer' | 'revenue';

export type Priority = 'high' | 'medium' | 'low';

export type RecStatus = 'pending' | 'applied' | 'dismissed';

export type OrderStatus = 'completed' | 'processing' | 'pending' | 'cancelled' | 'refunded';
export type PaymentMethod = 'card' | 'cod' | 'bank' | 'wallet';

export type CustomerSegment =
  | 'champion'
  | 'loyal'
  | 'potential-loyalist'
  | 'new'
  | 'at-risk'
  | 'lost';

export type CustomerStatus = 'active' | 'dormant' | 'vip' | 'at-risk';

export interface Kpi {
  id: string;
  label: string;
  value: string;
  rawValue: number;
  change: number;
  direction: TrendDirection;
  sublabel?: string;
  spark?: number[];
  format?: 'currency' | 'percent' | 'number';
}

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

export interface CategoryRevenue {
  category: string;
  revenue: number;
  share: number;
  color: string;
}

export interface ChannelRevenue {
  channel: string;
  revenue: number;
  share: number;
  color: string;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  revenue: number;
  unitsSold: number;
  profit: number;
  margin: number;
  stock: number;
  reorderLevel: number;
  cost: number;
  price: number;
  salesVelocity: number;
  trend: TrendDirection;
  trendData: number[];
  performance: PerformanceBadge;
  status: 'active' | 'draft' | 'archived';
  image?: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  segment: CustomerSegment;
  orders: number;
  totalSpent: number;
  lastPurchase: string;
  aov: number;
  clv: number;
  status: CustomerStatus;
  location: string;
  joinedDate: string;
}

export interface InventoryRow {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderLevel: number;
  salesVelocity: number;
  daysRemaining: number;
  risk: RiskLevel;
  recommendation: string;
}

export interface PricingRow {
  productId: string;
  productName: string;
  category: string;
  currentPrice: number;
  cost: number;
  margin: number;
  salesVelocity: number;
  inventory: number;
  recommendedPrice: number;
  expectedImpact: {
    volume: TrendDirection;
    revenue: TrendDirection;
    inventoryRisk: TrendDirection;
  };
  reason: string;
}

export interface PromotionRow {
  id: string;
  campaign: string;
  period: string;
  startDate: string;
  endDate: string;
  products: string[];
  orders: number;
  revenue: number;
  profit: number;
  discountCost: number;
  roi: number;
  status: 'active' | 'scheduled' | 'ended' | 'draft';
  beforeRevenue: number;
  duringRevenue: number;
  afterRevenue: number;
}

export interface Recommendation {
  id: string;
  type: InsightType;
  title: string;
  reason: string;
  evidence: string[];
  expectedImpact: string[];
  priority: Priority;
  status: RecStatus;
  createdDate: string;
  relatedProduct?: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: string;
  relatedProduct?: string;
  evidence?: string[];
}

export interface OrderRow {
  id: string;
  customer: string;
  customerId: string;
  date: string;
  items: number;
  total: number;
  payment: PaymentMethod;
  status: OrderStatus;
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  subtotal: number;
}

export interface OrderDetail {
  id: string;
  customer: string;
  customerId: string;
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment: PaymentMethod;
  status: OrderStatus;
  timeline: { label: string; time: string; done: boolean }[];
}

export interface ForecastPoint {
  label: string;
  actual: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
  avatar?: string;
}

export interface BreadcrumbItem {
  label: string;
  page?: PageId;
  params?: Record<string, string>;
}
