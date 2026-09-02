<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductController extends Controller
{
    /**
     * Check if user is Admin
     */
    private function isAdmin(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && strtolower($role->name) === 'admin';
    }

    /**
     * Get a paginated list of products with their category and brand.
     */
    public function index(Request $request)
    {
        $products = DB::table('products')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->select(
                'products.id', 'products.name', 'products.sku', 
                'products.cost_price', 'products.base_price', 'products.current_price',
                'products.stock_quantity', 'products.reorder_level', 'products.status',
                'categories.name as category_name', 'brands.name as brand_name'
            )
            ->orderBy('products.id', 'desc')
            ->get();

        return response()->json($products);
    }

    /**
     * Display a specific product with its images.
     */
    public function show($id)
    {
        $product = DB::table('products')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->leftJoin('suppliers', 'products.supplier_id', '=', 'suppliers.id')
            ->select(
                'products.*', 
                'categories.name as category_name', 
                'brands.name as brand_name',
                'suppliers.name as supplier_name'
            )
            ->where('products.id', $id)
            ->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        $images = DB::table('product_images')->where('product_id', $id)->get();
        $product->images = $images;

        return response()->json($product);
    }

    /**
     * Create a new product.
     */
    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin can create products.'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'required|integer',
            'brand_id' => 'nullable|integer',
            'supplier_id' => 'nullable|integer',
            'name' => 'required|string',
            'sku' => 'required|string|unique:products,sku',
            'cost_price' => 'required|numeric',
            'base_price' => 'required|numeric',
            'current_price' => 'required|numeric',
            'stock_quantity' => 'required|integer',
            'reorder_level' => 'nullable|integer',
            'status' => 'nullable|string|in:Active,Inactive,Out of Stock'
        ]);

        if ($validated['current_price'] < $validated['cost_price']) {
            return response()->json(['message' => "Selling price cannot be lower than cost price."], 422);
        }

        DB::beginTransaction();
        try {
            $pid = DB::table('products')->insertGetId(array_merge($validated, [
                'created_at' => now(),
                'updated_at' => now()
            ]));

            // Ghi log nhập kho ban đầu
            if ($validated['stock_quantity'] > 0) {
                DB::table('inventory_transactions')->insert([
                    'product_id' => $pid,
                    'user_id' => $request->user()->id,
                    'type' => 'IN',
                    'quantity' => $validated['stock_quantity'],
                    'reference_type' => 'adjustment',
                    'note' => 'Initial Stock',
                    'created_at' => now()
                ]);
            }
            // Không ghi price_history cho lần đầu tạo (theo đúng yêu cầu)

            DB::commit();
            return response()->json(['message' => 'Product created', 'id' => $pid], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error creating product', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing product.
     */
    public function update(Request $request, $id)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin can update products.'], 403);
        }

        $product = DB::table('products')->where('id', $id)->first();
        if (!$product) return response()->json(['message' => 'Not found'], 404);

        $validated = $request->validate([
            'category_id' => 'sometimes|integer',
            'brand_id' => 'nullable|integer',
            'supplier_id' => 'nullable|integer',
            'name' => 'sometimes|string',
            'sku' => 'sometimes|string|unique:products,sku,'.$id,
            'cost_price' => 'sometimes|numeric',
            'base_price' => 'sometimes|numeric',
            'current_price' => 'sometimes|numeric',
            'stock_quantity' => 'sometimes|integer',
            'reorder_level' => 'sometimes|integer',
            'status' => 'sometimes|string|in:Active,Inactive,Out of Stock'
        ]);

        $newCost = isset($validated['cost_price']) ? $validated['cost_price'] : $product->cost_price;
        $newPrice = isset($validated['current_price']) ? $validated['current_price'] : $product->current_price;

        if ($newPrice < $newCost) {
            return response()->json(['message' => "Selling price ({$newPrice}) cannot be lower than cost price ({$newCost})."], 422);
        }

        DB::beginTransaction();
        try {
            // Xử lý Lịch sử Giá (Price History)
            if (isset($validated['current_price']) && $validated['current_price'] != $product->current_price) {
                DB::table('price_history')->insert([
                    'product_id' => $id,
                    'old_price' => $product->current_price,
                    'new_price' => $validated['current_price'],
                    'changed_by' => $request->user()->id,
                    'reason' => $request->input('reason', 'Manual Update by Admin'),
                    'changed_at' => now()
                ]);
            }

            // Xử lý Lịch sử Tồn kho (Inventory Transactions) - Tăng/Giảm
            if (isset($validated['stock_quantity']) && $validated['stock_quantity'] != $product->stock_quantity) {
                $diff = $validated['stock_quantity'] - $product->stock_quantity;
                DB::table('inventory_transactions')->insert([
                    'product_id' => $id,
                    'user_id' => $request->user()->id,
                    'type' => $diff > 0 ? 'IN' : 'OUT',
                    'quantity' => abs($diff),
                    'reference_type' => 'adjustment',
                    'note' => 'Manual Stock Update',
                    'created_at' => now()
                ]);
            }

            $validated['updated_at'] = now();
            DB::table('products')->where('id', $id)->update($validated);

            DB::commit();
            return response()->json(['message' => 'Product updated successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error updating product', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin can delete products.'], 403);
        }
        
        $product = DB::table('products')->where('id', $id)->first();
        if (!$product) {
            return response()->json(['message' => 'Product not found'], 404);
        }

        // 1. Check order_details
        $hasOrders = DB::table('order_details')->where('product_id', $id)->exists();
        if ($hasOrders) {
            return response()->json(['message' => 'Cannot delete product because it has associated orders. Please change its status to Inactive instead.'], 400);
        }

        // 2. Check promotion_products with Active promotion
        $hasActivePromo = DB::table('promotion_products')
            ->join('promotions', 'promotion_products.promotion_id', '=', 'promotions.id')
            ->where('promotion_products.product_id', $id)
            ->where('promotions.status', 'Active')
            ->exists();
            
        if ($hasActivePromo) {
            return response()->json(['message' => 'Cannot delete product because it is part of an Active promotion. Please change its status to Inactive instead or remove it from the promotion.'], 400);
        }

        DB::table('products')->where('id', $id)->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    // Reference Data APIs
    public function getCategories()
    {
        return response()->json(DB::table('categories')->select('id', 'name')->orderBy('name')->get());
    }

    public function getBrands()
    {
        return response()->json(DB::table('brands')->select('id', 'name')->orderBy('name')->get());
    }

    public function getSuppliers()
    {
        return response()->json(DB::table('suppliers')->select('id', 'name')->orderBy('name')->get());
    }
}
