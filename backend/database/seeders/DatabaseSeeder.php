<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Clear existing data
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        $tables = [
            'recommendations', 'revenue_daily', 'payments', 'order_details', 'orders',
            'promotion_products', 'promotions', 'price_history', 'inventory_transactions',
            'customer_segments', 'customers', 'product_images', 'products',
            'suppliers', 'brands', 'categories', 'users', 'roles'
        ];
        foreach ($tables as $table) {
            DB::table($table)->truncate();
        }
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. Roles & Users
        $roleAdmin = DB::table('roles')->insertGetId(['name' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $roleManager = DB::table('roles')->insertGetId(['name' => 'manager', 'created_at' => now(), 'updated_at' => now()]);
        $roleStaff = DB::table('roles')->insertGetId(['name' => 'staff', 'created_at' => now(), 'updated_at' => now()]);

        DB::table('users')->insert([
            ['role_id' => $roleAdmin, 'name' => 'Admin User', 'email' => 'admin@srms.com', 'password' => Hash::make('password'), 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['role_id' => $roleManager, 'name' => 'Manager User', 'email' => 'manager@srms.com', 'password' => Hash::make('password'), 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['role_id' => $roleStaff, 'name' => 'Staff 1', 'email' => 'staff1@srms.com', 'password' => Hash::make('password'), 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
            ['role_id' => $roleStaff, 'name' => 'Staff 2', 'email' => 'staff2@srms.com', 'password' => Hash::make('password'), 'status' => 'Active', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $staffIds = [3, 4];

        // 3. Catalog Base
        $catElectronics = DB::table('categories')->insertGetId(['name' => 'Electronics', 'created_at' => now(), 'updated_at' => now()]);
        $catFashion = DB::table('categories')->insertGetId(['name' => 'Fashion', 'created_at' => now(), 'updated_at' => now()]);
        $brandApple = DB::table('brands')->insertGetId(['name' => 'Apple', 'created_at' => now(), 'updated_at' => now()]);
        $brandNike = DB::table('brands')->insertGetId(['name' => 'Nike', 'created_at' => now(), 'updated_at' => now()]);
        $supplierA = DB::table('suppliers')->insertGetId(['name' => 'Supplier A', 'created_at' => now(), 'updated_at' => now()]);

        // 4. Products (50 items)
        $products = [];
        $fastMovingIds = [];
        $slowMovingIds = [];
        $runningInventory = []; // Tracker for stock depletion
        
        for ($i = 1; $i <= 50; $i++) {
            $isFast = ($i <= 10);
            $isSlow = ($i >= 41);
            
            $cost = rand(100, 500) * 1000;
            $margin = rand(20, 50) / 100;
            $base = $cost * (1 + $margin);
            
            // Fast moving gets huge initial stock, slow gets moderate
            $initialStock = $isSlow ? rand(200, 500) : ($isFast ? rand(2000, 5000) : rand(500, 1500));
            
            $pid = DB::table('products')->insertGetId([
                'category_id' => $isFast ? $catElectronics : $catFashion,
                'brand_id' => $isFast ? $brandApple : $brandNike,
                'supplier_id' => $supplierA,
                'name' => 'Product ' . $i . ($isFast ? ' (Best)' : ($isSlow ? ' (Slow)' : '')),
                'sku' => 'SKU-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'cost_price' => $cost,
                'base_price' => $base,
                'current_price' => $base,
                'stock_quantity' => $initialStock, // Will be updated at the end
                'reorder_level' => 50,
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            DB::table('inventory_transactions')->insert([
                'product_id' => $pid,
                'type' => 'IN',
                'quantity' => $initialStock,
                'reference_type' => 'adjustment',
                'note' => 'Initial Stock',
                'created_at' => Carbon::now()->subYear()->startOfDay()
            ]);

            $products[$pid] = ['id' => $pid, 'cost' => $cost, 'price' => $base];
            $runningInventory[$pid] = $initialStock;

            if ($isFast) $fastMovingIds[] = $pid;
            if ($isSlow) $slowMovingIds[] = $pid;
        }

        // 5. Promotions
        $promotions = [];
        for ($i = 1; $i <= 20; $i++) {
            $isFailed = ($i <= 5);
            $start = Carbon::now()->subMonths(rand(1, 11))->startOfDay();
            $end = (clone $start)->addDays(rand(7, 30))->endOfDay();
            $discountVal = $isFailed ? rand(40, 60) : rand(10, 20); // Actual discount percentage

            $promoId = DB::table('promotions')->insertGetId([
                'name' => ($isFailed ? 'Failed Promo ' : 'Mega Sale ') . $i,
                'discount_type' => 'PERCENT',
                'discount_value' => $discountVal,
                'start_date' => $start,
                'end_date' => $end,
                'status' => $end < now() ? 'Expired' : 'Active',
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            $promoProductIds = array_rand($products, rand(2, 5));
            $promoProductIds = is_array($promoProductIds) ? $promoProductIds : [$promoProductIds];
            
            foreach($promoProductIds as $ppid) {
                DB::table('promotion_products')->insert(['promotion_id' => $promoId, 'product_id' => $ppid]);
            }
            
            $promotions[] = [
                'id' => $promoId,
                'is_failed' => $isFailed,
                'start' => $start,
                'end' => $end,
                'products' => $promoProductIds,
                'discount_value' => $discountVal
            ];
        }

        // 6. Customers (200)
        $customerIds = [];
        for ($i = 1; $i <= 200; $i++) {
            $customerIds[] = DB::table('customers')->insertGetId([
                'name' => 'Customer ' . $i,
                'email' => 'customer'.$i.'@example.com',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        // 7. Orders Simulation
        $ordersData = [];
        $orderDetailsData = [];
        $paymentsData = [];
        $inventoryOutData = [];
        
        $startDate = Carbon::now()->subYear()->startOfDay();
        $endDate = Carbon::now();
        $currentDate = clone $startDate;
        $orderId = 1;
        
        $productKeys = array_keys($products);

        while ($currentDate <= $endDate) {
            $month = $currentDate->month;
            $baseOrders = rand(2, 6);
            if (in_array($month, [11, 12])) $baseOrders = rand(10, 20); 
            if (in_array($month, [2, 3])) $baseOrders = rand(0, 2);
            
            for ($o = 0; $o < $baseOrders; $o++) {
                $cid = (rand(1, 100) <= 80) ? $customerIds[array_rand(array_slice($customerIds, 0, 40))] : $customerIds[array_rand($customerIds)];
                
                $orderTotal = 0;
                $orderDiscount = 0;
                $orderProfit = 0;
                $lines = rand(1, 3);
                
                $orderDate = $currentDate->copy()->addHours(rand(8, 20));
                $orderDateStr = $orderDate->format('Y-m-d H:i:s'); // Format to string to prevent mutation bug!
                $details = [];

                for ($l = 0; $l < $lines; $l++) {
                    $randRoll = rand(1, 100);
                    if ($randRoll <= 60) $selectedPid = $fastMovingIds[array_rand($fastMovingIds)];
                    elseif ($randRoll <= 90) {
                        do { $selectedPid = $productKeys[array_rand($productKeys)]; } while (in_array($selectedPid, $fastMovingIds) || in_array($selectedPid, $slowMovingIds));
                    } else $selectedPid = $slowMovingIds[array_rand($slowMovingIds)];
                    
                    // Skip if out of stock
                    if ($runningInventory[$selectedPid] <= 0) continue;

                    $product = $products[$selectedPid];
                    $qty = min(rand(1, 3), $runningInventory[$selectedPid]); 
                    $runningInventory[$selectedPid] -= $qty; // Deplete inventory
                    
                    $appliedPromo = null;
                    foreach ($promotions as $promo) {
                        if ($orderDate >= $promo['start'] && $orderDate <= $promo['end'] && in_array($selectedPid, $promo['products'])) {
                            if ($promo['is_failed'] && rand(1, 100) <= 85) continue;
                            $appliedPromo = $promo;
                            break;
                        }
                    }
                    
                    $unitPrice = $product['price'];
                    $discountAmt = 0;
                    if ($appliedPromo) {
                        // Apply exact discount from DB
                        $discountAmt = ($unitPrice * $qty) * ($appliedPromo['discount_value'] / 100);
                    }
                    
                    $lineTotal = ($unitPrice * $qty) - $discountAmt;
                    $lineProfit = $lineTotal - ($product['cost'] * $qty);
                    
                    $orderTotal += ($unitPrice * $qty);
                    $orderDiscount += $discountAmt;
                    $orderProfit += $lineProfit;
                    
                    $details[] = [
                        'order_id' => $orderId,
                        'product_id' => $selectedPid,
                        'promotion_id' => $appliedPromo ? $appliedPromo['id'] : null,
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'cost_price' => $product['cost'],
                        'discount_amount' => $discountAmt,
                        'total' => $lineTotal,
                        'profit' => $lineProfit
                    ];

                    $inventoryOutData[] = [
                        'product_id' => $selectedPid,
                        'type' => 'OUT',
                        'quantity' => $qty,
                        'reference_type' => 'order',
                        'reference_id' => $orderId,
                        'note' => 'Order ' . $orderId,
                        'created_at' => $orderDateStr
                    ];
                }
                
                if (count($details) == 0) continue;

                $ordersData[] = [
                    'id' => $orderId,
                    'customer_id' => $cid,
                    'staff_id' => $staffIds[array_rand($staffIds)],
                    'total_amount' => $orderTotal,
                    'discount_amount' => $orderDiscount,
                    'final_amount' => $orderTotal - $orderDiscount,
                    'status' => 'Completed',
                    'order_date' => $orderDateStr,
                    'created_at' => $orderDateStr,
                    'updated_at' => $orderDateStr
                ];
                
                $orderDetailsData = array_merge($orderDetailsData, $details);
                
                $paymentsData[] = [
                    'order_id' => $orderId,
                    'payment_method' => 'Bank Transfer',
                    'amount' => $orderTotal - $orderDiscount,
                    'status' => 'Paid',
                    'paid_at' => $orderDateStr,
                    'created_at' => $orderDateStr
                ];
                
                $orderId++;
            }
            $currentDate->addDay();
        }
        
        foreach (array_chunk($ordersData, 500) as $chunk) DB::table('orders')->insert($chunk);
        foreach (array_chunk($orderDetailsData, 500) as $chunk) DB::table('order_details')->insert($chunk);
        foreach (array_chunk($paymentsData, 500) as $chunk) DB::table('payments')->insert($chunk);
        foreach (array_chunk($inventoryOutData, 500) as $chunk) DB::table('inventory_transactions')->insert($chunk);
        
        // 8. Update Product Stock (based on running tally)
        foreach ($runningInventory as $pid => $finalStock) {
            DB::table('products')->where('id', $pid)->update(['stock_quantity' => $finalStock]);
        }

        // 9. Update Customer Stats
        DB::statement("
            UPDATE customers c
            LEFT JOIN (
                SELECT customer_id, SUM(final_amount) as total_spent, COUNT(id) as order_count, MAX(order_date) as last_date 
                FROM orders GROUP BY customer_id
            ) o ON c.id = o.customer_id
            SET c.total_spending = COALESCE(o.total_spent, 0), 
                c.total_orders = COALESCE(o.order_count, 0), 
                c.last_purchase_date = o.last_date
        ");
        
        // 10. Calculate RFM Segments
        $customers = DB::table('customers')->get();
        $segments = [];
        foreach ($customers as $c) {
            if (!$c->last_purchase_date) {
                // Customer with 0 orders!
                $segments[] = [
                    'customer_id' => $c->id, 'r_score' => 0, 'f_score' => 0, 'm_score' => 0,
                    'segment_name' => 'Inactive', 'is_vip' => false, 'calculated_at' => now()
                ];
                continue;
            }
            
            $daysSince = Carbon::parse($c->last_purchase_date)->diffInDays(now());
            
            $r = $daysSince <= 30 ? 5 : ($daysSince <= 90 ? 4 : ($daysSince <= 180 ? 3 : ($daysSince <= 365 ? 2 : 1)));
            $f = $c->total_orders >= 15 ? 5 : ($c->total_orders >= 8 ? 4 : ($c->total_orders >= 4 ? 3 : ($c->total_orders >= 2 ? 2 : 1)));
            $m = $c->total_spending >= 50000000 ? 5 : ($c->total_spending >= 20000000 ? 4 : ($c->total_spending >= 5000000 ? 3 : 2));
            
            $segment = 'Average';
            $isVip = false;
            if ($r >= 4 && $f >= 4 && $m >= 4) { $segment = 'Champions'; $isVip = true; }
            elseif ($r <= 2 && $f >= 3) { $segment = 'At Risk'; }
            elseif ($r == 1) { $segment = 'Lost'; }
            elseif ($f >= 3) { $segment = 'Loyal'; $isVip = ($m >= 4); }
            elseif ($r >= 4) { $segment = 'Recent'; }
            
            $segments[] = [
                'customer_id' => $c->id, 'r_score' => $r, 'f_score' => $f, 'm_score' => $m,
                'segment_name' => $segment, 'is_vip' => $isVip, 'calculated_at' => now()
            ];
        }
        foreach (array_chunk($segments, 500) as $chunk) DB::table('customer_segments')->insert($chunk);

        // 11. Generate Daily Revenue
        DB::statement("
            INSERT INTO revenue_daily (date, total_revenue, total_profit, total_orders)
            SELECT DATE(order_date), SUM(final_amount), SUM((SELECT SUM(profit) FROM order_details WHERE order_id = orders.id)), COUNT(id)
            FROM orders WHERE status = 'Completed' GROUP BY DATE(order_date)
        ");

        // 12. Generate AI Recommendations
        DB::table('recommendations')->insert([
            ['type' => 'Inventory', 'target_type' => 'product', 'target_id' => $slowMovingIds[0], 'reason' => 'Inventory > 200 while monthly sales < 5. High dead-stock risk.', 'recommended_action' => 'Apply 20% clearance discount', 'status' => 'Pending', 'generated_at' => now()],
            ['type' => 'Pricing', 'target_type' => 'product', 'target_id' => $fastMovingIds[0], 'reason' => 'High demand, stock dropping rapidly. Competitor prices are 10% higher.', 'recommended_action' => 'Increase base price by 5% to maximize margin', 'status' => 'Pending', 'generated_at' => now()],
            ['type' => 'Customer', 'target_type' => 'customer', 'target_id' => $customerIds[0], 'reason' => 'VIP Customer drifting into At Risk segment (No purchase in 90 days).', 'recommended_action' => 'Send personalized 15% win-back voucher', 'status' => 'Pending', 'generated_at' => now()]
        ]);
    }
}
