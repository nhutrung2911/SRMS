<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\ActivityLogger;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (Auth::attempt($credentials)) {
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
            $user = Auth::user();
            
            // Create Bearer token for easy Postman testing
            $token = $user->createToken('postman-test-token')->plainTextToken;

            $role = \Illuminate\Support\Facades\DB::table('roles')->where('id', $user->role_id)->first();
            $roleName = $role ? strtolower($role->name) : 'staff';

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role_id' => $user->role_id,
                    'role' => $roleName,
                    'status' => $user->status
                ],
                'token' => $token // Dùng token này để test Postman
            ]);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    public function logout(Request $request)
    {
        // Thu hồi (xóa) Bearer token nếu request sử dụng token
        if ($request->user() && $request->bearerToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        // Xóa session (dành cho SPA / web)
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
        
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        $user = $request->user();
        $role = \Illuminate\Support\Facades\DB::table('roles')->where('id', $user->role_id)->first();
        $roleName = $role ? strtolower($role->name) : 'staff';

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role_id' => $user->role_id,
            'role' => $roleName,
            'status' => $user->status,
            'created_at' => $user->created_at,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
        ]);

        $user = $request->user();
        \Illuminate\Support\Facades\DB::table('users')
            ->where('id', $user->id)
            ->update([
                'name' => $validated['name'],
                'updated_at' => now(),
            ]);

        ActivityLogger::log(
            $user->id,
            'update',
            'User',
            $user->id,
            "User {$user->id} updated profile information",
            ['old_name' => $user->name, 'new_name' => $validated['name']]
        );

        $role = \Illuminate\Support\Facades\DB::table('roles')->where('id', $user->role_id)->first();
        $roleName = $role ? strtolower($role->name) : 'staff';

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $validated['name'],
                'email' => $user->email,
                'role_id' => $user->role_id,
                'role' => $roleName,
                'status' => $user->status
            ]
        ]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!\Illuminate\Support\Facades\Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'The provided current password does not match our records.'
            ], 422);
        }

        \Illuminate\Support\Facades\DB::table('users')
            ->where('id', $user->id)
            ->update([
                'password' => \Illuminate\Support\Facades\Hash::make($validated['new_password']),
                'updated_at' => now(),
            ]);

        ActivityLogger::log(
            $user->id,
            'update_password',
            'User',
            $user->id,
            "User {$user->id} updated their password",
            []
        );

        return response()->json([
            'message' => 'Password updated successfully'
        ]);
    }
}
