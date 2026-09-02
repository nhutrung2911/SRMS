<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get KPI summaries (Revenue, Profit, Orders, AOV, Growth)
     * Optmization: Uses the pre-aggregated revenue_daily table whenever possible.
     */
    public function getKpis(Request $request)
    {
        $type = $request->query('type', 'month');

        $query = DB::table('revenue_daily');
        $prevQuery = DB::table('revenue_daily');
        
        if ($type === 'today') {
            $query->whereDate('date', Carbon::today());
            $prevQuery->whereDate('date', Carbon::yesterday());
        } elseif ($type === 'month') {
            $query->whereMonth('date', Carbon::now()->month)
                  ->whereYear('date', Carbon::now()->year);
            $prevQuery->whereMonth('date', Carbon::now()->subMonth()->month)
                      ->whereYear('date', Carbon::now()->subMonth()->year);
        } elseif ($type === 'year') {
            $query->whereYear('date', Carbon::now()->year);
            $prevQuery->whereYear('date', Carbon::now()->subYear()->year);
        } else {
            // Default to 30 days
            $query->where('date', '>=', Carbon::now()->subDays(30)->toDateString());
            $prevQuery->whereBetween('date', [
                Carbon::now()->subDays(60)->toDateString(),
                Carbon::now()->subDays(30)->subDay()->toDateString()
            ]);
        }

        $stats = $query->select(
            DB::raw('SUM(total_revenue) as total_revenue'),
            DB::raw('SUM(total_profit) as total_profit'),
            DB::raw('SUM(total_orders) as total_orders')
        )->first();

        $prevStats = $prevQuery->select(
            DB::raw('SUM(total_revenue) as total_revenue'),
            DB::raw('SUM(total_profit) as total_profit'),
            DB::raw('SUM(total_orders) as total_orders')
        )->first();

        $currentRevenue = (float) ($stats->total_revenue ?? 0);
        $prevRevenue = (float) ($prevStats->total_revenue ?? 0);
        
        $currentProfit = (float) ($stats->total_profit ?? 0);
        $prevProfit = (float) ($prevStats->total_profit ?? 0);
        
        $currentOrders = (int) ($stats->total_orders ?? 0);
        $prevOrders = (int) ($prevStats->total_orders ?? 0);
        
        $currentAov = $currentOrders > 0 ? $currentRevenue / $currentOrders : 0;
        $prevAov = $prevOrders > 0 ? $prevRevenue / $prevOrders : 0;

        $calcGrowth = function($current, $prev) {
            if ($prev > 0) return (($current - $prev) / $prev) * 100;
            return null;
        };

        $revenueGrowth = $calcGrowth($currentRevenue, $prevRevenue);
        $profitGrowth = $calcGrowth($currentProfit, $prevProfit);
        $ordersGrowth = $calcGrowth($currentOrders, $prevOrders);
        $aovGrowth = $calcGrowth($currentAov, $prevAov);

        $segments = DB::table('customer_segments')
            ->select('segment_name', DB::raw('COUNT(id) as count'))
            ->groupBy('segment_name')
            ->get();

        return response()->json([
            'kpis' => [
                'revenue' => $currentRevenue,
                'profit' => $currentProfit,
                'orders' => $currentOrders,
                'average_order_value' => $currentAov,
                'revenue_growth' => $revenueGrowth !== null ? round($revenueGrowth, 2) : null,
                'profit_growth' => $profitGrowth !== null ? round($profitGrowth, 2) : null,
                'orders_growth' => $ordersGrowth !== null ? round($ordersGrowth, 2) : null,
                'aov_growth' => $aovGrowth !== null ? round($aovGrowth, 2) : null,
            ],
            'customer_segments' => $segments
        ]);
    }

    public function getChartData(Request $request)
    {
        $type = $request->query('type', '30_days');
        
        $days = 30;
        if ($type === '7_days') $days = 7;
        elseif ($type === '90_days') $days = 90;

        $startDate = Carbon::now()->subDays($days)->toDateString();

        $dailyData = DB::table('revenue_daily')
            ->where('date', '>=', $startDate)
            ->orderBy('date', 'asc')
            ->get();

        $formattedData = $dailyData->map(function ($day) {
            return [
                'name' => Carbon::parse($day->date)->format('M d'),
                'revenue' => (float) $day->total_revenue,
                'profit' => (float) $day->total_profit,
            ];
        });

        return response()->json($formattedData);
    }
}
