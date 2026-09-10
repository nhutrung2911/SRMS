<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ForecastController extends Controller
{
    /**
     * Revenue Forecast using Moving Average (SMA) + Standard Deviation
     */
    public function getForecast(Request $request)
    {
        $period = $request->query('period', 'next30'); // next7, next30, nextMonth
        $now = Carbon::now();

        // 1. Determine horizon days K
        if ($period === 'next7') {
            $kDays = 7;
        } elseif ($period === 'nextMonth') {
            $kDays = Carbon::now()->addMonth()->daysInMonth;
        } else {
            $kDays = 30; // default next30
        }

        // 2. Fetch last 30 historical daily records from revenue_daily
        $historyRows = DB::table('revenue_daily')
            ->orderBy('date', 'desc')
            ->take(30)
            ->get()
            ->reverse()
            ->values();

        $revenues = $historyRows->pluck('total_revenue')->map(function($v) {
            return (float) $v;
        })->toArray();

        $n = count($revenues);

        // Calculate Simple Moving Average (SMA)
        $sma = $n > 0 ? array_sum($revenues) / $n : 0;

        // Calculate Sample Standard Deviation (sigma) with N < 2 guard
        $stdDev = 0;
        if ($n >= 2) {
            $variance = array_reduce($revenues, function($carry, $val) use ($sma) {
                return $carry + pow($val - $sma, 2);
            }, 0) / ($n - 1);
            $stdDev = sqrt($variance);
        }

        // 90% Confidence Interval multiplier: Z_0.90 = 1.645
        $dailyLower = max(0, round($sma - 1.645 * $stdDev));
        $dailyUpper = round($sma + 1.645 * $stdDev);
        $dailyForecast = round($sma);

        $expected = round($kDays * $dailyForecast);
        $low = round($kDays * $dailyLower);
        $high = round($kDays * $dailyUpper);

        // Calculate trend (% change vs preceding period of K days) following DashboardController 2-period pattern
        $calcGrowth = function($current, $prev) {
            if ($prev > 0) return round((($current - $prev) / $prev) * 100, 1);
            return null;
        };

        // Fetch preceding period of K days (e.g. for next30: T-60 to T-31)
        $prevRows = DB::table('revenue_daily')
            ->orderBy('date', 'desc')
            ->skip($kDays)
            ->take($kDays)
            ->get();

        $trend = null;
        if ($prevRows->count() === $kDays) {
            $prevRevenuePeriod = (float) $prevRows->sum('total_revenue');
            $trend = $calcGrowth($expected, $prevRevenuePeriod);
        }

        // 3. Build chart data (20 actual points + K forecast points)
        $chartPoints = [];
        $actualSlice = $historyRows->slice(-20)->values();
        foreach ($actualSlice as $row) {
            $chartPoints[] = [
                'label' => Carbon::parse($row->date)->format('M d'),
                'actual' => (float) $row->total_revenue,
                'forecast' => null,
                'lower' => null,
                'upper' => null,
            ];
        }

        // Anchor forecast at last actual point
        $lastRowDate = $actualSlice->isNotEmpty() ? Carbon::parse($actualSlice->last()->date) : $now->copy();

        for ($i = 1; $i <= $kDays; $i++) {
            $futureDate = (clone $lastRowDate)->addDays($i);
            // Slight uncertainty expansion over time for realistic visual band
            $uncertaintyFactor = 1 + ($i / $kDays) * 0.15;
            $pointLower = max(0, round($sma - 1.645 * $stdDev * $uncertaintyFactor));
            $pointUpper = round($sma + 1.645 * $stdDev * $uncertaintyFactor);

            $chartPoints[] = [
                'label' => $futureDate->format('M d'),
                'actual' => null,
                'forecast' => $dailyForecast,
                'lower' => $pointLower,
                'upper' => $pointUpper,
            ];
        }

        return response()->json([
            'period' => $period,
            'summary' => [
                'expected' => $expected,
                'low' => $low,
                'high' => $high,
                'trend' => $trend,
            ],
            'data' => $chartPoints,
        ]);
    }

    /**
     * AI Insights generated from database state (Single Source of Truth)
     */
    public function getInsights(Request $request)
    {
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $insights = [];

        // 1. Inventory Risk: Re-use InventoryController logic (stock < reorder_level or daysRemaining <= 7)
        $soldPast30Days = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->where('orders.order_date', '>=', $thirtyDaysAgo)
            ->select('product_id', DB::raw('SUM(order_details.quantity) as sold'))
            ->groupBy('product_id');

        $atRiskProduct = DB::table('products')
            ->leftJoinSub($soldPast30Days, 's30', 'products.id', '=', 's30.product_id')
            ->select(
                'products.id', 'products.name', 'products.sku', 'products.stock_quantity', 'products.reorder_level',
                DB::raw('COALESCE(s30.sold, 0) as sold_30')
            )
            ->get()
            ->map(function($p) {
                $velocity = round($p->sold_30 / 30, 2);
                $daysRemaining = $velocity > 0 ? floor($p->stock_quantity / $velocity) : ($p->stock_quantity == 0 ? 0 : 999);
                $p->velocity = $velocity;
                $p->days_remaining = $daysRemaining;
                return $p;
            })
            ->filter(function($p) {
                return $p->stock_quantity < $p->reorder_level || $p->days_remaining <= 7;
            })
            ->sortBy('days_remaining')
            ->first();

        if ($atRiskProduct) {
            $insights[] = [
                'id' => 'INS-INV-01',
                'type' => 'inventory',
                'title' => "Inventory Risk: {$atRiskProduct->name}",
                'description' => "Product {$atRiskProduct->sku} is approaching low-stock level. Current stock of {$atRiskProduct->stock_quantity} units will last approximately {$atRiskProduct->days_remaining} days at current sales velocity.",
                'impact' => $atRiskProduct->stock_quantity == 0 ? 'high' : 'high',
                'action' => "Reorder approximately " . max(50, $atRiskProduct->reorder_level * 2) . " units to maintain availability during demand surge.",
                'relatedProduct' => (string) $atRiskProduct->id,
                'evidence' => [
                    "Current stock: {$atRiskProduct->stock_quantity} units (reorder level: {$atRiskProduct->reorder_level})",
                    "Sales velocity: {$atRiskProduct->velocity} units/day ({$atRiskProduct->sold_30} sold in last 30 days)",
                    "Estimated stockout: ~{$atRiskProduct->days_remaining} days at current rate"
                ]
            ];
        } else {
            // Find fastest moving item to monitor inventory coverage
            $fastest = DB::table('products')
                ->leftJoinSub($soldPast30Days, 's30', 'products.id', '=', 's30.product_id')
                ->select(
                    'products.id', 'products.name', 'products.sku', 'products.stock_quantity', 'products.reorder_level',
                    DB::raw('COALESCE(s30.sold, 0) as sold_30')
                )
                ->orderByDesc('sold_30')
                ->first();

            if ($fastest && $fastest->sold_30 > 0) {
                $velocity = round($fastest->sold_30 / 30, 2);
                $daysRemaining = $velocity > 0 ? floor($fastest->stock_quantity / $velocity) : 999;
                $insights[] = [
                    'id' => 'INS-INV-01',
                    'type' => 'inventory',
                    'title' => "Inventory Coverage: {$fastest->name}",
                    'description' => "Product {$fastest->sku} is your top seller ({$fastest->sold_30} units in 30 days). Current stock is {$fastest->stock_quantity} units, estimated to cover ~{$daysRemaining} days.",
                    'impact' => $daysRemaining <= 45 ? 'medium' : 'low',
                    'action' => "Ensure reorder pipeline is scheduled on time to sustain sales momentum without stockouts.",
                    'relatedProduct' => (string) $fastest->id,
                    'evidence' => [
                        "Current stock: {$fastest->stock_quantity} units (Healthily stocked)",
                        "Sales velocity: {$velocity} units/day (Leading velocity)",
                        "Estimated stock duration: ~{$daysRemaining} days"
                    ]
                ];
            }
        }

        // 2. Pricing Opportunity: Re-use AnalyticsController slow-moving logic
        $slowMovingProduct = DB::table('products')
            ->leftJoinSub($soldPast30Days, 's30', 'products.id', '=', 's30.product_id')
            ->select(
                'products.id', 'products.name', 'products.sku', 'products.cost_price', 'products.current_price', 'products.stock_quantity',
                DB::raw('COALESCE(s30.sold, 0) as sold_30')
            )
            ->get()
            ->map(function($p) {
                $velocity = round($p->sold_30 / 30, 2);
                $margin = $p->current_price > 0 ? round((($p->current_price - $p->cost_price) / $p->current_price) * 100, 1) : 0;
                $p->velocity = $velocity;
                $p->margin = $margin;
                return $p;
            })
            ->filter(function($p) {
                return $p->velocity <= 0.2 && $p->stock_quantity >= 50 && $p->margin >= 18;
            })
            ->sortByDesc('stock_quantity')
            ->first();

        if ($slowMovingProduct) {
            $insights[] = [
                'id' => 'INS-PRICE-01',
                'type' => 'pricing',
                'title' => "Pricing Opportunity: {$slowMovingProduct->name}",
                'description' => "Product {$slowMovingProduct->sku} has high inventory ({$slowMovingProduct->stock_quantity} units) and low sales velocity ({$slowMovingProduct->velocity}/day). Margin remains healthy at {$slowMovingProduct->margin}%.",
                'impact' => 'medium',
                'action' => "Consider a 5–8% price reduction or bundle promotion to stimulate demand and reduce inventory holding costs.",
                'relatedProduct' => (string) $slowMovingProduct->id,
                'evidence' => [
                    "Inventory: {$slowMovingProduct->stock_quantity} units in stock",
                    "Sales velocity: {$slowMovingProduct->velocity} units/day over 30 days",
                    "Current profit margin: {$slowMovingProduct->margin}% (healthy headroom)"
                ]
            ];
        }

        // 3. Customer At-Risk Insight: Re-use customer_segments Single Source of Truth
        $totalCustomers = DB::table('customers')->count();
        $atRiskData = DB::table('customer_segments')
            ->join('customers', 'customer_segments.customer_id', '=', 'customers.id')
            ->whereIn('customer_segments.segment_name', ['At Risk', 'Lost'])
            ->select(
                DB::raw('COUNT(customers.id) as count'),
                DB::raw('COALESCE(SUM(customers.total_spending), 0) as total_spent'),
                DB::raw('SUM(CASE WHEN customer_segments.is_vip = 1 THEN 1 ELSE 0 END) as vip_count')
            )
            ->first();

        $atRiskCount = (int) ($atRiskData->count ?? 0);
        $atRiskSpent = (float) ($atRiskData->total_spent ?? 0);
        $vipCount = (int) ($atRiskData->vip_count ?? 0);
        $pct = $totalCustomers > 0 ? round(($atRiskCount / $totalCustomers) * 100, 1) : 0;

        if ($atRiskCount > 0) {
            $spentFormatted = number_format($atRiskSpent, 0, ',', '.') . '₫';
            $insights[] = [
                'id' => 'INS-CUST-01',
                'type' => 'customer',
                'title' => "At-Risk Customer Segment Growing",
                'description' => "{$atRiskCount} customers ({$pct}% of total customer base) are in At-Risk or Lost segments, representing {$spentFormatted} in historical revenue.",
                'impact' => $pct >= 10 ? 'high' : 'medium',
                'action' => "Launch a targeted win-back campaign with personalized offers for high-value at-risk customers.",
                'evidence' => [
                    "At-risk segment: {$atRiskCount} customers ({$pct}% of total base)",
                    "Historical revenue at risk: {$spentFormatted}",
                    "{$vipCount} VIP/Loyal members in at-risk segment"
                ]
            ];
        }

        // 4. Promotion Insight: Re-use promotions data
        $promo = DB::table('promotions')
            ->where('status', 'Active')
            ->orderBy('id', 'desc')
            ->first();

        if ($promo) {
            $insights[] = [
                'id' => 'INS-PROMO-01',
                'type' => 'promotion',
                'title' => "Active Promotion Monitoring: {$promo->name}",
                'description' => "Campaign '{$promo->name}' is currently running with a {$promo->discount_value}" . ($promo->discount_type === 'PERCENT' ? '%' : '₫') . " discount. Ensure margin and inventory are balanced.",
                'impact' => 'medium',
                'action' => "Track daily sales volume and discount efficiency to ensure healthy ROI and avoid cannibalization.",
                'evidence' => [
                    "Campaign name: {$promo->name}",
                    "Discount level: {$promo->discount_value}" . ($promo->discount_type === 'PERCENT' ? '%' : '₫'),
                    "Duration: " . Carbon::parse($promo->start_date)->format('M d') . " – " . Carbon::parse($promo->end_date)->format('M d')
                ]
            ];
        }

        return response()->json($insights);
    }
}
