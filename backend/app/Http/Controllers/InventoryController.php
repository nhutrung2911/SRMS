<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InventoryController extends Controller
{
    private function isAdminOrManager(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && in_array($role->name, ['admin', 'manager']);
    }

    /**
     * Lấy 4 KPIs cho trang Inventory
     */
    public function getKpis()
    {
        $products = DB::table('products')->select('id', 'stock_quantity', 'reorder_level')->get();

        $velocities = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->where('orders.order_date', '>=', Carbon::now()->subDays(30))
            ->selectRaw('product_id, SUM(quantity) as total_sold')
            ->groupBy('product_id')
            ->pluck('total_sold', 'product_id');

        $total = count($products);
        $lowStock = 0;
        $outOfStock = 0;
        $deadStock = 0;

        foreach ($products as $p) {
            $sold = $velocities[$p->id] ?? 0;
            $velocity = $sold / 30;
            $daysRemaining = $velocity > 0 ? $p->stock_quantity / $velocity : 999;

            if ($p->stock_quantity == 0) {
                $outOfStock++;
            } elseif ($p->stock_quantity > 0 && $velocity == 0) {
                $deadStock++;
            } elseif ($daysRemaining > 90) {
                $deadStock++;
            } elseif ($p->stock_quantity < $p->reorder_level) {
                $lowStock++;
            }
        }

        return response()->json([
            [
                'label' => 'Total Products',
                'value' => (string) $total,
                'trend' => 'up',
                'trendValue' => '100%',
                'status' => 'neutral'
            ],
            [
                'label' => 'Low Stock Items',
                'value' => (string) $lowStock,
                'trend' => 'down',
                'trendValue' => 'Needs attention',
                'status' => 'warning'
            ],
            [
                'label' => 'Out of Stock',
                'value' => (string) $outOfStock,
                'trend' => 'down',
                'trendValue' => 'Critical',
                'status' => 'critical'
            ],
            [
                'label' => 'Dead Stock Risk',
                'value' => (string) $deadStock,
                'trend' => 'up',
                'trendValue' => '> 90 days',
                'status' => 'warning'
            ]
        ]);
    }

    /**
     * Lấy danh sách sản phẩm và mức độ rủi ro tồn kho
     */
    public function index()
    {
        $products = DB::table('products')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('recommendations', function($join) {
                $join->on('products.id', '=', 'recommendations.target_id')
                     ->where('recommendations.target_type', '=', 'product')
                     ->where('recommendations.type', '=', 'Inventory')
                     ->where('recommendations.status', '=', 'Pending');
            })
            ->select(
                'products.id as productId',
                'products.name as productName',
                'products.sku',
                'categories.name as category',
                'products.stock_quantity as currentStock',
                'products.reorder_level as reorderLevel',
                'recommendations.recommended_action as ai_recommendation'
            )
            ->get();

        $velocities = DB::table('order_details')
            ->join('orders', 'order_details.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->where('orders.order_date', '>=', Carbon::now()->subDays(30))
            ->selectRaw('product_id, SUM(quantity) as total_sold')
            ->groupBy('product_id')
            ->pluck('total_sold', 'product_id');

        $results = [];
        foreach ($products as $p) {
            $sold = $velocities[$p->productId] ?? 0;
            $velocity = round($sold / 30, 2);
            
            $daysRemaining = 999;
            if ($velocity > 0) {
                $daysRemaining = floor($p->currentStock / $velocity);
            }
            
            // Phân loại rủi ro theo đúng thứ tự ưu tiên
            $risk = 'low';
            if ($p->currentStock == 0) {
                $risk = 'critical';
            } elseif ($p->currentStock > 0 && $velocity == 0) {
                $risk = 'medium'; // Ưu tiên check Dead stock cứng trước
            } elseif ($daysRemaining > 90) {
                $risk = 'medium'; // Dead stock mềm
            } elseif ($p->currentStock < $p->reorderLevel || $daysRemaining <= 7) {
                $risk = 'high'; // Sắp hết hàng thì mới báo nhập
            }
            
            // Recommendation text
            $recText = $p->ai_recommendation;
            if (!$recText) {
                if ($risk === 'critical') $recText = 'Reorder immediately';
                elseif ($risk === 'high') $recText = 'Reorder soon';
                elseif ($risk === 'medium') $recText = 'Consider promotion or bundle';
                else $recText = 'No action needed';
            }
            
            $results[] = [
                'productId' => (string) $p->productId,
                'productName' => $p->productName,
                'sku' => $p->sku,
                'category' => $p->category ?: 'Uncategorized',
                'currentStock' => (int) $p->currentStock,
                'reorderLevel' => (int) $p->reorderLevel,
                'salesVelocity' => $velocity,
                'daysRemaining' => (int) $daysRemaining,
                'risk' => $risk,
                'recommendation' => $recText
            ];
        }

        return response()->json($results);
    }

    /**
     * Cập nhật tồn kho (Nhập, Xuất, Điều chỉnh)
     */
    public function adjust(Request $request, $id)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can adjust stock.'], 403);
        }

        $validated = $request->validate([
            'type' => 'required|in:IN,OUT,ADJUSTMENT',
            'quantity' => 'required|integer',
            'note' => 'nullable|string|max:255'
        ]);

        $product = DB::table('products')->where('id', $id)->first();
        if (!$product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        $qty = $validated['quantity'];
        $newStock = $product->stock_quantity;

        if ($validated['type'] === 'IN') {
            $newStock += abs($qty);
        } elseif ($validated['type'] === 'OUT') {
            $newStock -= abs($qty);
        } else {
            // ADJUSTMENT
            $newStock += $qty;
        }

        if ($newStock < 0) {
            return response()->json(['message' => 'Stock cannot be negative.'], 422);
        }

        DB::beginTransaction();
        try {
            DB::table('products')->where('id', $id)->update(['stock_quantity' => $newStock]);
            
            DB::table('inventory_transactions')->insert([
                'product_id' => $id,
                'user_id' => $request->user()->id,
                'type' => $validated['type'],
                'quantity' => ($validated['type'] === 'ADJUSTMENT') ? $qty : abs($qty),
                'reference_type' => 'adjustment',
                'note' => $validated['note'] ?? 'Manual adjustment via UI',
                'created_at' => Carbon::now()
            ]);
            
            DB::commit();
            return response()->json([
                'message' => 'Stock adjusted successfully.',
                'new_stock' => $newStock
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Database error.'], 500);
        }
    }
}
