<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\DB;

class Rbac5RolesAndActivityLogTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Test Director role can view all analytical and operational read endpoints.
     */
    public function test_director_has_read_only_access_to_all_modules(): void
    {
        $director = User::where('email', 'director@srms.com')->firstOrFail();
        Sanctum::actingAs($director, ['*']);

        // 1. Can view Dashboard
        $this->getJson('/api/dashboard/kpis')->assertStatus(200);
        $this->getJson('/api/dashboard/chart')->assertStatus(200);

        // 2. Can view Analytics (Revenue, Products, Customers)
        $this->getJson('/api/analytics/revenue')->assertStatus(200);
        $this->getJson('/api/analytics/products')->assertStatus(200);
        $this->getJson('/api/analytics/customers')->assertStatus(200);

        // 3. Can view Forecast & Insights
        $this->getJson('/api/forecast')->assertStatus(200);
        $this->getJson('/api/insights')->assertStatus(200);

        // 4. Can view Recommendations
        $this->getJson('/api/recommendations')->assertStatus(200);

        // 5. Can view Products, Inventory, Orders, Promotions
        $this->getJson('/api/products')->assertStatus(200);
        $this->getJson('/api/inventory')->assertStatus(200);
        $this->getJson('/api/orders')->assertStatus(200);
        $this->getJson('/api/promotions')->assertStatus(200);

        // 6. Can view Activity Logs
        $this->getJson('/api/activity-logs')->assertStatus(200);
    }

    /**
     * Test Director role is strictly forbidden from any mutating action.
     */
    public function test_director_is_strictly_forbidden_from_mutating_actions(): void
    {
        $director = User::where('email', 'director@srms.com')->firstOrFail();
        Sanctum::actingAs($director, ['*']);

        // 1. Cannot adjust inventory
        $this->postJson('/api/inventory/1/adjust', [
            'type' => 'IN',
            'quantity' => 10,
            'note' => 'Unauthorized adjustment'
        ])->assertStatus(403);

        // 2. Cannot create or edit orders
        $this->postJson('/api/orders', [
            'customer_id' => 1,
            'items' => [['product_id' => 1, 'quantity' => 1, 'price' => 100000]],
            'payment_method' => 'card'
        ])->assertStatus(403);

        $this->putJson('/api/orders/1', [
            'status' => 'Cancelled'
        ])->assertStatus(403);

        // 3. Cannot apply recommendation
        $this->postJson('/api/recommendations/1/apply')->assertStatus(403);

        // 4. Cannot create promotion
        $this->postJson('/api/promotions', [
            'name' => 'Unauthorized Promo',
            'discount_type' => 'PERCENT',
            'discount_value' => 10,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(7)->toDateString()
        ])->assertStatus(403);

        // 5. Cannot create customer
        $this->postJson('/api/customers', [
            'name' => 'Unauthorized Customer',
            'phone' => '0999999999'
        ])->assertStatus(403);

        // 6. Cannot update customer
        $this->putJson('/api/customers/1', [
            'name' => 'Unauthorized Update'
        ])->assertStatus(403);
    }

    /**
     * Test Customer Service role can only access Customer Analytics and Customer Detail/Update.
     */
    public function test_customer_service_restricted_to_customer_modules(): void
    {
        $cs = User::where('email', 'cs@srms.com')->firstOrFail();
        Sanctum::actingAs($cs, ['*']);

        // Permitted: Customer Analytics
        $this->getJson('/api/analytics/customers')->assertStatus(200);

        // Permitted: View Customer Detail
        $this->getJson('/api/customers/1')->assertStatus(200);

        // Permitted: Update Customer Contact Info
        $this->putJson('/api/customers/1', [
            'phone' => '0988776655',
            'address' => '456 CS Updated Street'
        ])->assertStatus(200);

        // Forbidden: Customer Registration (Staff/Manager/Admin only)
        $this->postJson('/api/customers', [
            'name' => 'CS Created Customer',
            'phone' => '0911223344'
        ])->assertStatus(403);

        // Forbidden: All other modules
        $this->getJson('/api/dashboard/kpis')->assertStatus(403);
        $this->getJson('/api/analytics/revenue')->assertStatus(403);
        $this->getJson('/api/analytics/products')->assertStatus(403);
        $this->getJson('/api/forecast')->assertStatus(403);
        $this->getJson('/api/recommendations')->assertStatus(403);
        $this->getJson('/api/products')->assertStatus(403);
        $this->getJson('/api/inventory')->assertStatus(403);
        $this->getJson('/api/orders')->assertStatus(403);
        $this->getJson('/api/promotions')->assertStatus(403);
        $this->getJson('/api/activity-logs')->assertStatus(403);
    }

    /**
     * Test Activity Log records actions on Order Refund, Recommendation Apply, and Promotion Create.
     */
    public function test_activity_logging_on_critical_manager_actions(): void
    {
        $manager = User::where('email', 'manager@srms.com')->firstOrFail();
        Sanctum::actingAs($manager, ['*']);

        // 1. Create a Promotion as Manager
        $promoResp = $this->postJson('/api/promotions', [
            'name' => 'RBAC Test Promo ' . uniqid(),
            'discount_type' => 'PERCENT',
            'discount_value' => 15,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'status' => 'Active',
            'product_ids' => [1]
        ]);
        $promoResp->assertStatus(201);
        $promoId = $promoResp->json('id');

        // Check activity log exists for promotion.created
        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $manager->id,
            'action' => 'promotion.created',
            'subject_type' => 'promotion',
            'subject_id' => $promoId
        ]);

        // 2. Apply a recommendation as Manager
        $recId = DB::table('recommendations')->where('status', 'Pending')->value('id');
        if ($recId) {
            $applyResp = $this->postJson("/api/recommendations/{$recId}/apply");
            $applyResp->assertStatus(200);

            $this->assertDatabaseHas('activity_logs', [
                'user_id' => $manager->id,
                'action' => 'recommendation.applied',
                'subject_type' => 'recommendation',
                'subject_id' => $recId
            ]);

            $this->assertDatabaseHas('recommendations', [
                'id' => $recId,
                'status' => 'Applied',
                'resolved_by' => $manager->id
            ]);
        }

        // 3. Director can view the activity log
        $director = User::where('email', 'director@srms.com')->firstOrFail();
        Sanctum::actingAs($director, ['*']);

        $logResp = $this->getJson('/api/activity-logs?subject_type=promotion');
        $logResp->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'user_id', 'user_name', 'action', 'subject_type', 'subject_id', 'description', 'created_at']
                ]
            ]);

        $logs = collect($logResp->json('data'));
        $this->assertTrue($logs->contains('subject_id', $promoId));
    }
}
