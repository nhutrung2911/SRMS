import type {
  Kpi,
  TrendPoint,
  CategoryRevenue,
  ChannelRevenue,
  ProductRow,
  CustomerRow,
  InventoryRow,
  PricingRow,
  PromotionRow,
  Recommendation,
  Insight,
  OrderRow,
  OrderDetail,
  ForecastPoint,
  UserRow,
} from './types';

export const formatCurrency = (v: number, compact = true): string => {
  if (compact) {
    if (v >= 1_000_000_000) return `₫${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `₫${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `₫${(v / 1_000).toFixed(0)}K`;
  }
  return `₫${v.toLocaleString('en-US')}`;
};

export const formatNumber = (v: number): string => v.toLocaleString('en-US');

// ─── Dashboard KPIs ──────────────────────────────────────────────
export const dashboardKpis: Kpi[] = [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '₫520.4M',
    rawValue: 520_400_000,
    change: 14.2,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [38, 42, 40, 45, 43, 48, 46, 52, 50, 55, 52, 58],
    format: 'currency',
  },
  {
    id: 'profit',
    label: 'Gross Profit',
    value: '₫118.7M',
    rawValue: 118_700_000,
    change: 9.8,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [22, 24, 23, 26, 25, 27, 26, 29, 28, 30, 29, 32],
    format: 'currency',
  },
  {
    id: 'margin',
    label: 'Profit Margin',
    value: '22.8%',
    rawValue: 22.8,
    change: 2.1,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [20, 20.5, 21, 20.8, 21.3, 21.5, 21.8, 22, 22.2, 22.5, 22.6, 22.8],
    format: 'percent',
  },
  {
    id: 'orders',
    label: 'Orders',
    value: '2,482',
    rawValue: 2482,
    change: 11.4,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [180, 195, 188, 210, 205, 225, 218, 240, 235, 255, 248, 265],
    format: 'number',
  },
  {
    id: 'aov',
    label: 'Avg. Order Value',
    value: '₫209K',
    rawValue: 209_600,
    change: 3.6,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [195, 198, 200, 197, 202, 205, 203, 207, 206, 209, 208, 210],
    format: 'currency',
  },
  {
    id: 'customers',
    label: 'New Customers',
    value: '384',
    rawValue: 384,
    change: 18.7,
    direction: 'up',
    sublabel: 'vs previous 30 days',
    spark: [22, 25, 28, 26, 30, 32, 29, 35, 33, 38, 36, 42],
    format: 'number',
  },
];

// ─── Revenue Trend (daily, 30 days) ─────────────────────────────
const generateTrendData = (): TrendPoint[] => {
  const days = 30;
  const data: TrendPoint[] = [];
  let baseRev = 14_000_000;
  let baseProfit = 3_200_000;
  let baseOrders = 75;
  for (let i = 0; i < days; i++) {
    const wave = Math.sin(i / 5) * 1_800_000;
    const trend = i * 120_000;
    const noise = (Math.random() - 0.5) * 2_500_000;
    const revenue = Math.round(baseRev + trend + wave + noise);
    const profit = Math.round(revenue * (0.22 + (Math.random() - 0.5) * 0.03));
    const orders = Math.round(baseOrders + i * 0.8 + (Math.random() - 0.5) * 12);
    data.push({
      label: `Day ${i + 1}`,
      revenue,
      profit,
      orders,
    });
    baseRev = 14_000_000;
    baseProfit = 3_200_000;
    baseOrders = 75;
  }
  return data;
};

export const revenueTrend30: TrendPoint[] = generateTrendData();

// Weekly trend
export const revenueTrendWeekly: TrendPoint[] = Array.from({ length: 12 }, (_, i) => {
  const rev = Math.round(85_000_000 + i * 4_500_000 + (Math.random() - 0.5) * 8_000_000);
  return {
    label: `W${i + 1}`,
    revenue: rev,
    profit: Math.round(rev * 0.23),
    orders: Math.round(380 + i * 12 + (Math.random() - 0.5) * 30),
  };
});

// Monthly trend
export const revenueTrendMonthly: TrendPoint[] = Array.from({ length: 12 }, (_, i) => {
  const rev = Math.round(340_000_000 + i * 18_000_000 + (Math.random() - 0.5) * 25_000_000);
  return {
    label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    revenue: rev,
    profit: Math.round(rev * (0.2 + i * 0.003)),
    orders: Math.round(1500 + i * 60 + (Math.random() - 0.5) * 100),
  };
});

// ─── Revenue by Category ────────────────────────────────────────
export const categoryRevenue: CategoryRevenue[] = [
  { category: 'Electronics', revenue: 180_000_000, share: 34.6, color: '#1E66F3' },
  { category: 'Fashion', revenue: 130_000_000, share: 25.0, color: '#10B981' },
  { category: 'Sports', revenue: 95_000_000, share: 18.3, color: '#F59E0B' },
  { category: 'Beauty', revenue: 65_000_000, share: 12.5, color: '#8B5CF6' },
  { category: 'Home', revenue: 35_000_000, share: 6.7, color: '#EC4899' },
  { category: 'Books', revenue: 15_400_000, share: 2.9, color: '#64748B' },
];

// ─── Revenue by Channel ────────────────────────────────────────
export const channelRevenue: ChannelRevenue[] = [
  { channel: 'Website', revenue: 215_000_000, share: 41.3, color: '#1E66F3' },
  { channel: 'Mobile App', revenue: 160_000_000, share: 30.7, color: '#10B981' },
  { channel: 'Marketplace', revenue: 95_000_000, share: 18.3, color: '#F59E0B' },
  { channel: 'In-Store', revenue: 50_400_000, share: 9.7, color: '#8B5CF6' },
];

