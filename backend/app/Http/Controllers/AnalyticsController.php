<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    /**
     * Check if user is Admin (1) or Manager (2)
     */
    private function isAdminOrManager(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && in_array($role->name, ['admin', 'manager']);
    }

    public function getProductAnalytics(Request $request)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can view analytics.'], 403);
        }

        // 1. Revenue by Category
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        
        $revenueByCategory = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->join('products', 'order_details.product_id', '=', 'products.id')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.status', 'Completed')
            ->select('categories.name as category', DB::raw('SUM(order_details.total) as revenue'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        // 2. Inventory Health (Fast / Slow moving based on 30 days sales velocity)
        $salesVelocity = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->where('orders.order_date', '>=', $thirtyDaysAgo)
            ->select('product_id', DB::raw('SUM(order_details.quantity) as velocity'))
            ->groupBy('product_id');

        $inventoryQuery = DB::table('products')
            ->leftJoinSub($salesVelocity, 'sv', function($join) {
                $join->on('products.id', '=', 'sv.product_id');
            })
            ->select(
                'products.id', 
                'products.name', 
                'products.stock_quantity', 
                DB::raw('COALESCE(sv.velocity, 0) as sales_velocity')
            );
            
        $fastMoving = (clone $inventoryQuery)
            ->orderByDesc('sales_velocity')
            ->take(5)
            ->get();
            
        $slowMoving = (clone $inventoryQuery)
            ->orderBy('sales_velocity', 'asc')
            ->orderBy('stock_quantity', 'desc')
            ->take(5)
            ->get();

        // 3. Promotion ROI
        $completedOrderDetails = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->select('order_details.promotion_id', 'order_details.order_id', 'order_details.total', 'order_details.profit');

        $promotions = DB::table('promotions')
            ->leftJoinSub($completedOrderDetails, 'cod', function($join) {
                $join->on('promotions.id', '=', 'cod.promotion_id');
            })
            ->select(
                'promotions.id',
                'promotions.name',
                'promotions.discount_value',
                'promotions.discount_type',
                'promotions.status',
                DB::raw('COUNT(DISTINCT cod.order_id) as total_orders'),
                DB::raw('SUM(cod.total) as revenue'),
                DB::raw('SUM(cod.profit) as profit')
            )
            ->groupBy('promotions.id', 'promotions.name', 'promotions.discount_value', 'promotions.discount_type', 'promotions.status')
            ->orderBy('promotions.id', 'desc')
            ->get()
            ->map(function($promo) {
                // Ensure nulls are converted to 0
                $promo->revenue = (float) $promo->revenue;
                $promo->profit = (float) $promo->profit;
                $promo->total_orders = (int) $promo->total_orders;
                
                $revenue = $promo->revenue;
                $profit = $promo->profit;
                $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;
                
                $roiStatus = 'Failed';
                if ($profit >= 0) {
                    if ($margin >= 10) {
                        $roiStatus = 'Success';
                    } else {
                        $roiStatus = 'Weak';
                    }
                }
                
                if ($revenue == 0 && $profit == 0) {
                    $roiStatus = 'No Data';
                }

                $promo->margin = round($margin, 2);
                $promo->roi_status = $roiStatus;
                return $promo;
            });

        return response()->json([
            'revenue_by_category' => $revenueByCategory,
            'fast_moving' => $fastMoving,
            'slow_moving' => $slowMoving,
            'promotion_roi' => $promotions
        ]);
    }

    public function getCustomerAnalytics(Request $request)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can view analytics.'], 403);
        }

        $thirtyDaysAgo = Carbon::now()->subDays(30);

        // 1. KPIs
        $totalCustomers = DB::table('customers')->count();

        // New Customers: MIN(order_date) >= 30 days ago
        $firstOrderDates = DB::table('orders')
            ->select('customer_id', DB::raw('MIN(order_date) as first_order_date'))
            ->groupBy('customer_id');

        $newCustomersCount = DB::table('customers')
            ->joinSub($firstOrderDates, 'fod', 'customers.id', '=', 'fod.customer_id')
            ->where('fod.first_order_date', '>=', $thirtyDaysAgo)
            ->count();

        $returningCount = DB::table('customers')->where('total_orders', '>', 1)->count();
        
        $vipCount = DB::table('customer_segments')
            ->where('is_vip', true)
            ->count();

        $atRiskCount = DB::table('customer_segments')
            ->whereIn('segment_name', ['At Risk', 'Lost'])
            ->count();

        $kpis = [
            'total' => $totalCustomers,
            'new' => $newCustomersCount,
            'returning' => $returningCount,
            'vip' => $vipCount,
            'at_risk' => $atRiskCount
        ];

        // 2. Segmentation
        $segmentation = DB::table('customer_segments')
            ->join('customers', 'customer_segments.customer_id', '=', 'customers.id')
            ->select('segment_name as segment', DB::raw('COUNT(customers.id) as count'), DB::raw('SUM(customers.total_spending) as revenue'))
            ->groupBy('segment_name')
            ->get();
            
        // Calculate shares
        $totalSegmentedCustomers = $segmentation->sum('count');
        $segmentation = $segmentation->map(function($s) use ($totalSegmentedCustomers) {
            $s->share = $totalSegmentedCustomers > 0 ? round(($s->count / $totalSegmentedCustomers) * 100, 1) : 0;
            return $s;
        });

        // 3. RFM Overview
        $avgRecencyDays = DB::table('customers')
            ->whereNotNull('last_purchase_date')
            ->select(DB::raw('AVG(DATEDIFF(NOW(), last_purchase_date)) as avg_recency'))
            ->value('avg_recency');
            
        $avgFrequency = DB::table('customers')->avg('total_orders');
        $avgMonetary = DB::table('customers')->avg('total_spending');

        $rfmOverview = [
            'recency' => $avgRecencyDays ? round((float)$avgRecencyDays, 1) : 0,
            'frequency' => $avgFrequency ? round((float)$avgFrequency, 1) : 0,
            'monetary' => $avgMonetary ? round((float)$avgMonetary, 0) : 0
        ];

        // 4. Data Table (Paginated, with filter)
        $query = DB::table('customers')
            ->leftJoin('customer_segments', 'customers.id', '=', 'customer_segments.customer_id')
            ->select(
                'customers.id',
                'customers.name',
                'customers.email',
                'customer_segments.segment_name as segment',
                'customer_segments.is_vip',
                'customers.total_orders as orders',
                'customers.total_spending as totalSpent',
                'customers.last_purchase_date as lastPurchase'
            );

        $segmentFilter = $request->query('segment', 'all');
        if ($segmentFilter !== 'all') {
            // Mapping from UI slug to DB name
            // 'champion' -> 'Champions'
            // 'loyal' -> 'Loyal'
            // 'potential-loyalist' -> 'Recent' / 'Average' (Depends on DB, let's just do a rough map)
            $dbSegment = $segmentFilter;
            if ($segmentFilter === 'champion') $dbSegment = 'Champions';
            if ($segmentFilter === 'loyal') $dbSegment = 'Loyal';
            if ($segmentFilter === 'potential-loyalist') $dbSegment = 'Average';
            if ($segmentFilter === 'new') $dbSegment = 'Recent';
            if ($segmentFilter === 'at-risk') $dbSegment = 'At Risk';
            if ($segmentFilter === 'lost') $dbSegment = 'Lost';
            
            $query->where('customer_segments.segment_name', $dbSegment);
        }

        $customers = $query->paginate(15);

        // Map status, AOV, CLV
        $customers->getCollection()->transform(function($c) {
            $c->aov = $c->orders > 0 ? round($c->totalSpent / $c->orders, 0) : 0;
            $c->clv = $c->totalSpent; // For now, CLV = totalSpent
            
            // Map segment to UI format
            $uiSegment = 'new';
            if ($c->segment === 'Champions') $uiSegment = 'champion';
            elseif ($c->segment === 'Loyal') $uiSegment = 'loyal';
            elseif ($c->segment === 'Average') $uiSegment = 'potential-loyalist';
            elseif ($c->segment === 'Recent') $uiSegment = 'new';
            elseif ($c->segment === 'At Risk') $uiSegment = 'at-risk';
            elseif ($c->segment === 'Lost') $uiSegment = 'lost';
            else $uiSegment = strtolower(str_replace(' ', '-', $c->segment ?? ''));
            
            $c->segment = $uiSegment;

            // Map status based on segment and is_vip
            if ($c->is_vip) {
                $c->status = 'vip';
            } elseif (in_array($c->segment, ['lost'])) {
                $c->status = 'dormant';
            } elseif (in_array($c->segment, ['at-risk'])) {
                $c->status = 'at-risk';
            } else {
                $c->status = 'active';
            }
            
            // Format date
            $c->lastPurchase = $c->lastPurchase ? Carbon::parse($c->lastPurchase)->diffForHumans() : 'Never';
            
            // Remove the internal DB column from response if desired (optional, keeping is fine)
            unset($c->is_vip);
            
            return $c;
        });

        return response()->json([
            'kpis' => $kpis,
            'segmentation' => $segmentation,
            'rfm_overview' => $rfmOverview,
            'customers' => $customers
        ]);
    }
}
