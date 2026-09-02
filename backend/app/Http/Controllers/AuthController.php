<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();
            $user = Auth::user();
            
            // Create Bearer token for easy Postman testing
            $token = $user->createToken('postman-test-token')->plainTextToken;

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role_id' => $user->role_id,
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
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }
}