// ─── Products ──────────────────────────────────────────────────
export const products: ProductRow[] = [
  {
    id: 'P001',
    name: 'Nike Air Max 2024',
    sku: 'NAM-2024',
    category: 'Sports',
    brand: 'Nike',
    revenue: 120_000_000,
    unitsSold: 350,
    profit: 28_000_000,
    margin: 23.3,
    stock: 125,
    reorderLevel: 30,
    cost: 1_600_000,
    price: 2_500_000,
    salesVelocity: 8,
    trend: 'up',
    trendData: [180, 210, 195, 240, 220, 260, 250, 290, 280, 310, 300, 350],
    performance: 'excellent',
    status: 'active',
  },
  {
    id: 'P002',
    name: 'Apple AirPods Pro 2',
    sku: 'APP-PRO2',
    category: 'Electronics',
    brand: 'Apple',
    revenue: 95_000_000,
    unitsSold: 280,
    profit: 22_000_000,
    margin: 23.2,
    stock: 85,
    reorderLevel: 40,
    cost: 4_200_000,
    price: 5_500_000,
    salesVelocity: 6.5,
    trend: 'up',
    trendData: [200, 210, 230, 220, 240, 250, 245, 260, 270, 265, 275, 280],
    performance: 'excellent',
    status: 'active',
  },
  {
    id: 'P003',
    name: 'Samsung Galaxy Watch 6',
    sku: 'SGW-6',
    category: 'Electronics',
    brand: 'Samsung',
    revenue: 72_000_000,
    unitsSold: 190,
    profit: 15_000_000,
    margin: 20.8,
    stock: 60,
    reorderLevel: 25,
    cost: 2_500_000,
    price: 3_200_000,
    salesVelocity: 4.2,
    trend: 'flat',
    trendData: [170, 175, 172, 180, 178, 185, 182, 188, 190, 186, 192, 190],
    performance: 'good',
    status: 'active',
  },
  {
    id: 'P004',
    name: 'Adidas Ultraboost 22',
    sku: 'AD-UB22',
    category: 'Sports',
    brand: 'Adidas',
    revenue: 58_000_000,
    unitsSold: 240,
    profit: 11_500_000,
    margin: 19.8,
    stock: 95,
    reorderLevel: 35,
    cost: 1_400_000,
    price: 1_800_000,
    salesVelocity: 5.1,
    trend: 'up',
    trendData: [180, 190, 200, 195, 210, 215, 220, 225, 230, 235, 238, 240],
    performance: 'good',
    status: 'active',
  },
  {
    id: 'P005',
    name: "Levi's 501 Original Jeans",
    sku: 'LV-501',
    category: 'Fashion',
    brand: "Levi's",
    revenue: 42_000_000,
    unitsSold: 320,
    profit: 9_200_000,
    margin: 21.9,
    stock: 210,
    reorderLevel: 50,
    cost: 850_000,
    price: 1_100_000,
    salesVelocity: 7.2,
    trend: 'up',
    trendData: [250, 260, 270, 280, 285, 290, 295, 300, 305, 310, 315, 320],
    performance: 'good',
    status: 'active',
  },
  {
    id: 'P102',
    name: 'Sony WH-1000XM5 Headphones',
    sku: 'SWH-XM5',
    category: 'Electronics',
    brand: 'Sony',
    revenue: 35_000_000,
    unitsSold: 85,
    profit: 6_300_000,
    margin: 18.0,
    stock: 180,
    reorderLevel: 30,
    cost: 3_200_000,
    price: 4_200_000,
    salesVelocity: 2.1,
    trend: 'down',
    trendData: [140, 135, 130, 120, 115, 110, 105, 100, 95, 92, 88, 85],
    performance: 'at-risk',
    status: 'active',
  },
  {
    id: 'P204',
    name: 'Dyson V15 Detect Vacuum',
    sku: 'DY-V15',
    category: 'Home',
    brand: 'Dyson',
    revenue: 28_000_000,
    unitsSold: 65,
    profit: 7_800_000,
    margin: 27.9,
    stock: 24,
    reorderLevel: 30,
    cost: 3_500_000,
    price: 4_800_000,
    salesVelocity: 8,
    trend: 'up',
    trendData: [30, 35, 38, 42, 45, 48, 52, 55, 58, 60, 62, 65],
    performance: 'excellent',
    status: 'active',
  },
  {
    id: 'P008',
    name: 'Estée Lauder Serum',
    sku: 'EL-SER',
    category: 'Beauty',
    brand: 'Estée Lauder',
    revenue: 25_000_000,
    unitsSold: 410,
    profit: 8_500_000,
    margin: 34.0,
    stock: 320,
    reorderLevel: 60,
    cost: 420_000,
    price: 650_000,
    salesVelocity: 9.2,
    trend: 'up',
    trendData: [280, 300, 320, 340, 350, 360, 370, 380, 390, 395, 400, 410],
    performance: 'excellent',
    status: 'active',
  },
  {
    id: 'P009',
    name: 'Zara Summer Dress',
    sku: 'ZR-SD24',
    category: 'Fashion',
    brand: 'Zara',
    revenue: 18_000_000,
    unitsSold: 260,
    profit: 3_600_000,
    margin: 20.0,
    stock: 45,
    reorderLevel: 40,
    cost: 520_000,
    price: 680_000,
    salesVelocity: 5.8,
    trend: 'down',
    trendData: [320, 310, 295, 285, 275, 270, 265, 262, 263, 260, 261, 260],
    performance: 'average',
    status: 'active',
  },
  {
    id: 'P010',
    name: 'Kindle Paperwhite 2024',
    sku: 'KP-2024',
    category: 'Electronics',
    brand: 'Amazon',
    revenue: 15_000_000,
    unitsSold: 120,
    profit: 2_800_000,
    margin: 18.7,
    stock: 15,
    reorderLevel: 20,
    cost: 2_200_000,
    price: 2_800_000,
    salesVelocity: 3.2,
    trend: 'down',
    trendData: [180, 170, 160, 155, 150, 145, 140, 135, 130, 128, 125, 120],
    performance: 'average',
    status: 'active',
  },
  {
    id: 'P011',
    name: 'Puma Runner Shoes',
    sku: 'PM-RN',
    category: 'Sports',
    brand: 'Puma',
    revenue: 12_000_000,
    unitsSold: 180,
    profit: 1_900_000,
    margin: 15.8,
    stock: 250,
    reorderLevel: 40,
    cost: 600_000,
    price: 950_000,
    salesVelocity: 1.8,
    trend: 'down',
    trendData: [240, 230, 225, 220, 215, 210, 205, 200, 195, 190, 185, 180],
    performance: 'at-risk',
    status: 'active',
  },
  {
    id: 'P012',
    name: 'MAC Lipstick Set',
    sku: 'MAC-LS',
    category: 'Beauty',
    brand: 'MAC',
    revenue: 8_500_000,
    unitsSold: 150,
    profit: 2_100_000,
    margin: 24.7,
    stock: 0,
    reorderLevel: 25,
    cost: 280_000,
    price: 450_000,
    salesVelocity: 3.5,
    trend: 'flat',
    trendData: [140, 145, 142, 148, 150, 152, 148, 150, 151, 149, 150, 150],
    performance: 'average',
    status: 'active',
  },
];

