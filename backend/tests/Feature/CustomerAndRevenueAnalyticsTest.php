<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class CustomerAndRevenueAnalyticsTest extends TestCase
{
    use DatabaseTransactions;

    protected $manager;
    protected $staff;

    protected function setUp(): void
    {
        parent::setUp();

        $this->manager = User::where('email', 'manager@srms.com')->firstOrFail();
        $this->staff = User::where('email', 'staff1@srms.com')->firstOrFail();
    }

    /**
     * Test GET /api/customers/{id} reuses 100% of data from customers and customer_segments
     * (Single Source of Truth) without recalculating different numbers.
     */
    public function test_customer_detail_reuses_single_source_of_truth(): void
    {
        Sanctum::actingAs($this->staff, ['*']);

        // Find customer with existing segment data
        $customer = DB::table('customers')
            ->join('customer_segments', 'customers.id', '=', 'customer_segments.customer_id')
            ->where('customers.total_spending', '>', 0)
            ->select('customers.*', 'customer_segments.r_score', 'customer_segments.f_score', 'customer_segments.m_score', 'customer_segments.segment_name')
            ->first();

        $this->assertNotNull($customer);

        $response = $this->getJson("/api/customers/{$customer->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'customer' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'address',
                    'created_at',
                    'last_purchase',
                    'recency_days',
                    'total_orders',
                    'total_spent',
                    'aov',
                    'clv',
                    'segment',
                    'segment_name',
                    'status',
                    'rfm' => [
                        'r_score',
                        'f_score',
                        'm_score',
                        'is_vip',
                        'calculated_at'
                    ]
                ],
                'orders',
                'trend'
            ]);

        $data = $response->json('customer');

        // Verify metrics directly reuse customer & customer_segments tables
        $this->assertEquals((float) $customer->total_spending, (float) $data['total_spent']);
        $this->assertEquals((int) $customer->total_orders, (int) $data['total_orders']);
        $this->assertEquals($customer->segment_name, $data['segment_name']);
        $this->assertEquals($customer->r_score, $data['rfm']['r_score']);
        $this->assertEquals($customer->f_score, $data['rfm']['f_score']);
        $this->assertEquals($customer->m_score, $data['rfm']['m_score']);
    }

    /**
     * Test customer creation and update:
     * - New customer has total_spending=0, total_orders=0
     * - Automatically gets initial segment snapshot ('Recent', R=5, F=1, M=1)
     * - Update successfully persists modifications
     */
    public function test_customer_registration_initializes_segment_and_allows_updates(): void
    {
        Sanctum::actingAs($this->staff, ['*']);

        $email = 'new_customer_' . uniqid() . '@example.com';

        // 1. Create customer
        $storeRes = $this->postJson('/api/customers', [
            'name' => 'Nguyen Van Test',
            'email' => $email,
            'phone' => '0901234567',
            'address' => '123 Le Loi, Da Nang',
        ]);

        $storeRes->assertStatus(201)
            ->assertJsonStructure(['message', 'customer_id']);

        $customerId = $storeRes->json('customer_id');

        // Check customers table
        $dbCustomer = DB::table('customers')->where('id', $customerId)->first();
        $this->assertNotNull($dbCustomer);
        $this->assertEquals('Nguyen Van Test', $dbCustomer->name);
        $this->assertEquals(0, (float) $dbCustomer->total_spending);
        $this->assertEquals(0, (int) $dbCustomer->total_orders);

        // Check customer_segments table initial snapshot
        $dbSegment = DB::table('customer_segments')->where('customer_id', $customerId)->first();
        $this->assertNotNull($dbSegment);
        $this->assertEquals('Recent', $dbSegment->segment_name);
        $this->assertEquals(5, $dbSegment->r_score);
        $this->assertEquals(1, $dbSegment->f_score);
        $this->assertEquals(1, $dbSegment->m_score);

        // 2. Update customer details
        $updateRes = $this->putJson("/api/customers/{$customerId}", [
            'phone' => '0909999888',
            'address' => '456 Tran Phu, Da Nang',
        ]);

        $updateRes->assertStatus(200);

        $freshCustomer = DB::table('customers')->where('id', $customerId)->first();
        $this->assertEquals('0909999888', $freshCustomer->phone);
        $this->assertEquals('456 Tran Phu, Da Nang', $freshCustomer->address);
    }

    /**
     * Test multi-dimensional revenue analytics:
     * - Verifies 5 core KPIs
     * - Verifies monthly trend grouping by %Y-%m
     * - Verifies NO sales channel dimension is returned (schema integrity preserved)
     */
    public function test_revenue_analytics_kpis_and_no_channel_dimension(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        $response = $this->getJson('/api/analytics/revenue?range=30_days');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'range',
                'kpis',
                'monthly_trend',
                'category_revenue',
                'segment_revenue',
                'top_products'
            ]);

        $data = $response->json();

        // 1. Verify NO channel dimension exists
        $this->assertArrayNotHasKey('channel_revenue', $data);
        $this->assertArrayNotHasKey('channels', $data);
        $this->assertArrayNotHasKey('channel_breakdown', $data);

        // 2. Verify 5 core KPIs
        $kpis = collect($data['kpis'])->keyBy('id');
        $this->assertTrue($kpis->has('revenue'));
        $this->assertTrue($kpis->has('profit'));
        $this->assertTrue($kpis->has('orders'));
        $this->assertTrue($kpis->has('growth'));
        $this->assertTrue($kpis->has('margin'));

        // 3. Verify monthly trend uses period_month
        $monthlyTrend = $data['monthly_trend'];
        $this->assertIsArray($monthlyTrend);
        $this->assertNotEmpty($monthlyTrend);

        foreach ($monthlyTrend as $monthPoint) {
            $this->assertArrayHasKey('label', $monthPoint);
            $this->assertArrayHasKey('year_month', $monthPoint);
            $this->assertArrayHasKey('revenue', $monthPoint);
            $this->assertArrayHasKey('profit', $monthPoint);
            $this->assertArrayHasKey('orders', $monthPoint);
        }

        // 4. Verify category revenue breakdown
        $categoryRevenue = $data['category_revenue'];
        $this->assertIsArray($categoryRevenue);
        $this->assertNotEmpty($categoryRevenue);
    }
}
