<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /**
     * Check if user is Admin (1) or Manager (2)
     */
    private function isAdminOrManager(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && in_array($role->name, ['admin', 'manager']);
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
            ->paginate(15);
            
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
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = 0;
            // First pass: validate stock
            foreach ($validated['items'] as $item) {
                $product = DB::table('products')->where('id', $item['product_id'])->lockForUpdate()->first();
                if (!$product || $product->stock_quantity < $item['quantity']) {
                    throw new \Exception("Product ID {$item['product_id']} is out of stock.");
                }
                $totalAmount += ($item['unit_price'] * $item['quantity']);
            }

            // Create Order
            $orderId = DB::table('orders')->insertGetId([
                'customer_id' => $validated['customer_id'],
                'staff_id' => $request->user()->id,
                'total_amount' => $totalAmount,
                'final_amount' => $totalAmount,
                'status' => 'Completed',
                'order_date' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Process Items
            foreach ($validated['items'] as $item) {
                $product = DB::table('products')->where('id', $item['product_id'])->first();
                
                // 1. Ghi Order Details
                DB::table('order_details')->insert([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'cost_price' => $product->cost_price,
                    'total' => $item['unit_price'] * $item['quantity'],
                    'profit' => ($item['unit_price'] - $product->cost_price) * $item['quantity'],
                ]);

                // 2. Trừ tồn kho tự động & Ghi log Inventory Transactions
                DB::table('products')->where('id', $product->id)->decrement('stock_quantity', $item['quantity']);
                
                DB::table('inventory_transactions')->insert([
                    'product_id' => $product->id,
                    'type' => 'OUT',
                    'quantity' => $item['quantity'],
                    'reference_type' => 'order',
                    'reference_id' => $orderId,
                    'note' => "Order {$orderId} creation",
                    'created_at' => now()
                ]);
            }

            // 3. Update Customer Stats (Simple aggregation fallback)
            // Cập nhật tổng chi tiêu (có thể dùng Trigger hoặc queue trong thực tế)
            DB::table('customers')->where('id', $validated['customer_id'])->increment('total_spending', $totalAmount);
            DB::table('customers')->where('id', $validated['customer_id'])->increment('total_orders', 1);
            DB::table('customers')->where('id', $validated['customer_id'])->update(['last_purchase_date' => now()]);

            DB::commit();
            return response()->json(['message' => 'Order created', 'id' => $orderId], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating order', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update order status (Admin/Manager only)
     */
    public function update(Request $request, $id)
    {
        $order = DB::table('orders')->where('id', $id)->first();
        if (!$order) return response()->json(['message' => 'Order not found'], 404);

        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Confirmed,Processing,Completed,Cancelled,Refunded'
        ]);

        if (in_array($validated['status'], ['Cancelled', 'Refunded']) && !$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can cancel or refund orders.'], 403);
        }

        DB::beginTransaction();
        try {
            // Nếu đơn bị hủy hoặc hoàn tiền -> Phục hồi tồn kho (Restock)
            if (in_array($validated['status'], ['Cancelled', 'Refunded']) && !in_array($order->status, ['Cancelled', 'Refunded'])) {
                $items = DB::table('order_details')->where('order_id', $id)->get();
                foreach ($items as $item) {
                    DB::table('products')->where('id', $item->product_id)->increment('stock_quantity', $item->quantity);
                    
                    DB::table('inventory_transactions')->insert([
                        'product_id' => $item->product_id,
                        'type' => 'IN',
                        'quantity' => $item->quantity,
                        'reference_type' => 'order',
                        'reference_id' => $id,
                        'note' => "Order {$id} {$validated['status']} - Restock",
                        'created_at' => now()
                    ]);
                }
            }

            DB::table('orders')->where('id', $id)->update([
                'status' => $validated['status'],
                'updated_at' => now()
            ]);

            DB::commit();
            return response()->json(['message' => 'Order status updated']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating order', 'error' => $e->getMessage()], 500);
        }
    }
}