// ─── Product Analytics KPIs ─────────────────────────────────────
export const productAnalyticsKpis: Kpi[] = [
  { id: 'total', label: 'Total Products', value: '248', rawValue: 248, change: 5.2, direction: 'up', sublabel: '12 added this month', format: 'number' },
  { id: 'best', label: 'Best Sellers', value: '34', rawValue: 34, change: 8.1, direction: 'up', sublabel: 'Top 15% by revenue', format: 'number' },
  { id: 'slow', label: 'Slow Movers', value: '22', rawValue: 22, change: -3.4, direction: 'down', sublabel: 'Below velocity target', format: 'number' },
  { id: 'highMargin', label: 'High Margin Products', value: '56', rawValue: 56, change: 4.5, direction: 'up', sublabel: 'Margin > 25%', format: 'number' },
  { id: 'lowMargin', label: 'Low Margin Products', value: '18', rawValue: 18, change: -2.1, direction: 'down', sublabel: 'Margin < 15%', format: 'number' },
];

// ─── Customers ─────────────────────────────────────────────────
export const customers: CustomerRow[] = [
  { id: 'C001', name: 'Nguyen Thi Lan', email: 'lan.nguyen@email.com', segment: 'champion', orders: 48, totalSpent: 42_500_000, lastPurchase: '2 days ago', aov: 885_000, clv: 52_000_000, status: 'vip', location: 'Ho Chi Minh City', joinedDate: '2022-03-15' },
  { id: 'C002', name: 'Tran Van Minh', email: 'minh.tran@email.com', segment: 'loyal', orders: 32, totalSpent: 28_800_000, lastPurchase: '5 days ago', aov: 900_000, clv: 35_000_000, status: 'active', location: 'Hanoi', joinedDate: '2022-06-20' },
  { id: 'C003', name: 'Le Thi Hoa', email: 'hoa.le@email.com', segment: 'champion', orders: 55, totalSpent: 58_200_000, lastPurchase: '1 day ago', aov: 1_058_000, clv: 68_000_000, status: 'vip', location: 'Da Nang', joinedDate: '2021-11-08' },
  { id: 'C004', name: 'Pham Quoc Anh', email: 'anh.pham@email.com', segment: 'potential-loyalist', orders: 12, totalSpent: 8_400_000, lastPurchase: '8 days ago', aov: 700_000, clv: 12_000_000, status: 'active', location: 'Ho Chi Minh City', joinedDate: '2023-08-12' },
  { id: 'C005', name: 'Hoang Mai', email: 'mai.hoang@email.com', segment: 'at-risk', orders: 8, totalSpent: 5_200_000, lastPurchase: '45 days ago', aov: 650_000, clv: 6_500_000, status: 'at-risk', location: 'Can Tho', joinedDate: '2023-02-18' },
  { id: 'C006', name: 'Vu Thi Thuy', email: 'thuy.vu@email.com', segment: 'new', orders: 2, totalSpent: 1_800_000, lastPurchase: '3 days ago', aov: 900_000, clv: 1_800_000, status: 'active', location: 'Hai Phong', joinedDate: '2024-08-05' },
  { id: 'C007', name: 'Dang Van Son', email: 'son.dang@email.com', segment: 'loyal', orders: 28, totalSpent: 22_100_000, lastPurchase: '7 days ago', aov: 789_000, clv: 28_000_000, status: 'active', location: 'Hanoi', joinedDate: '2022-09-30' },
  { id: 'C008', name: 'Bui Thi Ngoc', email: 'ngoc.bui@email.com', segment: 'lost', orders: 3, totalSpent: 1_200_000, lastPurchase: '120 days ago', aov: 400_000, clv: 1_200_000, status: 'dormant', location: 'Nha Trang', joinedDate: '2023-01-22' },
  { id: 'C009', name: 'Do Van Hung', email: 'hung.do@email.com', segment: 'potential-loyalist', orders: 15, totalSpent: 11_500_000, lastPurchase: '12 days ago', aov: 767_000, clv: 15_000_000, status: 'active', location: 'Ho Chi Minh City', joinedDate: '2023-05-14' },
  { id: 'C010', name: 'Ngo Thi Kim', email: 'kim.ngo@email.com', segment: 'champion', orders: 62, totalSpent: 75_800_000, lastPurchase: '1 day ago', aov: 1_223_000, clv: 85_000_000, status: 'vip', location: 'Ho Chi Minh City', joinedDate: '2021-07-10' },
  { id: 'C011', name: 'Ly Quoc Bao', email: 'bao.ly@email.com', segment: 'at-risk', orders: 6, totalSpent: 3_900_000, lastPurchase: '52 days ago', aov: 650_000, clv: 4_500_000, status: 'at-risk', location: 'Hue', joinedDate: '2023-03-08' },
  { id: 'C012', name: 'Trinh Thi Van', email: 'van.trinh@email.com', segment: 'new', orders: 1, totalSpent: 1_200_000, lastPurchase: '1 day ago', aov: 1_200_000, clv: 1_200_000, status: 'active', location: 'Hanoi', joinedDate: '2024-08-09' },
];

