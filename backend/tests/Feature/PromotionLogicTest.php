<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Carbon\Carbon;

class PromotionLogicTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;
    protected $manager;
    protected $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::where('email', 'admin@srms.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@srms.com')->firstOrFail();
        $this->staff = User::where('email', 'staff1@srms.com')->firstOrFail();
    }

    /**
     * Test promotion discount calculation during order placement:
     * - PERCENT discount
     * - FIXED discount
     */
    public function test_promotion_discount_calculation_percent_and_fixed(): void
    {
        Sanctum::actingAs($this->staff, ['*']);
        $customer = DB::table('customers')->first();
        $product = DB::table('products')->first();

        // 1. Create PERCENT promotion (15%)
        $percentPromoId = DB::table('promotions')->insertGetId([
            'name' => '15% Off Promo',
            'discount_type' => 'PERCENT',
            'discount_value' => 15,
            'start_date' => Carbon::now()->subDays(1),
            'end_date' => Carbon::now()->addDays(10),
            'status' => 'Active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resPercent = $this->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'unit_price' => $product->current_price,
                    'promotion_id' => $percentPromoId,
                ]
            ]
        ]);
        $resPercent->assertStatus(201);
        $orderPercent = DB::table('orders')->where('id', $resPercent->json('id'))->first();
        $expectedPercentTotal = $product->current_price * 2;
        $expectedPercentDiscount = $expectedPercentTotal * 0.15;
        $this->assertEquals($expectedPercentDiscount, (float) $orderPercent->discount_amount);
        $this->assertEquals($expectedPercentTotal - $expectedPercentDiscount, (float) $orderPercent->final_amount);

        // 2. Create FIXED promotion (50,000 VND per unit)
        $fixedPromoId = DB::table('promotions')->insertGetId([
            'name' => '50k Off Promo',
            'discount_type' => 'FIXED',
            'discount_value' => 50000,
            'start_date' => Carbon::now()->subDays(1),
            'end_date' => Carbon::now()->addDays(10),
            'status' => 'Active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resFixed = $this->postJson('/api/orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 3,
                    'unit_price' => $product->current_price,
                    'promotion_id' => $fixedPromoId,
                ]
            ]
        ]);
        $resFixed->assertStatus(201);
        $orderFixed = DB::table('orders')->where('id', $resFixed->json('id'))->first();
        $expectedFixedTotal = $product->current_price * 3;
        $expectedFixedDiscount = 50000 * 3;
        $this->assertEquals($expectedFixedDiscount, (float) $orderFixed->discount_amount);
        $this->assertEquals($expectedFixedTotal - $expectedFixedDiscount, (float) $orderFixed->final_amount);
    }

    /**
     * Test integrity check: Cannot hard-delete promotion if associated with existing orders.
     * System instructs user to transition to Expired instead.
     */
    public function test_promotion_cannot_be_deleted_if_associated_with_orders(): void
    {
        Sanctum::actingAs($this->admin, ['*']);

        // Find a promotion that has order_details
        $promoWithOrder = DB::table('order_details')
            ->whereNotNull('promotion_id')
            ->first();

        $this->assertNotNull($promoWithOrder, 'Seeder should have promotions associated with orders');
        $promoId = $promoWithOrder->promotion_id;

        $response = $this->deleteJson("/api/promotions/{$promoId}");

        $response->assertStatus(400)
            ->assertJsonFragment([
                'message' => 'Cannot delete promotion because it has associated orders. Please change its status to Expired instead.'
            ]);

        // Verify promotion still exists in DB
        $exists = DB::table('promotions')->where('id', $promoId)->exists();
        $this->assertTrue($exists);
    }

    /**
     * Test promotion can be deleted cleanly if no orders are attached to it.
     */
    public function test_promotion_can_be_deleted_if_not_associated_with_orders(): void
    {
        Sanctum::actingAs($this->admin, ['*']);

        $promoId = DB::table('promotions')->insertGetId([
            'name' => 'Temporary Standalone Promo',
            'discount_type' => 'PERCENT',
            'discount_value' => 5,
            'start_date' => Carbon::now(),
            'end_date' => Carbon::now()->addDays(3),
            'status' => 'Draft',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->deleteJson("/api/promotions/{$promoId}");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Promotion deleted successfully'
            ]);

        $exists = DB::table('promotions')->where('id', $promoId)->exists();
        $this->assertFalse($exists);
    }

    /**
     * Test promotion list and KPIs guard against division by zero
     * when discount is 0 (rev_discount_ratio returns 0, margin calculated safely).
     */
    public function test_promotions_kpis_and_ratio_guard_division_by_zero(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        // 1. Check promotion KPIs endpoint
        $kpisResponse = $this->getJson('/api/promotions/kpis');
        $kpisResponse->assertStatus(200)
            ->assertJsonStructure([
                'active_promotions',
                'revenue_from_promotions',
                'discount_cost',
                'rev_discount_ratio',
                'profit_impact',
                'margin',
                'net_roi'
            ]);

        // 2. Check promotion index endpoint
        $indexResponse = $this->getJson('/api/promotions');
        $indexResponse->assertStatus(200);

        $promotions = $indexResponse->json();
        $this->assertIsArray($promotions);
        $this->assertNotEmpty($promotions);

        foreach ($promotions as $promo) {
            $this->assertArrayHasKey('margin', $promo);
            $this->assertArrayHasKey('rev_discount_ratio', $promo);
            $this->assertArrayHasKey('roi_status', $promo);
            $this->assertContains($promo['roi_status'], ['Success', 'Weak', 'Failed', 'No Data']);

            if ($promo['total_discount'] == 0) {
                $this->assertEquals(0, $promo['rev_discount_ratio']);
            }
        }
    }
}
