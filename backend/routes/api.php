<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PromotionController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes (Require Sanctum Authentication)
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Dashboard & KPIs
    Route::get('/dashboard/kpis', [DashboardController::class, 'getKpis']);
    Route::get('/dashboard/chart', [DashboardController::class, 'getChartData']);
    Route::get('/analytics/products', [AnalyticsController::class, 'getProductAnalytics']);
    Route::get('/analytics/customers', [AnalyticsController::class, 'getCustomerAnalytics']);

    // Recommendations
    Route::get('/recommendations', [\App\Http\Controllers\RecommendationController::class, 'index']);
    Route::post('/recommendations/{id}/apply', [\App\Http\Controllers\RecommendationController::class, 'apply']);
    Route::post('/recommendations/{id}/dismiss', [\App\Http\Controllers\RecommendationController::class, 'dismiss']);

    // Products & Catalog Reference Data
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);
    Route::get('/categories', [ProductController::class, 'getCategories']);
    Route::get('/brands', [ProductController::class, 'getBrands']);
    Route::get('/suppliers', [ProductController::class, 'getSuppliers']);

    // Inventory
    Route::get('/inventory/kpis', [InventoryController::class, 'getKpis']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory/{id}/adjust', [InventoryController::class, 'adjust']);

    // Orders
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}', [OrderController::class, 'update']);
    Route::get('/reference/customers', [OrderController::class, 'getCustomers']);
    Route::get('/reference/promotions', [OrderController::class, 'getPromotions']);
    
    // Promotions
    Route::get('/promotions/kpis', [PromotionController::class, 'getKpis']);
    Route::get('/promotions', [PromotionController::class, 'index']);
    Route::get('/promotions/{id}', [PromotionController::class, 'show']);
    Route::post('/promotions', [PromotionController::class, 'store']);
    Route::put('/promotions/{id}', [PromotionController::class, 'update']);
    Route::delete('/promotions/{id}', [PromotionController::class, 'destroy']);
    
});