export const customerSegmentation = [
  { segment: 'Champions', count: 28, share: 7.3, color: '#1E66F3', revenue: 185_000_000 },
  { segment: 'Loyal Customers', count: 65, share: 16.9, color: '#10B981', revenue: 142_000_000 },
  { segment: 'Potential Loyalists', count: 98, share: 25.5, color: '#F59E0B', revenue: 88_000_000 },
  { segment: 'New Customers', count: 120, share: 31.3, color: '#3B82F6', revenue: 35_000_000 },
  { segment: 'At Risk', count: 52, share: 13.5, color: '#EF4444', revenue: 42_000_000 },
  { segment: 'Lost', count: 22, share: 5.7, color: '#64748B', revenue: 8_500_000 },
];

export const customerKpis: Kpi[] = [
  { id: 'total', label: 'Total Customers', value: '385', rawValue: 385, change: 12.4, direction: 'up', sublabel: 'vs last month', format: 'number' },
  { id: 'new', label: 'New Customers', value: '120', rawValue: 120, change: 18.7, direction: 'up', sublabel: 'This month', format: 'number' },
  { id: 'returning', label: 'Returning', value: '243', rawValue: 243, change: 6.8, direction: 'up', sublabel: '63% return rate', format: 'number' },
  { id: 'vip', label: 'VIP Customers', value: '28', rawValue: 28, change: 4.2, direction: 'up', sublabel: 'Top spenders', format: 'number' },
  { id: 'atrisk', label: 'At-Risk Customers', value: '52', rawValue: 52, change: -8.3, direction: 'down', sublabel: 'Needs attention', format: 'number' },
];

// ─── Inventory ─────────────────────────────────────────────────
export const inventoryKpis: Kpi[] = [
  { id: 'totalValue', label: 'Total Inventory Value', value: '₫842M', rawValue: 842_000_000, change: 5.2, direction: 'up', sublabel: 'Across 248 SKUs', format: 'currency' },
  { id: 'lowStock', label: 'Low Stock', value: '14', rawValue: 14, change: 3, direction: 'up', sublabel: 'Below reorder level', format: 'number' },
  { id: 'outStock', label: 'Out of Stock', value: '3', rawValue: 3, change: -1, direction: 'down', sublabel: 'Needs immediate action', format: 'number' },
  { id: 'slowMoving', label: 'Slow Moving', value: '22', rawValue: 22, change: -3.4, direction: 'down', sublabel: 'Velocity < 2/day', format: 'number' },
  { id: 'deadStock', label: 'Dead Stock', value: '8', rawValue: 8, change: 1, direction: 'up', sublabel: 'No sales in 60 days', format: 'number' },
];

export const inventoryRows: InventoryRow[] = products.map((p) => {
  const daysRemaining = p.salesVelocity > 0 ? Math.floor(p.stock / p.salesVelocity) : 999;
  let risk: InventoryRow['risk'] = 'low';
  if (p.stock === 0) risk = 'critical';
  else if (daysRemaining <= 5) risk = 'high';
  else if (daysRemaining <= 14) risk = 'medium';
  let recommendation = 'Stock level healthy';
  if (risk === 'critical') recommendation = 'Reorder immediately — out of stock';
  else if (risk === 'high') recommendation = `Reorder now — ${daysRemaining} days left`;
  else if (risk === 'medium') recommendation = `Monitor closely — ${daysRemaining} days left`;
  return {
    productId: p.id,
    productName: p.name,
    sku: p.sku,
    category: p.category,
    currentStock: p.stock,
    reorderLevel: p.reorderLevel,
    salesVelocity: p.salesVelocity,
    daysRemaining,
    risk,
    recommendation,
  };
});

