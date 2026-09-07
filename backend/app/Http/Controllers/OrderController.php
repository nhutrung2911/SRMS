<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OrderController extends Controller
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
     * Get a paginated list of orders with customer name.
     */
    public function index(Request $request)
    {
        $orders = DB::table('orders')
            ->join('customers', 'orders.customer_id', '=', 'customers.id')
            ->select('orders.*', 'customers.name as customer_name')
            ->orderBy('orders.order_date', 'desc')
            ->get();
            
        return response()->json($orders);
    }

    /**
     * Display order details including items.
     */
    public function show($id)
    {
        $order = DB::table('orders')
            ->join('customers', 'orders.customer_id', '=', 'customers.id')
            ->select('orders.*', 'customers.name as customer_name', 'customers.email', 'customers.phone')
            ->where('orders.id', $id)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $items = DB::table('order_details')
            ->join('products', 'order_details.product_id', '=', 'products.id')
            ->leftJoin('promotions', 'order_details.promotion_id', '=', 'promotions.id')
            ->select(
                'order_details.*', 
                'products.name as product_name', 
                'products.sku',
                'promotions.name as promotion_name'
            )
            ->where('order_details.order_id', $id)
            ->get();

        $order->items = $items;

        return response()->json($order);
    }

    /**
     * Create a new order (All roles can do this)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|integer',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric',
            'items.*.promotion_id' => 'nullable|integer'
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = 0;
            $totalDiscount = 0;
            $finalAmount = 0;

            $itemsData = [];

            // Compute totals and discounts, but do NOT deduct inventory yet
            foreach ($validated['items'] as $item) {
                $product = DB::table('products')->where('id', $item['product_id'])->first();
                if (!$product) {
                    throw new \Exception("Product ID {$item['product_id']} not found.");
                }

                $quantity = $item['quantity'];
                // Enforce current_price from products table to prevent client tampering and respect RBAC
                $unitPrice = $product->current_price;
                $itemTotalBeforeDiscount = $unitPrice * $quantity;
                $itemDiscount = 0;

                // Validate promotion if provided
                if (!empty($item['promotion_id'])) {
                    $promo = DB::table('promotions')->where('id', $item['promotion_id'])->first();
                    if ($promo && $promo->status === 'Active' && now()->between($promo->start_date, $promo->end_date)) {
                        if ($promo->discount_type === 'PERCENT') {
                            $itemDiscount = $itemTotalBeforeDiscount * ($promo->discount_value / 100);
                        } else {
                            $itemDiscount = $promo->discount_value * $quantity;
                        }
                    }
                }

                $itemTotal = $itemTotalBeforeDiscount - $itemDiscount;
                $itemProfit = $itemTotal - ($product->cost_price * $quantity);

                $totalAmount += $itemTotalBeforeDiscount;
                $totalDiscount += $itemDiscount;
                $finalAmount += $itemTotal;

                $itemsData[] = [
                    'product_id' => $product->id,
                    'promotion_id' => !empty($item['promotion_id']) ? $item['promotion_id'] : null,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'cost_price' => $product->cost_price,
                    'discount_amount' => $itemDiscount,
                    'total' => $itemTotal,
                    'profit' => $itemProfit,
                ];
            }

            // Create Order as Pending
            $orderId = DB::table('orders')->insertGetId([
                'customer_id' => $validated['customer_id'],
                'staff_id' => $request->user()->id,
                'total_amount' => $totalAmount,
                'discount_amount' => $totalDiscount,
                'final_amount' => $finalAmount,
                'status' => 'Pending',
                'order_date' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Save Items
            foreach ($itemsData as $data) {
                $data['order_id'] = $orderId;
                DB::table('order_details')->insert($data);
            }

            DB::commit();
            return response()->json(['message' => 'Order created successfully', 'id' => $orderId], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating order', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update order status (Admin/Manager only for Cancel/Refund)
     */
    public function update(Request $request, $id)
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) return response()->json(['message' => 'Order not found'], 404);

        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Confirmed,Processing,Completed,Cancelled,Refunded'
        ]);

        $newStatus = $validated['status'];
        $oldStatus = $order->status;

        if ($newStatus === $oldStatus) {
            return response()->json(['message' => 'Order is already in this status']);
        }

        if (in_array($newStatus, ['Cancelled', 'Refunded']) && !$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can cancel or refund orders.'], 403);
        }

        DB::beginTransaction();
        try {
            $items = DB::table('order_details')->where('order_id', $id)->get();
            $orderDate = Carbon::parse($order->order_date)->toDateString();

            // Transition TO Completed (from anything else)
            if ($newStatus === 'Completed' && $oldStatus !== 'Completed') {
                $totalProfit = 0;

                // Validate stock and deduct
                foreach ($items as $item) {
                    $product = DB::table('products')->where('id', $item->product_id)->lockForUpdate()->first();
                    if ($product->stock_quantity < $item->quantity) {
                        throw new \Exception("Insufficient stock for product: {$product->name}. Requested: {$item->quantity}, Available: {$product->stock_quantity}");
                    }

                    // Deduct stock
                    DB::table('products')->where('id', $item->product_id)->decrement('stock_quantity', $item->quantity);

                    // Log OUT transaction
                    DB::table('inventory_transactions')->insert([
                        'product_id' => $item->product_id,
                        'user_id' => $request->user()->id,
                        'type' => 'OUT',
                        'quantity' => $item->quantity,
                        'reference_type' => 'order',
                        'reference_id' => $id,
                        'note' => "Order {$id} completed",
                        'created_at' => now()
                    ]);

                    $totalProfit += $item->profit;
                }

                // Update Customer metrics
                DB::table('customers')->where('id', $order->customer_id)->increment('total_spending', $order->final_amount);
                DB::table('customers')->where('id', $order->customer_id)->increment('total_orders', 1);
                DB::table('customers')->where('id', $order->customer_id)->update(['last_purchase_date' => now()]);

                // Update Revenue Daily
                $daily = DB::table('revenue_daily')->where('date', $orderDate)->first();
                if ($daily) {
                    DB::table('revenue_daily')->where('date', $orderDate)->update([
                        'total_revenue' => DB::raw("total_revenue + {$order->final_amount}"),
                        'total_profit' => DB::raw("total_profit + {$totalProfit}"),
                        'total_orders' => DB::raw("total_orders + 1"),
                        'updated_at' => now()
                    ]);
                } else {
                    DB::table('revenue_daily')->insert([
                        'date' => $orderDate,
                        'total_revenue' => $order->final_amount,
                        'total_profit' => $totalProfit,
                        'total_orders' => 1,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            // Transition TO Refunded (from Completed)
            if ($newStatus === 'Refunded' && $oldStatus === 'Completed') {
                $totalProfit = 0;

                foreach ($items as $item) {
                    // Add stock back
                    DB::table('products')->where('id', $item->product_id)->increment('stock_quantity', $item->quantity);
                    
                    // Log IN transaction
                    DB::table('inventory_transactions')->insert([
                        'product_id' => $item->product_id,
                        'user_id' => $request->user()->id,
                        'type' => 'IN',
                        'quantity' => $item->quantity,
                        'reference_type' => 'order',
                        'reference_id' => $id,
                        'note' => "Order {$id} refunded - Restock",
                        'created_at' => now()
                    ]);

                    $totalProfit += $item->profit;
                }

                // Revert Customer metrics
                DB::table('customers')->where('id', $order->customer_id)->decrement('total_spending', $order->final_amount);
                DB::table('customers')->where('id', $order->customer_id)->decrement('total_orders', 1);

                // Revert Revenue Daily
                DB::table('revenue_daily')->where('date', $orderDate)->update([
                    'total_revenue' => DB::raw("total_revenue - {$order->final_amount}"),
                    'total_profit' => DB::raw("total_profit - {$totalProfit}"),
                    'total_orders' => DB::raw("total_orders - 1"),
                    'updated_at' => now()
                ]);
            }

            // Note: If transitioning to Cancelled (from Pending/Processing), no stock/revenue changes are needed.

            // Save new status
            DB::table('orders')->where('id', $id)->update([
                'status' => $newStatus,
                'updated_at' => now()
            ]);

            DB::commit();
            return response()->json(['message' => "Order status updated to {$newStatus}"]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating order', 'error' => $e->getMessage()], 422);
        }
    }

    public function getCustomers()
    {
        return response()->json(DB::table('customers')->select('id', 'name', 'phone')->get());
    }

    public function getPromotions()
    {
        return response()->json(
            DB::table('promotions')
                ->where('status', 'Active')
                ->where('start_date', '<=', now())
                ->where('end_date', '>=', now())
                ->select('id', 'name', 'discount_type', 'discount_value')
                ->get()
        );
    }
}
