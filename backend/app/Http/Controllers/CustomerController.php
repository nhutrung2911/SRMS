<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class CustomerController extends Controller
{
    /**
     * Get detailed information for a specific customer.
     * Reuses 100% of data from customers and customer_segments (Single Source of Truth).
     */
    public function show($id)
    {
        $customer = DB::table('customers')
            ->leftJoin('customer_segments', 'customers.id', '=', 'customer_segments.customer_id')
            ->where('customers.id', $id)
            ->select(
                'customers.id',
                'customers.name',
                'customers.email',
                'customers.phone',
                'customers.address',
                'customers.total_spending',
                'customers.total_orders',
                'customers.last_purchase_date',
                'customers.created_at',
                'customer_segments.segment_name',
                'customer_segments.r_score',
                'customer_segments.f_score',
                'customer_segments.m_score',
                'customer_segments.is_vip',
                'customer_segments.calculated_at'
            )
            ->first();

        if (!$customer) {
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $totalOrders = (int) $customer->total_orders;
        $totalSpending = (float) $customer->total_spending;
        $aov = $totalOrders > 0 ? round($totalSpending / $totalOrders) : 0;
        
        $recencyDays = null;
        if ($customer->last_purchase_date) {
            $recencyDays = max(0, Carbon::parse($customer->last_purchase_date)->diffInDays(Carbon::now()));
        }

        // 1. Fetch recent orders for this customer
        $recentOrders = DB::table('orders')
            ->where('customer_id', $id)
            ->select('id', 'order_date', 'status', 'total_amount', 'discount_amount', 'final_amount')
            ->orderBy('order_date', 'desc')
            ->take(15)
            ->get();

        $orderIds = $recentOrders->pluck('id');
        $itemCounts = DB::table('order_details')
            ->whereIn('order_id', $orderIds)
            ->select('order_id', DB::raw('SUM(quantity) as items_count'))
            ->groupBy('order_id')
            ->pluck('items_count', 'order_id');

        $formattedOrders = $recentOrders->map(function ($order) use ($itemCounts) {
            return [
                'id' => $order->id,
                'order_date' => $order->order_date,
                'status' => $order->status,
                'total_amount' => (float) $order->total_amount,
                'discount_amount' => (float) $order->discount_amount,
                'final_amount' => (float) $order->final_amount,
                'items_count' => (int) ($itemCounts[$order->id] ?? 0),
            ];
        });

        // 2. Fetch spending trend grouped by YEAR-MONTH (%Y-%m) to prevent collision across years
        // Note: Using period_month alias because YEAR_MONTH is a reserved keyword in MySQL.
        $monthlySpending = DB::table('orders')
            ->where('customer_id', $id)
            ->where('status', 'Completed')
            ->select(
                DB::raw("DATE_FORMAT(order_date, '%Y-%m') as period_month"),
                DB::raw("SUM(final_amount) as revenue"),
                DB::raw("COUNT(id) as order_count")
            )
            ->groupBy('period_month')
            ->orderBy('period_month', 'asc')
            ->get();

        $trendData = $monthlySpending->map(function ($row) {
            $revenue = (float) $row->revenue;
            // Estimated gross profit margin at 25% for chart consistency if profit not aggregated
            return [
                'label' => Carbon::createFromFormat('Y-m', $row->period_month)->format('M y'),
                'revenue' => $revenue,
                'profit' => round($revenue * 0.25),
                'orders' => (int) $row->order_count,
            ];
        });

        return response()->json([
            'customer' => [
                'id' => (string) $customer->id,
                'name' => $customer->name,
                'email' => $customer->email ?? 'N/A',
                'phone' => $customer->phone ?? 'N/A',
                'address' => $customer->address ?? 'N/A',
                'created_at' => $customer->created_at,
                'last_purchase' => $customer->last_purchase_date,
                'recency_days' => $recencyDays,
                'total_orders' => $totalOrders,
                'total_spent' => $totalSpending,
                'aov' => $aov,
                'clv' => $totalSpending,
                'segment' => $customer->segment_name ? strtolower(str_replace(' ', '-', $customer->segment_name)) : 'recent',
                'segment_name' => $customer->segment_name ?? 'Recent',
                'status' => $customer->is_vip ? 'vip' : ($customer->segment_name === 'At Risk' || $customer->segment_name === 'Lost' ? 'at-risk' : 'active'),
                'rfm' => [
                    'r_score' => $customer->r_score ?? 3,
                    'f_score' => $customer->f_score ?? 1,
                    'm_score' => $customer->m_score ?? 1,
                    'is_vip' => (bool) ($customer->is_vip ?? false),
                    'calculated_at' => $customer->calculated_at,
                ],
            ],
            'orders' => $formattedOrders,
            'trend' => $trendData,
        ]);
    }

    /**
     * Store a new customer.
     * Allowed for Staff, Manager, and Admin.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:150',
            'email' => 'nullable|email|max:150|unique:customers,email',
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $now = Carbon::now();

        $customerId = DB::transaction(function () use ($request, $now) {
            $id = DB::table('customers')->insertGetId([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'address' => $request->address,
                'total_spending' => 0,
                'total_orders' => 0,
                'last_purchase_date' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            // Initialize default snapshot in customer_segments
            DB::table('customer_segments')->insert([
                'customer_id' => $id,
                'r_score' => 5,
                'f_score' => 1,
                'm_score' => 1,
                'segment_name' => 'Recent',
                'is_vip' => false,
                'calculated_at' => $now,
            ]);

            return $id;
        });

        return response()->json([
            'message' => 'Customer registered successfully.',
            'customer_id' => $customerId,
        ], 201);
    }

    /**
     * Update customer details.
     * Allowed for Staff, Manager, and Admin.
     */
    public function update(Request $request, $id)
    {
        $customer = DB::table('customers')->where('id', $id)->first();
        if (!$customer) {
            return response()->json(['message' => 'Customer not found.'], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:150',
            'email' => 'sometimes|nullable|email|max:150|unique:customers,email,' . $id,
            'phone' => 'sometimes|nullable|string|max:30',
            'address' => 'sometimes|nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $updateData = [];
        if ($request->has('name')) $updateData['name'] = $request->name;
        if ($request->has('email')) $updateData['email'] = $request->email;
        if ($request->has('phone')) $updateData['phone'] = $request->phone;
        if ($request->has('address')) $updateData['address'] = $request->address;
        $updateData['updated_at'] = Carbon::now();

        DB::table('customers')->where('id', $id)->update($updateData);

        return response()->json([
            'message' => 'Customer updated successfully.',
        ]);
    }
}