// ─── Pricing ───────────────────────────────────────────────────
export const pricingRows: PricingRow[] = products.map((p) => {
  const margin = ((p.price - p.cost) / p.price) * 100;
  // Generate recommendation based on velocity and inventory
  let recommendedPrice = p.price;
  let expectedImpact: PricingRow['expectedImpact'] = { volume: 'flat', revenue: 'flat', inventoryRisk: 'flat' };
  let reason = 'Price is well-calibrated for current demand.';

  if (p.salesVelocity < 3 && p.stock > p.reorderLevel * 3) {
    recommendedPrice = Math.round(p.price * 0.93);
    expectedImpact = { volume: 'up', revenue: 'up', inventoryRisk: 'down' };
    reason = `Sales velocity (${p.salesVelocity}/day) is below target while inventory (${p.stock} units) is ${Math.round((p.stock / p.reorderLevel - 1) * 100)}% above reorder level. A price reduction can stimulate demand and reduce holding costs.`;
  } else if (p.salesVelocity > 7 && p.stock < p.reorderLevel * 2) {
    recommendedPrice = Math.round(p.price * 1.05);
    expectedImpact = { volume: 'down', revenue: 'up', inventoryRisk: 'down' };
    reason = `High sales velocity (${p.salesVelocity}/day) with limited stock (${p.stock} units, ${Math.floor(p.stock / p.salesVelocity)} days remaining). A price increase can optimize margin before restocking.`;
  } else if (p.salesVelocity > 5 && margin > 25) {
    recommendedPrice = Math.round(p.price * 0.98);
    expectedImpact = { volume: 'up', revenue: 'up', inventoryRisk: 'flat' };
    reason = `Strong demand (${p.salesVelocity}/day) with healthy margin (${margin.toFixed(1)}%). A small reduction can capture additional market share without materially impacting profit.`;
  }
  return {
    productId: p.id,
    productName: p.name,
    category: p.category,
    currentPrice: p.price,
    cost: p.cost,
    margin: Math.round(margin * 10) / 10,
    salesVelocity: p.salesVelocity,
    inventory: p.stock,
    recommendedPrice,
    expectedImpact,
    reason,
  };
});

// ─── Promotions ────────────────────────────────────────────────
export const promotionKpis: Kpi[] = [
  { id: 'active', label: 'Active Promotions', value: '7', rawValue: 7, change: 2, direction: 'up', sublabel: 'Currently running', format: 'number' },
  { id: 'revFromPromo', label: 'Revenue from Promotions', value: '₫142M', rawValue: 142_000_000, change: 22.5, direction: 'up', sublabel: 'This month', format: 'currency' },
  { id: 'discountCost', label: 'Discount Cost', value: '₫18.5M', rawValue: 18_500_000, change: 8.2, direction: 'up', sublabel: 'Total given away', format: 'currency' },
  { id: 'roi', label: 'Promotion ROI', value: '287%', rawValue: 287, change: 15.3, direction: 'up', sublabel: 'Revenue / discount cost', format: 'percent' },
  { id: 'profitImpact', label: 'Profit Impact', value: '+₫12.3M', rawValue: 12_300_000, change: 9.1, direction: 'up', sublabel: 'Net profit uplift', format: 'currency' },
];

export const promotions: PromotionRow[] = [
  {
    id: 'PR001',
    campaign: 'Summer Electronics Sale',
    period: 'Jun 15 – Jul 15',
    startDate: '2024-06-15',
    endDate: '2024-07-15',
    products: ['P002', 'P003', 'P102'],
    orders: 580,
    revenue: 85_000_000,
    profit: 18_500_000,
    discountCost: 6_200_000,
    roi: 1371,
    status: 'active',
    beforeRevenue: 52_000_000,
    duringRevenue: 85_000_000,
    afterRevenue: 0,
  },
  {
    id: 'PR002',
    campaign: 'Fashion Flash Sale',
    period: 'Aug 01 – Aug 07',
    startDate: '2024-08-01',
    endDate: '2024-08-07',
    products: ['P005', 'P009'],
    orders: 420,
    revenue: 38_000_000,
    profit: 7_200_000,
    discountCost: 3_800_000,
    roi: 1000,
    status: 'active',
    beforeRevenue: 22_000_000,
    duringRevenue: 38_000_000,
    afterRevenue: 0,
  },
  {
    id: 'PR003',
    campaign: 'Beauty Bundle Deal',
    period: 'Jul 20 – Aug 20',
    startDate: '2024-07-20',
    endDate: '2024-08-20',
    products: ['P008', 'P012'],
    orders: 310,
    revenue: 19_000_000,
    profit: 6_100_000,
    discountCost: 1_500_000,
    roi: 1267,
    status: 'active',
    beforeRevenue: 14_000_000,
    duringRevenue: 19_000_000,
    afterRevenue: 0,
  },
  {
    id: 'PR004',
    campaign: 'Sports Mega Day',
    period: 'Jun 01 – Jun 03',
    startDate: '2024-06-01',
    endDate: '2024-06-03',
    products: ['P001', 'P004', 'P011'],
    orders: 680,
    revenue: 72_000_000,
    profit: 14_800_000,
    discountCost: 4_200_000,
    roi: 1714,
    status: 'ended',
    beforeRevenue: 45_000_000,
    duringRevenue: 72_000_000,
    afterRevenue: 51_000_000,
  },
  {
    id: 'PR005',
    campaign: 'Back to School',
    period: 'Aug 25 – Sep 10',
    startDate: '2024-08-25',
    endDate: '2024-09-10',
    products: ['P010', 'P003'],
    orders: 0,
    revenue: 0,
    profit: 0,
    discountCost: 0,
    roi: 0,
    status: 'scheduled',
    beforeRevenue: 15_000_000,
    duringRevenue: 0,
    afterRevenue: 0,
  },
  {
    id: 'PR006',
    campaign: 'Home Essentials Promo',
    period: 'May 15 – May 30',
    startDate: '2024-05-15',
    endDate: '2024-05-30',
    products: ['P204'],
    orders: 180,
    revenue: 22_000_000,
    profit: 5_200_000,
    discountCost: 1_800_000,
    roi: 1222,
    status: 'ended',
    beforeRevenue: 16_000_000,
    duringRevenue: 22_000_000,
    afterRevenue: 14_000_000,
  },
];

