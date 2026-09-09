<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PromotionController extends Controller
{
    /**
     * Check if user is Admin (1) or Manager (2)
     */
    private function isAdminOrManager(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && in_array(strtolower($role->name), ['admin', 'manager']);
    }

    /**
     * Summary KPIs for top cards
     */
    public function getKpis(Request $request)
    {
        $now = Carbon::now();

        // 1. Active Promotions count (Active and within date range)
        $activeCount = DB::table('promotions')
            ->where('status', 'Active')
            ->where('start_date', '<=', $now)
            ->where('end_date', '>=', $now)
            ->count();

        // 2. Metrics from Completed orders with promotions
        $promoMetrics = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->whereNotNull('order_details.promotion_id')
            ->select(
                DB::raw('COALESCE(SUM(order_details.total), 0) as total_revenue'),
                DB::raw('COALESCE(SUM(order_details.discount_amount), 0) as total_discount'),
                DB::raw('COALESCE(SUM(order_details.profit), 0) as total_profit')
            )
            ->first();

        $totalRevenue = (float) ($promoMetrics->total_revenue ?? 0);
        $totalDiscount = (float) ($promoMetrics->total_discount ?? 0);
        $totalProfit = (float) ($promoMetrics->total_profit ?? 0);

        // Safe division: check totalDiscount > 0 before division to avoid NaN / division by zero
        $revDiscountRatio = $totalDiscount > 0 ? round($totalRevenue / $totalDiscount, 2) : 0;
        $margin = $totalRevenue > 0 ? round(($totalProfit / $totalRevenue) * 100, 1) : 0;
        $netRoi = $totalDiscount > 0 ? round((($totalProfit - $totalDiscount) / $totalDiscount) * 100, 1) : 0;

        return response()->json([
            'active_promotions' => $activeCount,
            'revenue_from_promotions' => $totalRevenue,
            'discount_cost' => $totalDiscount,
            'rev_discount_ratio' => $revDiscountRatio, // e.g. 3.5 means 3.5x
            'profit_impact' => $totalProfit,
            'margin' => $margin,
            'net_roi' => $netRoi
        ]);
    }

    /**
     * Get paginated/filtered list of promotions
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $status = $request->query('status'); // all, active, scheduled, ended, draft
        $now = Carbon::now();

        // Completed order details aggregated per promotion
        $completedDetails = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->select(
                'order_details.promotion_id',
                'order_details.order_id',
                'order_details.total',
                'order_details.profit',
                'order_details.discount_amount'
            );

        // Count products per promotion
        $productCounts = DB::table('promotion_products')
            ->select('promotion_id', DB::raw('COUNT(product_id) as total_products'))
            ->groupBy('promotion_id');

        $query = DB::table('promotions')
            ->leftJoinSub($completedDetails, 'cod', 'promotions.id', '=', 'cod.promotion_id')
            ->leftJoinSub($productCounts, 'pp', 'promotions.id', '=', 'pp.promotion_id')
            ->select(
                'promotions.*',
                DB::raw('COALESCE(pp.total_products, 0) as total_products'),
                DB::raw('COUNT(DISTINCT cod.order_id) as orders_count'),
                DB::raw('COALESCE(SUM(cod.total), 0) as total_revenue'),
                DB::raw('COALESCE(SUM(cod.profit), 0) as total_profit'),
                DB::raw('COALESCE(SUM(cod.discount_amount), 0) as total_discount')
            )
            ->groupBy(
                'promotions.id', 'promotions.name', 'promotions.discount_type',
                'promotions.discount_value', 'promotions.start_date', 'promotions.end_date',
                'promotions.min_order_value', 'promotions.status', 'promotions.created_at',
                'promotions.updated_at', 'pp.total_products'
            )
            ->orderBy('promotions.id', 'desc');

        if ($search) {
            $query->where('promotions.name', 'like', "%{$search}%");
        }

        $promotions = $query->get()->map(function($promo) use ($now) {
            $promo->total_products = (int) $promo->total_products;
            $promo->orders_count = (int) $promo->orders_count;
            $promo->total_revenue = (float) $promo->total_revenue;
            $promo->total_profit = (float) $promo->total_profit;
            $promo->total_discount = (float) $promo->total_discount;

            $startDate = Carbon::parse($promo->start_date);
            $endDate = Carbon::parse($promo->end_date);

            // Dynamic display status
            if ($promo->status === 'Draft') {
                $displayStatus = 'draft';
            } elseif ($promo->status === 'Expired' || $now->gt($endDate)) {
                $displayStatus = 'ended';
            } elseif ($now->lt($startDate)) {
                $displayStatus = 'scheduled';
            } else {
                $displayStatus = 'active';
            }
            $promo->display_status = $displayStatus;

            // Unified Performance & ROI status matching AnalyticsController
            $revenue = $promo->total_revenue;
            $profit = $promo->total_profit;
            $discount = $promo->total_discount;

            $margin = $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0;
            // Check discount > 0 before division
            $revDiscountRatio = $discount > 0 ? round($revenue / $discount, 2) : 0;

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

            $promo->margin = $margin;
            $promo->rev_discount_ratio = $revDiscountRatio;
            $promo->roi_status = $roiStatus;

            return $promo;
        });

        if ($status && $status !== 'all') {
            $promotions = $promotions->filter(function($p) use ($status) {
                return strtolower($p->display_status) === strtolower($status);
            })->values();
        }

        return response()->json($promotions);
    }

    /**
     * Show detail of a single promotion with applied products and Before/During/After analysis
     */
    public function show($id)
    {
        $now = Carbon::now();
        $promo = DB::table('promotions')->where('id', $id)->first();
        if (!$promo) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        // Products in this promotion
        $promoProducts = DB::table('promotion_products')
            ->join('products', 'promotion_products.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->where('promotion_products.promotion_id', $id)
            ->select(
                'products.id', 'products.name', 'products.sku',
                'products.current_price as price', 'products.stock_quantity as stock',
                'products.reorder_level as reorderLevel', 'categories.name as category',
                'brands.name as brand'
            )
            ->get();

        $productIds = $promoProducts->pluck('id')->toArray();

        // Completed orders stats for this promotion
        $stats = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->where('order_details.promotion_id', $id)
            ->select(
                DB::raw('COUNT(DISTINCT orders.id) as orders_count'),
                DB::raw('COALESCE(SUM(order_details.total), 0) as total_revenue'),
                DB::raw('COALESCE(SUM(order_details.profit), 0) as total_profit'),
                DB::raw('COALESCE(SUM(order_details.discount_amount), 0) as total_discount')
            )
            ->first();

        $ordersCount = (int) ($stats->orders_count ?? 0);
        $revenue = (float) ($stats->total_revenue ?? 0);
        $profit = (float) ($stats->total_profit ?? 0);
        $discount = (float) ($stats->total_discount ?? 0);

        $margin = $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0;
        $revDiscountRatio = $discount > 0 ? round($revenue / $discount, 2) : 0;
        $costPerOrder = $ordersCount > 0 ? round($discount / $ordersCount) : 0;

        $roiStatus = 'Failed';
        if ($profit >= 0) {
            if ($margin >= 10) $roiStatus = 'Success';
            else $roiStatus = 'Weak';
        }
        if ($revenue == 0 && $profit == 0) {
            $roiStatus = 'No Data';
        }

        // Dynamic display status
        $startDate = Carbon::parse($promo->start_date);
        $endDate = Carbon::parse($promo->end_date);
        if ($promo->status === 'Draft') {
            $displayStatus = 'draft';
        } elseif ($promo->status === 'Expired' || $now->gt($endDate)) {
            $displayStatus = 'ended';
        } elseif ($now->lt($startDate)) {
            $displayStatus = 'scheduled';
        } else {
            $displayStatus = 'active';
        }

        // Phase comparison: Before / During / After
        $durationDays = max(1, $startDate->diffInDays($endDate));
        $beforeStart = (clone $startDate)->subDays($durationDays);
        $beforeEnd = (clone $startDate)->subSecond();

        $afterStart = (clone $endDate)->addSecond();
        $afterEnd = (clone $endDate)->addDays($durationDays);

        $beforeRevenue = 0;
        $duringRevenue = 0;
        $afterRevenue = null;
        $isCollecting = $now->lt($endDate) || $now->diffInDays($endDate) < 1;
        $afterStatus = $isCollecting ? 'collecting' : 'available';

        if (!empty($productIds)) {
            // Before revenue of these products
            $beforeRevenue = (float) DB::table('order_details')
                ->join('orders', 'order_details.order_id', '=', 'orders.id')
                ->where('orders.status', 'Completed')
                ->whereIn('order_details.product_id', $productIds)
                ->whereBetween('orders.order_date', [$beforeStart, $beforeEnd])
                ->sum('order_details.total');

            // During revenue of these products
            $duringEndPeriod = $now->lt($endDate) ? $now : $endDate;
            $duringRevenue = (float) DB::table('order_details')
                ->join('orders', 'order_details.order_id', '=', 'orders.id')
                ->where('orders.status', 'Completed')
                ->whereIn('order_details.product_id', $productIds)
                ->whereBetween('orders.order_date', [$startDate, $duringEndPeriod])
                ->sum('order_details.total');

            // If campaign is still active or ended less than 1 day ago, "After" is still collecting data
            if ($now->lt($endDate) || $now->diffInDays($endDate) < 1) {
                $afterStatus = 'collecting';
                $afterRevenue = null;
            } else {
                $afterRevenue = (float) DB::table('order_details')
                    ->join('orders', 'order_details.order_id', '=', 'orders.id')
                    ->where('orders.status', 'Completed')
                    ->whereIn('order_details.product_id', $productIds)
                    ->whereBetween('orders.order_date', [$afterStart, min($afterEnd, $now)])
                    ->sum('order_details.total');
            }
        }

        $uplift = $beforeRevenue > 0 ? round((($duringRevenue - $beforeRevenue) / $beforeRevenue) * 100, 1) : ($duringRevenue > 0 ? 100 : 0);

        return response()->json([
            'id' => $promo->id,
            'name' => $promo->name,
            'discount_type' => $promo->discount_type,
            'discount_value' => (float) $promo->discount_value,
            'start_date' => $promo->start_date,
            'end_date' => $promo->end_date,
            'min_order_value' => (float) $promo->min_order_value,
            'status' => $promo->status,
            'display_status' => $displayStatus,
            'products' => $promoProducts,
            'orders_count' => $ordersCount,
            'revenue' => $revenue,
            'profit' => $profit,
            'discount_cost' => $discount,
            'rev_discount_ratio' => $revDiscountRatio,
            'margin' => $margin,
            'cost_per_order' => $costPerOrder,
            'roi_status' => $roiStatus,
            'comparison' => [
                'before_revenue' => $beforeRevenue,
                'during_revenue' => $duringRevenue,
                'after_revenue' => $afterRevenue,
                'after_status' => $afterStatus, // 'collecting' or 'ended'
                'uplift' => $uplift
            ]
        ]);
    }

    /**
     * Create a new promotion (Admin / Manager only)
     */
    public function store(Request $request)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can create promotions.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'discount_type' => 'required|string|in:PERCENT,FIXED',
            'discount_value' => 'required|numeric|min:0.01',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'min_order_value' => 'nullable|numeric|min:0',
            'status' => 'required|string|in:Active,Draft,Expired',
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'integer|exists:products,id'
        ]);

        DB::beginTransaction();
        try {
            $promoId = DB::table('promotions')->insertGetId([
                'name' => $validated['name'],
                'discount_type' => $validated['discount_type'],
                'discount_value' => $validated['discount_value'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'min_order_value' => $validated['min_order_value'] ?? 0,
                'status' => $validated['status'],
                'created_at' => now(),
                'updated_at' => now()
            ]);

            $productInserts = [];
            foreach ($validated['product_ids'] as $pid) {
                $productInserts[] = [
                    'promotion_id' => $promoId,
                    'product_id' => $pid
                ];
            }
            DB::table('promotion_products')->insert($productInserts);

            DB::commit();
            return response()->json(['message' => 'Promotion created successfully', 'id' => $promoId], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating promotion: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing promotion (Admin / Manager only)
     */
    public function update(Request $request, $id)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can update promotions.'], 403);
        }

        $promo = DB::table('promotions')->where('id', $id)->first();
        if (!$promo) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'discount_type' => 'sometimes|required|string|in:PERCENT,FIXED',
            'discount_value' => 'sometimes|required|numeric|min:0.01',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'sometimes|required|date',
            'min_order_value' => 'nullable|numeric|min:0',
            'status' => 'sometimes|required|string|in:Active,Draft,Expired',
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer|exists:products,id'
        ]);

        DB::beginTransaction();
        try {
            $updateData = [];
            foreach (['name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'min_order_value', 'status'] as $field) {
                if (isset($validated[$field])) {
                    $updateData[$field] = $validated[$field];
                }
            }
            $updateData['updated_at'] = now();

            DB::table('promotions')->where('id', $id)->update($updateData);

            if (isset($validated['product_ids'])) {
                DB::table('promotion_products')->where('promotion_id', $id)->delete();
                $productInserts = [];
                foreach ($validated['product_ids'] as $pid) {
                    $productInserts[] = [
                        'promotion_id' => $id,
                        'product_id' => $pid
                    ];
                }
                if (!empty($productInserts)) {
                    DB::table('promotion_products')->insert($productInserts);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Promotion updated successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating promotion: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete a promotion (Admin / Manager only)
     * Enforces integrity check: cannot delete if referenced in order_details
     */
    public function destroy(Request $request, $id)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can delete promotions.'], 403);
        }

        $promo = DB::table('promotions')->where('id', $id)->first();
        if (!$promo) {
            return response()->json(['message' => 'Promotion not found'], 404);
        }

        // Integrity constraint check matching ProductController pattern:
        $hasOrders = DB::table('order_details')->where('promotion_id', $id)->exists();
        if ($hasOrders) {
            return response()->json([
                'message' => 'Cannot delete promotion because it has associated orders. Please change its status to Expired instead.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            DB::table('promotion_products')->where('promotion_id', $id)->delete();
            DB::table('promotions')->where('id', $id)->delete();
            DB::commit();

            return response()->json(['message' => 'Promotion deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error deleting promotion: ' . $e->getMessage()], 500);
        }
    }
}
