<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;

class AuthAndRbacTest extends TestCase
{
    use DatabaseTransactions;

    /**
     * Test successful login with correct credentials.
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin@srms.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'role_id',
                    'status'
                ]
            ]);
        
        $this->assertEquals(1, $response->json('user.role_id'));
    }

    /**
     * Test login failure with incorrect credentials.
     */
    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'admin@srms.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Invalid credentials'
            ]);
    }

    /**
     * Test Staff role is blocked (403 Forbidden) from viewing revenue analytics.
     */
    public function test_staff_is_forbidden_from_revenue_analytics(): void
    {
        $staff = User::where('email', 'staff1@srms.com')->firstOrFail();
        Sanctum::actingAs($staff, ['*']);

        $response = $this->getJson('/api/analytics/revenue');

        $response->assertStatus(403);
    }

    /**
     * Test Staff role is blocked (403 Forbidden) from cancelling or refunding orders.
     */
    public function test_staff_is_forbidden_from_cancelling_or_refunding_orders(): void
    {
        $staff = User::where('email', 'staff1@srms.com')->firstOrFail();
        Sanctum::actingAs($staff, ['*']);

        // Attempting to cancel an order as staff
        $response = $this->putJson('/api/orders/1', [
            'status' => 'Cancelled'
        ]);

        $response->assertStatus(403);

        // Attempting to refund an order as staff
        $response = $this->putJson('/api/orders/1', [
            'status' => 'Refunded'
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test Manager role can view revenue analytics.
     */
    public function test_manager_can_access_revenue_analytics(): void
    {
        $manager = User::where('email', 'manager@srms.com')->firstOrFail();
        Sanctum::actingAs($manager, ['*']);

        $response = $this->getJson('/api/analytics/revenue');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'kpis',
                'monthly_trend',
                'category_revenue',
                'segment_revenue',
                'top_products'
            ]);
    }

    /**
     * Test Admin role can access revenue analytics.
     */
    public function test_admin_can_access_revenue_analytics(): void
    {
        $admin = User::where('email', 'admin@srms.com')->firstOrFail();
        Sanctum::actingAs($admin, ['*']);

        $response = $this->getJson('/api/analytics/revenue');

        $response->assertStatus(200);
    }

    /**
     * Test CustomerController store and update are explicitly permitted
     * for all roles (Staff, Manager, Admin) as decided by product design.
     */
    public function test_customer_store_and_update_permitted_for_staff_manager_and_admin(): void
    {
        $roles = [
            'staff' => 'staff1@srms.com',
            'manager' => 'manager@srms.com',
            'admin' => 'admin@srms.com',
        ];

        foreach ($roles as $roleName => $email) {
            $user = User::where('email', $email)->firstOrFail();
            Sanctum::actingAs($user, ['*']);

            // 1. Test POST /api/customers
            $storeResponse = $this->postJson('/api/customers', [
                'name' => "Test Customer by {$roleName}",
                'email' => "test_{$roleName}_" . uniqid() . "@example.com",
                'phone' => '0987654321',
                'address' => "Registered by {$roleName}"
            ]);

            $storeResponse->assertStatus(201)
                ->assertJsonStructure(['message', 'customer_id']);

            $customerId = $storeResponse->json('customer_id');

            // 2. Test PUT /api/customers/{id}
            $updateResponse = $this->putJson("/api/customers/{$customerId}", [
                'name' => "Updated Customer by {$roleName}",
                'phone' => '0912345678'
            ]);

            $updateResponse->assertStatus(200)
                ->assertJson([
                    'message' => 'Customer updated successfully.'
                ]);
        }
    }
}