// ─── AI Insights (Dashboard) ───────────────────────────────────
export const dashboardInsights: Insight[] = [
  {
    id: 'INS001',
    type: 'inventory',
    title: 'Inventory Risk: Dyson V15 Detect',
    description: 'Product P204 is approaching low-stock level. Sales increased 35% over 14 days. Current stock of 24 units will last approximately 3 days at current velocity.',
    impact: 'high',
    action: 'Reorder approximately 50 units to maintain availability during demand surge.',
    relatedProduct: 'P204',
    evidence: ['Sales velocity: 8 units/day (+35% vs prior period)', 'Current stock: 24 units (below reorder level of 30)', 'Estimated stockout: 3 days at current rate'],
  },
  {
    id: 'INS002',
    type: 'pricing',
    title: 'Pricing Opportunity: Sony WH-1000XM5',
    description: 'Product P102 has high inventory (180 units) and low sales velocity (2.1/day). Inventory has increased 28% while sales velocity decreased 18%. Margin remains above target at 23.8%.',
    impact: 'medium',
    action: 'Consider a 5–8% price reduction to stimulate demand and reduce inventory holding costs.',
    relatedProduct: 'P102',
    evidence: ['Inventory: 180 units (+28% vs prior period)', 'Sales velocity: 2.1/day (−18% vs prior period)', 'Current margin: 23.8% (above 18% target)'],
  },
  {
    id: 'INS003',
    type: 'customer',
    title: 'At-Risk Customer Segment Growing',
    description: '52 customers (13.5% of base) have not purchased in 45+ days. This represents ₫42M in at-risk revenue. 18 of these were previously Champions or Loyal customers.',
    impact: 'high',
    action: 'Launch a targeted win-back campaign with personalized offers for high-value at-risk customers.',
    evidence: ['At-risk segment: 52 customers (+8.3% vs last month)', 'At-risk revenue: ₫42M', '18 former Champions/Loyal in at-risk segment'],
  },
  {
    id: 'INS004',
    type: 'promotion',
    title: 'Promotion ROI Alert: Fashion Flash Sale',
    description: 'The Fashion Flash Sale generated ₫38M in revenue but profit margin dropped to 18.9% (vs 22.8% average). Discount cost was ₫3.8M, producing ROI of 1000% but cannibalizing regular sales.',
    impact: 'medium',
    action: 'Review discount depth for future fashion promotions. Consider bundle deals instead of flat discounts.',
    evidence: ['Revenue: ₫38M (+72% vs baseline)', 'Profit margin: 18.9% (−3.9pp vs average)', 'Discount cost: ₫3.8M'],
  },
];

