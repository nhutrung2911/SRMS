<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;

class PermissionService
{
    public const ROLE_ADMIN = 'admin';
    public const ROLE_DIRECTOR = 'director';
    public const ROLE_MANAGER = 'manager';
    public const ROLE_STAFF = 'staff';
    public const ROLE_CUSTOMER_SERVICE = 'customer_service';

    /**
     * Single Source of Truth for Role-Based Access Control (RBAC).
     * Maps each module or business action to the list of authorized roles.
     */
    protected static array $matrix = [
        // 1. Dashboard
        'dashboard.view' => ['admin', 'director', 'manager'],

        // 2. Revenue Analytics
        'revenue_analytics.view' => ['admin', 'director', 'manager'],

        // 3. Product Analytics
        'product_analytics.view' => ['admin', 'director', 'manager'],

        // 4. Customer Analytics (RFM)
        'customer_analytics.view' => ['admin', 'director', 'manager', 'customer_service'],

        // 5. Customer Detail / CRUD
        'customer.view' => ['admin', 'director', 'manager', 'staff', 'customer_service'],
        'customer.create' => ['admin', 'manager', 'staff'],
        'customer.update' => ['admin', 'manager', 'staff', 'customer_service'],

        // 6. Forecast & AI Insights
        'forecast.view' => ['admin', 'director', 'manager'],
        'insights.view' => ['admin', 'director', 'manager'],

        // 7. AI Recommendations
        'recommendations.view' => ['admin', 'director', 'manager'],
        'recommendations.action' => ['admin', 'manager'], // Director is strictly read-only

        // 8. Products (Catalog)
        'products.view' => ['admin', 'director', 'manager', 'staff'],
        'products.manage' => ['admin'], // Full CRUD for Admin only

        // 9. Inventory
        'inventory.view' => ['admin', 'director', 'manager', 'staff'],
        'inventory.adjust' => ['admin', 'manager'], // Director and Staff are read-only

        // 10. Orders
        'orders.view' => ['admin', 'director', 'manager', 'staff'],
        'orders.create' => ['admin', 'staff'],
        'orders.update_progress' => ['admin', 'manager', 'staff'], // Confirmed, Processing, Completed
        'orders.cancel_refund' => ['admin', 'manager'], // Director is read-only, Staff forbidden

        // 11. Promotions
        'promotions.view' => ['admin', 'director', 'manager', 'staff'],
        'promotions.manage' => ['admin', 'manager'], // Director and Staff are read-only

        // 12. Activity Log
        'activity_logs.view' => ['admin', 'director'],

        // 13. System & Users
        'system.manage' => ['admin'],
    ];

    /**
     * Get role name string for given user.
     */
    public static function getRoleName($user): ?string
    {
        if (!$user) return null;

        if (isset($user->role) && is_string($user->role)) {
            return strtolower($user->role);
        }

        if (isset($user->role_id)) {
            $role = DB::table('roles')->where('id', $user->role_id)->first();
            return $role ? strtolower($role->name) : null;
        }

        return null;
    }

    /**
     * Check if user has specific role or any of given roles.
     */
    public static function hasRole($user, string|array $roles): bool
    {
        $userRole = self::getRoleName($user);
        if (!$userRole) return false;

        $roles = (array) $roles;
        $normalizedRoles = array_map('strtolower', $roles);

        return in_array($userRole, $normalizedRoles, true);
    }

    /**
     * Check if user is granted a specific permission.
     */
    public static function can($user, string $permission): bool
    {
        $userRole = self::getRoleName($user);
        if (!$userRole) return false;

        if (!isset(self::$matrix[$permission])) {
            return false;
        }

        return in_array($userRole, self::$matrix[$permission], true);
    }

    /**
     * Enforce authorization. Throws 403 JSON exception immediately if unauthorized.
     */
    public static function authorize($user, string $permission, ?string $customMessage = null): void
    {
        if (!self::can($user, $permission)) {
            $message = $customMessage ?? "Forbidden. You do not have permission to perform this action [{$permission}].";
            throw new HttpResponseException(response()->json(['message' => $message], 403));
        }
    }
}
