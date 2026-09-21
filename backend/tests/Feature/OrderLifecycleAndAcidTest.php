<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Carbon\Carbon;

class OrderLifecycleAndAcidTest extends TestCase
{
    use DatabaseTransactions;

    protected $staff;
    protected $manager;
    protected $admin;
    protected $product;
    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();

        $this->staff = User::where('email', 'staff1@srms.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@srms.com')->firstOrFail();
        $this->admin = User::where('email', 'admin@srms.com')->firstOrFail();

        $this->customer = DB::table('customers')->first();
        $this->product = DB::table('products')->where('stock_quantity', '>', 50)->first();
    }

    /**
     * Test Staff can create a Pending order with promotion discount.
     * Price is locked from products table to prevent client tampering.
     * Stock is NOT deducted in Pending status.
     */
    public function test_staff_can_create_pending_order_with_promotion_discount(): void
    {
        Sanctum::actingAs($this->staff, ['*']);

        // Create an active promotion for this product
        $promoId = DB::table('promotions')->insertGetId([
            'name' => '10% Off Test Promo',
            'discount_type' => 'PERCENT',
            'discount_value' => 10,
            'start_date' => Carbon::now()->subDays(2),
            'end_date' => Carbon::now()->addDays(5),
            'status' => 'Active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $initialStock = $this->product->stock_quantity;
        $orderQty = 2;
        $expectedTotal = $this->product->current_price * $orderQty;
        $expectedDiscount = $expectedTotal * 0.10;
        $expectedFinal = $expectedTotal - $expectedDiscount;

        $response = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => $orderQty,
                    'unit_price' => 999999, // Attempted tamper: should be ignored and locked to current_price
                    'promotion_id' => $promoId,
                ]
            ]
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'id']);

        $orderId = $response->json('id');
        $order = DB::table('orders')->where('id', $orderId)->first();

        $this->assertEquals('Pending', $order->status);
        $this->assertEquals($expectedTotal, (float) $order->total_amount);
        $this->assertEquals($expectedDiscount, (float) $order->discount_amount);
        $this->assertEquals($expectedFinal, (float) $order->final_amount);

        // Verify stock quantity was NOT deducted yet
        $freshProduct = DB::table('products')->where('id', $this->product->id)->first();
        $this->assertEquals($initialStock, $freshProduct->stock_quantity);
    }

    /**
     * Test order transition to Completed:
     * - Atomically deducts stock from products table
     * - Inserts inventory_transactions OUT row
     * - Increments customer total_spending and total_orders
     * - Updates revenue_daily for order_date
     */
    public function test_order_completion_triggers_atomic_inventory_deduction_and_revenue_update(): void
    {
        Sanctum::actingAs($this->staff, ['*']);

        $initialStock = $this->product->stock_quantity;
        $orderQty = 3;

        // Create Pending order
        $createRes = $this->postJson('/api/orders', [
            'customer_id' => $this->customer->id,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => $orderQty,
                    'unit_price' => $this->product->current_price,
                ]
            ]
        ]);
        $orderId = $createRes->json('id');
        $order = DB::table('orders')->where('id', $orderId)->first();
        $orderDate = Carbon::parse($order->order_date)->toDateString();

        $initialCustomerSpending = (float) DB::table('customers')->where('id', $this->customer->id)->value('total_spending');
        $initialCustomerOrders = (int) DB::table('customers')->where('id', $this->customer->id)->value('total_orders');
        $initialDailyRevenue = (float) (DB::table('revenue_daily')->where('date', $orderDate)->value('total_revenue') ?? 0);

        // Transition to Completed
        $updateRes = $this->putJson("/api/orders/{$orderId}", [
            'status' => 'Completed'
        ]);

        $updateRes->assertStatus(200);

        // 1. Assert inventory deducted
        $freshProduct = DB::table('products')->where('id', $this->product->id)->first();
        $this->assertEquals($initialStock - $orderQty, $freshProduct->stock_quantity);

        // 2. Assert inventory_transactions has OUT record
        $outTx = DB::table('inventory_transactions')
            ->where('product_id', $this->product->id)
            ->where('reference_type', 'order')
            ->where('reference_id', $orderId)
            ->where('type', 'OUT')
            ->first();
        $this->assertNotNull($outTx);
        $this->assertEquals($orderQty, $outTx->quantity);

        // 3. Assert customer metrics updated
        $freshCustomer = DB::table('customers')->where('id', $this->customer->id)->first();
        $this->assertEquals($initialCustomerSpending + $order->final_amount, (float) $freshCustomer->total_spending);
        $this->assertEquals($initialCustomerOrders + 1, $freshCustomer->total_orders);

        // 4. Assert revenue_daily updated
        $freshDaily = DB::table('revenue_daily')->where('date', $orderDate)->first();
        $this->assertNotNull($freshDaily);
        $this->assertEquals($initialDailyRevenue + $order->final_amount, (float) $freshDaily->total_revenue);
    }

    /**
     * Test order completion rollback on insufficient stock:
     * - Fails with 422
     * - Entire transaction rolls back; stock is untouched
     */
    public function test_order_completion_rolls_back_on_insufficient_stock(): void
    {
        Sanctum::actingAs($this->admin, ['*']);

        // Set low stock for testing
        DB::table('products')->where('id', $this->product->id)->update(['stock_quantity' => 2]);

        // Create order requesting 10 units
        $orderId = DB::table('orders')->insertGetId([
            'customer_id' => $this->customer->id,
            'staff_id' => $this->admin->id,
            'total_amount' => $this->product->current_price * 10,
            'discount_amount' => 0,
            'final_amount' => $this->product->current_price * 10,
            'status' => 'Pending',
            'order_date' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('order_details')->insert([
            'order_id' => $orderId,
            'product_id' => $this->product->id,
            'quantity' => 10,
            'unit_price' => $this->product->current_price,
            'cost_price' => $this->product->cost_price,
            'discount_amount' => 0,
            'total' => $this->product->current_price * 10,
            'profit' => ($this->product->current_price - $this->product->cost_price) * 10,
        ]);

        // Attempt completion
        $response = $this->putJson("/api/orders/{$orderId}", [
            'status' => 'Completed'
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment(['message' => 'Error updating order']);

        // Assert product stock remains 2
        $freshProduct = DB::table('products')->where('id', $this->product->id)->first();
        $this->assertEquals(2, $freshProduct->stock_quantity);

        // Assert order status remains Pending
        $freshOrder = DB::table('orders')->where('id', $orderId)->first();
        $this->assertEquals('Pending', $freshOrder->status);
    }

    /**
     * Test Refund with a specific past order_date (e.g. 2026-08-15).
     * Guards explicitly against regression where revenue_daily updateOrInsert failed
     * on historical/past dates.
     * Verifies:
     * - Stock is incremented back (restocked)
     * - inventory_transactions IN logged
     * - Customer total_spending is decremented
     * - revenue_daily for that specific past date is decremented
     */
    public function test_order_refund_on_past_date_restores_inventory_and_reverts_revenue_daily(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        // Explicit past date
        $pastDate = '2026-08-15';
        $orderQty = 4;
        $unitPrice = (float) $this->product->current_price;
        $costPrice = (float) $this->product->cost_price;
        $totalAmount = $unitPrice * $orderQty;
        $profit = ($unitPrice - $costPrice) * $orderQty;

        // Ensure revenue_daily exists for pastDate with initial baseline
        $initialDaily = DB::table('revenue_daily')->where('date', $pastDate)->first();
        if (!$initialDaily) {
            DB::table('revenue_daily')->insert([
                'date' => $pastDate,
                'total_revenue' => 10000000,
                'total_profit' => 3000000,
                'total_orders' => 10,
                'created_at' => Carbon::parse($pastDate),
                'updated_at' => Carbon::parse($pastDate),
            ]);
        }

        // 1. Create a Completed order situated on pastDate
        $orderId = DB::table('orders')->insertGetId([
            'customer_id' => $this->customer->id,
            'staff_id' => $this->manager->id,
            'total_amount' => $totalAmount,
            'discount_amount' => 0,
            'final_amount' => $totalAmount,
            'status' => 'Completed',
            'order_date' => Carbon::parse($pastDate),
            'created_at' => Carbon::parse($pastDate),
            'updated_at' => Carbon::parse($pastDate),
        ]);

        DB::table('order_details')->insert([
            'order_id' => $orderId,
            'product_id' => $this->product->id,
            'quantity' => $orderQty,
            'unit_price' => $unitPrice,
            'cost_price' => $costPrice,
            'discount_amount' => 0,
            'total' => $totalAmount,
            'profit' => $profit,
        ]);

        // Reflect this completed order into customer spending and revenue_daily on pastDate
        DB::table('customers')->where('id', $this->customer->id)->increment('total_spending', $totalAmount);
        DB::table('customers')->where('id', $this->customer->id)->increment('total_orders', 1);
        DB::table('revenue_daily')->where('date', $pastDate)->update([
            'total_revenue' => DB::raw("total_revenue + {$totalAmount}"),
            'total_profit' => DB::raw("total_profit + {$profit}"),
            'total_orders' => DB::raw("total_orders + 1"),
            'updated_at' => Carbon::parse($pastDate),
        ]);

        // Capture snapshot before refund
        $stockBeforeRefund = (int) DB::table('products')->where('id', $this->product->id)->value('stock_quantity');
        $customerSpendingBeforeRefund = (float) DB::table('customers')->where('id', $this->customer->id)->value('total_spending');
        $customerOrdersBeforeRefund = (int) DB::table('customers')->where('id', $this->customer->id)->value('total_orders');
        $dailyRevenueBeforeRefund = (float) DB::table('revenue_daily')->where('date', $pastDate)->value('total_revenue');
        $dailyOrdersBeforeRefund = (int) DB::table('revenue_daily')->where('date', $pastDate)->value('total_orders');

        // 2. Perform Refund via API as Manager
        $refundResponse = $this->putJson("/api/orders/{$orderId}", [
            'status' => 'Refunded'
        ]);

        $refundResponse->assertStatus(200)
            ->assertJson([
                'message' => 'Order status updated to Refunded'
            ]);

        // 3. Verify stock is restored (+ orderQty)
        $stockAfterRefund = (int) DB::table('products')->where('id', $this->product->id)->value('stock_quantity');
        $this->assertEquals($stockBeforeRefund + $orderQty, $stockAfterRefund);

        // 4. Verify inventory_transactions IN logged
        $inTx = DB::table('inventory_transactions')
            ->where('product_id', $this->product->id)
            ->where('reference_type', 'order')
            ->where('reference_id', $orderId)
            ->where('type', 'IN')
            ->first();
        $this->assertNotNull($inTx);
        $this->assertEquals($orderQty, $inTx->quantity);
        $this->assertStringContainsString('refunded', strtolower($inTx->note));

        // 5. Verify customer metrics reverted
        $customerSpendingAfterRefund = (float) DB::table('customers')->where('id', $this->customer->id)->value('total_spending');
        $customerOrdersAfterRefund = (int) DB::table('customers')->where('id', $this->customer->id)->value('total_orders');
        $this->assertEquals($customerSpendingBeforeRefund - $totalAmount, $customerSpendingAfterRefund);
        $this->assertEquals($customerOrdersBeforeRefund - 1, $customerOrdersAfterRefund);

        // 6. Verify revenue_daily for the specific pastDate reverted
        $dailyRevenueAfterRefund = (float) DB::table('revenue_daily')->where('date', $pastDate)->value('total_revenue');
        $dailyOrdersAfterRefund = (int) DB::table('revenue_daily')->where('date', $pastDate)->value('total_orders');
        $this->assertEquals($dailyRevenueBeforeRefund - $totalAmount, $dailyRevenueAfterRefund);
        $this->assertEquals($dailyOrdersBeforeRefund - 1, $dailyOrdersAfterRefund);
    }
}