// ─── Recommendations ───────────────────────────────────────────
export const recommendations: Recommendation[] = [
  {
    id: 'REC001',
    type: 'pricing',
    title: 'Reduce price of Sony WH-1000XM5 by 7%',
    reason: 'Inventory has increased 28% while sales velocity decreased 18%. Margin remains above target.',
    evidence: [
      'Inventory: 180 units (+28% vs prior 30 days)',
      'Sales velocity: 2.1/day (−18% vs prior 30 days)',
      'Current margin: 23.8% (above 18% target)',
      'Competitor avg. price: ₫3,950,000 (5.9% lower)',
    ],
    expectedImpact: [
      'Reduce inventory holding cost by ~₫2.1M/month',
      'Increase sales velocity by estimated 20–30%',
      'Maintain margin above 18% target',
    ],
    priority: 'high',
    status: 'pending',
    createdDate: '2024-08-09',
    relatedProduct: 'P102',
    confidence: 87,
    impact: 'high',
    action: 'Apply 7% price reduction',
  },
  {
    id: 'REC002',
    type: 'inventory',
    title: 'Reorder Dyson V15 Detect — 50 units',
    reason: 'Stock at 24 units, below reorder level of 30. Sales velocity surged 35% in 14 days.',
    evidence: [
      'Current stock: 24 units (below reorder level)',
      'Sales velocity: 8/day (+35% in 14 days)',
      'Estimated stockout: 3 days',
      'Supplier lead time: 5 business days',
    ],
    expectedImpact: [
      'Prevent stockout and lost revenue (~₫4.8M/day)',
      'Maintain availability during demand surge',
      'Avoid customer churn from OOS',
    ],
    priority: 'high',
    status: 'pending',
    createdDate: '2024-08-10',
    relatedProduct: 'P204',
    confidence: 94,
    impact: 'high',
    action: 'Create purchase order',
  },
  {
    id: 'REC003',
    type: 'customer',
    title: 'Launch win-back campaign for 52 at-risk customers',
    reason: '13.5% of customer base has not purchased in 45+ days. 18 were previously high-value customers.',
    evidence: [
      'At-risk segment: 52 customers (+8.3% vs last month)',
      'At-risk revenue: ₫42M',
      '18 former Champions/Loyal in segment',
      'Avg. last purchase: 52 days ago',
    ],
    expectedImpact: [
      'Recover estimated ₫15–20M in revenue',
      'Re-engage 20–30% of at-risk customers',
      'Reduce churn rate by 4–6%',
    ],
    priority: 'high',
    status: 'pending',
    createdDate: '2024-08-08',
    confidence: 82,
    impact: 'high',
    action: 'Create win-back campaign',
  },
  {
    id: 'REC004',
    type: 'promotion',
    title: 'Optimize Fashion Flash Sale discount depth',
    reason: 'Current promotion has ROI of 1000% but profit margin dropped 3.9pp below average.',
    evidence: [
      'Revenue: ₫38M (+72% vs baseline)',
      'Profit margin: 18.9% (−3.9pp vs 22.8% avg)',
      'Discount cost: ₫3.8M',
      'Cannibalization rate: ~15% of regular sales',
    ],
    expectedImpact: [
      'Improve profit margin by 2–3pp',
      'Maintain 80%+ of promotion revenue',
      'Reduce cannibalization by ~40%',
    ],
    priority: 'medium',
    status: 'pending',
    createdDate: '2024-08-07',
    confidence: 78,
    impact: 'medium',
    action: 'Review promotion settings',
  },
  {
    id: 'REC005',
    type: 'pricing',
    title: 'Increase price of Nike Air Max 2024 by 5%',
    reason: 'High sales velocity (8/day) with limited stock (125 units, 15 days remaining). Margin healthy at 23.3%.',
    evidence: [
      'Sales velocity: 8/day (+35% in 14 days)',
      'Stock: 125 units (~15 days remaining)',
      'Current margin: 23.3% (above target)',
      'Demand exceeds supply by ~20%',
    ],
    expectedImpact: [
      'Increase revenue per unit by ₫125,000',
      'Optimize margin before restocking',
      'Moderate demand to match supply',
    ],
    priority: 'medium',
    status: 'pending',
    createdDate: '2024-08-09',
    relatedProduct: 'P001',
    confidence: 81,
    impact: 'medium',
    action: 'Review price change',
  },
  {
    id: 'REC006',
    type: 'inventory',
    title: 'Clear dead stock: 8 SKUs with no sales in 60 days',
    reason: '8 products have had zero sales in 60+ days, tying up ₫12.5M in inventory capital.',
    evidence: [
      'Dead stock SKUs: 8',
      'Tied-up capital: ₫12.5M',
      'Avg. days without sale: 72 days',
      'Storage cost: ~₫1.2M/month',
    ],
    expectedImpact: [
      'Free up ₫12.5M in working capital',
      'Reduce storage costs by ₫1.2M/month',
      'Simplify inventory management',
    ],
    priority: 'low',
    status: 'pending',
    createdDate: '2024-08-05',
    confidence: 76,
    impact: 'low',
    action: 'Create clearance plan',
  },
  {
    id: 'REC007',
    type: 'customer',
    title: 'Upsell to 98 Potential Loyalists',
    reason: '98 customers show consistent purchase behavior but have not reached Loyal status. High conversion potential.',
    evidence: [
      'Segment size: 98 customers (25.5% of base)',
      'Avg. orders: 12 (vs 20+ for Loyal)',
      'Avg. spend: ₫11.5M (growing 8%/month)',
      'Repeat purchase rate: 65%',
    ],
    expectedImpact: [
      'Increase CLV by estimated ₫8–12M per converted customer',
      'Grow Loyal segment by 30–40%',
      'Boost monthly revenue by ₫15–22M',
    ],
    priority: 'medium',
    status: 'applied',
    createdDate: '2024-08-01',
    confidence: 84,
    impact: 'medium',
    action: 'Create upsell campaign',
  },
];

// ─── Forecast ──────────────────────────────────────────────────
export const forecastData: ForecastPoint[] = (() => {
  const data: ForecastPoint[] = [];
  // 20 historical points + 30 forecast
  for (let i = 0; i < 20; i++) {
    const rev = 15_000_000 + i * 200_000 + Math.sin(i / 4) * 1_500_000 + (Math.random() - 0.5) * 1_500_000;
    data.push({
      label: `D${i + 1}`,
      actual: Math.round(rev),
      forecast: null,
      lower: null,
      upper: null,
    });
  }
  // Last actual connects to forecast
  const lastActual = data[data.length - 1].actual!;
  for (let i = 0; i < 30; i++) {
    const base = lastActual + i * 250_000;
    const forecast = Math.round(base + Math.sin(i / 5) * 800_000);
    const spread = 2_000_000 + i * 80_000;
    data.push({
      label: `F${i + 1}`,
      actual: null,
      forecast,
      lower: forecast - spread,
      upper: forecast + spread,
    });
  }
  return data;
})();

export const forecastSummary = {
  next7Days: { low: 42_000_000, expected: 46_500_000, high: 51_000_000, trend: 6.2 },
  next30Days: { low: 185_000_000, expected: 195_000_000, high: 205_000_000, trend: 8.4 },
  nextMonth: { low: 580_000_000, expected: 610_000_000, high: 640_000_000, trend: 7.1 },
};

