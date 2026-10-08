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
     * Test CustomerController store is permitted for Staff and Admin,
     * while update is permitted for Admin and Customer Service, but strictly forbidden for Staff.
     */
    public function test_customer_store_and_update_permissions(): void
    {
        // 1. Staff can create customer
        $staff = User::where('email', 'staff1@srms.com')->firstOrFail();
        Sanctum::actingAs($staff, ['*']);

        $staffStoreRes = $this->postJson('/api/customers', [
            'name' => 'Staff Created Customer',
            'email' => 'staff_created_' . uniqid() . '@example.com',
            'phone' => '0987111222',
            'address' => 'Staff Counter 1'
        ]);
        $staffStoreRes->assertStatus(201)->assertJsonStructure(['message', 'customer_id']);
        $customerId = $staffStoreRes->json('customer_id');

        // Staff is FORBIDDEN from updating customer
        $this->putJson("/api/customers/{$customerId}", [
            'name' => 'Staff Attempted Update',
            'phone' => '0912345678'
        ])->assertStatus(403);

        // 2. Admin can create and update customer
        $admin = User::where('email', 'admin@srms.com')->firstOrFail();
        Sanctum::actingAs($admin, ['*']);

        $adminStoreRes = $this->postJson('/api/customers', [
            'name' => 'Admin Created Customer',
            'email' => 'admin_created_' . uniqid() . '@example.com',
        ]);
        $adminStoreRes->assertStatus(201);

        $adminUpdateRes = $this->putJson("/api/customers/{$customerId}", [
            'name' => 'Admin Updated Customer',
            'phone' => '0912345678'
        ]);
        $adminUpdateRes->assertStatus(200)->assertJson(['message' => 'Customer updated successfully.']);

        // 3. Customer Service can update customer
        $cs = User::where('email', 'cs@srms.com')->firstOrFail();
        Sanctum::actingAs($cs, ['*']);

        $csUpdateRes = $this->putJson("/api/customers/{$customerId}", [
            'phone' => '0999888777'
        ]);
        $csUpdateRes->assertStatus(200)->assertJson(['message' => 'Customer updated successfully.']);
    }

    /**
     * Test Staff is forbidden from GET /api/customers/{id} (RFM / detail),
     * but can access GET /reference/customers (dropdown selection).
     */
    public function test_staff_forbidden_to_view_customer_detail_and_can_access_reference_customers(): void
    {
        $staff = User::where('email', 'staff1@srms.com')->firstOrFail();
        Sanctum::actingAs($staff, ['*']);

        // Staff receives 403 on customer detail (RFM / single customer view)
        $this->getJson('/api/customers/1')->assertStatus(403);

        // Staff can access reference list for order creation (id, name, phone)
        $refRes = $this->getJson('/api/reference/customers');
        $refRes->assertStatus(200);
        $this->assertIsArray($refRes->json());

        // Other roles (Manager, Director, CS, Admin) can view customer detail
        $analyticsRoles = ['manager@srms.com', 'director@srms.com', 'cs@srms.com', 'admin@srms.com'];
        foreach ($analyticsRoles as $email) {
            $u = User::where('email', $email)->firstOrFail();
            Sanctum::actingAs($u, ['*']);
            $this->getJson('/api/customers/1')->assertStatus(200);
        }
    }

    /**
     * Test Manager is strictly forbidden from creating or updating customers (HTTP 403).
     */
    public function test_manager_forbidden_to_create_or_update_customer(): void
    {
        $manager = User::where('email', 'manager@srms.com')->firstOrFail();
        Sanctum::actingAs($manager, ['*']);

        // 1. Manager cannot create customer
        $this->postJson('/api/customers', [
            'name' => 'Manager Attempted Customer',
            'phone' => '0988776655',
        ])->assertStatus(403);

        // 2. Manager cannot update customer
        $this->putJson('/api/customers/1', [
            'name' => 'Manager Attempted Update',
        ])->assertStatus(403);
    }

    /**
     * Test authenticated user can update profile name and activity log is written.
     */
    public function test_authenticated_user_can_update_profile_and_activity_logged(): void
    {
        $user = User::where('email', 'admin@srms.com')->firstOrFail();
        Sanctum::actingAs($user, ['*']);

        $newName = 'Updated Admin Name';
        $response = $this->putJson('/api/user/profile', [
            'name' => $newName,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Profile updated successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $newName,
                ]
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => $newName,
        ]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => 'update',
            'subject_type' => 'User',
            'subject_id' => $user->id,
        ]);
    }

    /**
     * Test authenticated user can update password with current password verification.
     */
    public function test_authenticated_user_can_update_password_and_fails_with_invalid_current_password(): void
    {
        $user = User::where('email', 'staff1@srms.com')->firstOrFail();
        Sanctum::actingAs($user, ['*']);

        // 1. Wrong current password fails with 422
        $failResponse = $this->putJson('/api/user/password', [
            'current_password' => 'wrong-current-password',
            'new_password' => 'newsecret123',
            'new_password_confirmation' => 'newsecret123',
        ]);

        $failResponse->assertStatus(422);

        // 2. Correct current password succeeds
        $successResponse = $this->putJson('/api/user/password', [
            'current_password' => 'password',
            'new_password' => 'newsecret123',
            'new_password_confirmation' => 'newsecret123',
        ]);

        $successResponse->assertStatus(200)
            ->assertJson([
                'message' => 'Password updated successfully'
            ]);

        $this->assertDatabaseHas('activity_logs', [
            'user_id' => $user->id,
            'action' => 'update_password',
            'subject_type' => 'User',
            'subject_id' => $user->id,
        ]);
    }
}