// ─── Orders ────────────────────────────────────────────────────
export const orders: OrderRow[] = [
  { id: 'ORD-7841', customer: 'Nguyen Thi Lan', customerId: 'C001', date: '2024-08-10', items: 3, total: 2_450_000, payment: 'card', status: 'completed' },
  { id: 'ORD-7842', customer: 'Tran Van Minh', customerId: 'C002', date: '2024-08-10', items: 1, total: 5_500_000, payment: 'card', status: 'completed' },
  { id: 'ORD-7843', customer: 'Le Thi Hoa', customerId: 'C003', date: '2024-08-10', items: 5, total: 8_900_000, payment: 'wallet', status: 'processing' },
  { id: 'ORD-7844', customer: 'Pham Quoc Anh', customerId: 'C004', date: '2024-08-09', items: 2, total: 1_300_000, payment: 'cod', status: 'pending' },
  { id: 'ORD-7845', customer: 'Hoang Mai', customerId: 'C005', date: '2024-08-09', items: 1, total: 680_000, payment: 'bank', status: 'completed' },
  { id: 'ORD-7846', customer: 'Vu Thi Thuy', customerId: 'C006', date: '2024-08-08', items: 2, total: 1_800_000, payment: 'card', status: 'completed' },
  { id: 'ORD-7847', customer: 'Dang Van Son', customerId: 'C007', date: '2024-08-08', items: 4, total: 3_200_000, payment: 'wallet', status: 'completed' },
  { id: 'ORD-7848', customer: 'Bui Thi Ngoc', customerId: 'C008', date: '2024-08-07', items: 1, total: 450_000, payment: 'cod', status: 'cancelled' },
  { id: 'ORD-7849', customer: 'Do Van Hung', customerId: 'C009', date: '2024-08-07', items: 3, total: 2_100_000, payment: 'card', status: 'completed' },
  { id: 'ORD-7850', customer: 'Ngo Thi Kim', customerId: 'C010', date: '2024-08-10', items: 6, total: 7_800_000, payment: 'card', status: 'completed' },
  { id: 'ORD-7851', customer: 'Ly Quoc Bao', customerId: 'C011', date: '2024-08-06', items: 1, total: 950_000, payment: 'bank', status: 'refunded' },
  { id: 'ORD-7852', customer: 'Trinh Thi Van', customerId: 'C012', date: '2024-08-09', items: 1, total: 1_200_000, payment: 'card', status: 'processing' },
];

export const getOrderDetail = (id: string): OrderDetail => {
  return {
    id,
    customer: 'Nguyen Thi Lan',
    customerId: 'C001',
    date: '2024-08-10',
    items: [
      { productId: 'P001', productName: 'Nike Air Max 2024', qty: 1, price: 2_500_000, subtotal: 2_500_000 },
      { productId: 'P008', productName: 'Estée Lauder Serum', qty: 1, price: 650_000, subtotal: 650_000 },
      { productId: 'P005', productName: "Levi's 501 Original Jeans", qty: 1, price: 1_100_000, subtotal: 1_100_000 },
    ],
    subtotal: 4_250_000,
    discount: 425_000,
    total: 3_825_000,
    payment: 'card',
    status: 'completed',
    timeline: [
      { label: 'Order Placed', time: 'Aug 10, 09:15', done: true },
      { label: 'Payment Confirmed', time: 'Aug 10, 09:16', done: true },
      { label: 'Packed', time: 'Aug 10, 11:30', done: true },
      { label: 'Shipped', time: 'Aug 10, 14:00', done: true },
      { label: 'Delivered', time: 'Aug 11, 10:20', done: true },
    ],
  };
};

// ─── Users ─────────────────────────────────────────────────────
export const users: UserRow[] = [
  { id: 'U001', name: 'Nguyen Van Khoa', email: 'khoa.nguyen@company.com', role: 'admin', status: 'active', lastActive: '2 min ago' },
  { id: 'U002', name: 'Tran Thi Bich', email: 'bich.tran@company.com', role: 'manager', status: 'active', lastActive: '15 min ago' },
  { id: 'U003', name: 'Le Hoang Nam', email: 'nam.le@company.com', role: 'analyst', status: 'active', lastActive: '1 hour ago' },
  { id: 'U004', name: 'Pham Thi Dung', email: 'dung.pham@company.com', role: 'analyst', status: 'active', lastActive: '3 hours ago' },
  { id: 'U005', name: 'Vu Minh Tuan', email: 'tuan.vu@company.com', role: 'viewer', status: 'invited', lastActive: 'Never' },
  { id: 'U006', name: 'Dang Thi Lan', email: 'lan.dang@company.com', role: 'viewer', status: 'active', lastActive: '1 day ago' },
  { id: 'U007', name: 'Bui Quoc Khanh', email: 'khanh.bui@company.com', role: 'manager', status: 'suspended', lastActive: '5 days ago' },
];

// ─── Revenue Analytics KPIs ────────────────────────────────────
export const revenueAnalyticsKpis: Kpi[] = [
  { id: 'revenue', label: 'Total Revenue', value: '₫520.4M', rawValue: 520_400_000, change: 14.2, direction: 'up', sublabel: 'vs previous period', format: 'currency' },
  { id: 'profit', label: 'Gross Profit', value: '₫118.7M', rawValue: 118_700_000, change: 9.8, direction: 'up', sublabel: 'vs previous period', format: 'currency' },
  { id: 'margin', label: 'Profit Margin', value: '22.8%', rawValue: 22.8, change: 2.1, direction: 'up', sublabel: 'vs previous period', format: 'percent' },
  { id: 'orders', label: 'Orders', value: '2,482', rawValue: 2482, change: 11.4, direction: 'up', sublabel: 'vs previous period', format: 'number' },
  { id: 'growth', label: 'Revenue Growth', value: '+14.2%', rawValue: 14.2, change: 3.5, direction: 'up', sublabel: 'MoM acceleration', format: 'percent' },
];

// Revenue by customer segment
export const revenueByCustomerSegment = [
  { segment: 'Champions', revenue: 185_000_000, share: 35.5, color: '#1E66F3' },
  { segment: 'Loyal', revenue: 142_000_000, share: 27.3, color: '#10B981' },
  { segment: 'Potential Loyalists', revenue: 88_000_000, share: 16.9, color: '#F59E0B' },
  { segment: 'New', revenue: 35_000_000, share: 6.7, color: '#3B82F6' },
  { segment: 'At Risk', revenue: 42_000_000, share: 8.1, color: '#EF4444' },
  { segment: 'Lost', revenue: 28_400_000, share: 5.5, color: '#64748B' },
];

// Revenue by product (top 8)
export const revenueByProduct = products
  .slice()
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 8)
  .map((p) => ({ product: p.name, revenue: p.revenue, color: '#1E66F3' }));
