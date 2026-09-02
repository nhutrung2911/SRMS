<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. roles
        Schema::create('roles', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 50)->unique();
            $table->timestamps();
        });

        // 2. users
        Schema::create('users', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('role_id');
            $table->string('name', 150);
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->timestamps();

            $table->foreign('role_id')->references('id')->on('roles')->onDelete('restrict');
            $table->index('role_id');
        });

        // 3. categories
        Schema::create('categories', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('parent_id')->nullable();
            $table->string('name', 150);
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('categories')->onDelete('set null');
            $table->index('parent_id');
        });

        // 4. brands
        Schema::create('brands', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 150)->unique();
            $table->timestamps();
        });

        // 5. suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 150);
            $table->string('contact_info', 255)->nullable();
            $table->timestamps();
        });

        // 6. products
        Schema::create('products', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('category_id');
            $table->unsignedInteger('brand_id')->nullable();
            $table->unsignedInteger('supplier_id')->nullable();
            $table->string('name', 200);
            $table->string('sku', 64)->unique();
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('base_price', 15, 2)->default(0);
            $table->decimal('current_price', 15, 2)->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->integer('reorder_level')->default(10);
            $table->enum('status', ['Active', 'Inactive', 'Out of Stock'])->default('Active');
            $table->timestamps();

            $table->foreign('category_id')->references('id')->on('categories')->onDelete('restrict');
            $table->foreign('brand_id')->references('id')->on('brands')->onDelete('set null');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('set null');

            $table->index('category_id');
            $table->index('brand_id');
            $table->index('supplier_id');
            $table->index('status');
            $table->index('stock_quantity');
        });

        // 7. product_images
        Schema::create('product_images', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('product_id');
            $table->string('image_url', 500);
            $table->boolean('is_primary')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->index('product_id');
        });

        // 8. customers
        Schema::create('customers', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 150);
            $table->string('email', 150)->nullable()->unique();
            $table->string('phone', 30)->nullable();
            $table->string('address', 500)->nullable();
            $table->decimal('total_spending', 18, 2)->default(0);
            $table->integer('total_orders')->default(0);
            $table->dateTime('last_purchase_date')->nullable();
            $table->timestamps();

            $table->index('total_spending');
            $table->index('last_purchase_date');
        });

        // 9. customer_segments
        Schema::create('customer_segments', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('customer_id')->unique();
            $table->unsignedTinyInteger('r_score');
            $table->unsignedTinyInteger('f_score');
            $table->unsignedTinyInteger('m_score');
            $table->string('segment_name', 50);
            $table->boolean('is_vip')->default(false);
            $table->dateTime('calculated_at');

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            $table->index('segment_name');
            $table->index('is_vip');
        });

        // 10. inventory_transactions
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('product_id');
            $table->unsignedInteger('user_id')->nullable();
            $table->enum('type', ['IN', 'OUT', 'ADJUSTMENT']);
            $table->integer('quantity');
            $table->enum('reference_type', ['order', 'purchase', 'adjustment'])->default('adjustment');
            $table->unsignedInteger('reference_id')->nullable();
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index('product_id');
            $table->index('user_id');
            $table->index('type');
            $table->index(['reference_type', 'reference_id']);
        });

        // 11. price_history
        Schema::create('price_history', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('product_id');
            $table->decimal('old_price', 15, 2);
            $table->decimal('new_price', 15, 2);
            $table->unsignedInteger('changed_by')->nullable();
            $table->string('reason', 255)->nullable();
            $table->timestamp('changed_at')->useCurrent();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('changed_by')->references('id')->on('users')->onDelete('set null');
            $table->index('product_id');
        });

        // 12. promotions
        Schema::create('promotions', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 150);
            $table->enum('discount_type', ['PERCENT', 'FIXED']);
            $table->decimal('discount_value', 15, 2);
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->decimal('min_order_value', 15, 2)->default(0);
            $table->enum('status', ['Active', 'Expired', 'Draft'])->default('Draft');
            $table->timestamps();

            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });

        // 13. promotion_products
        Schema::create('promotion_products', function (Blueprint $table) {
            $table->unsignedInteger('promotion_id');
            $table->unsignedInteger('product_id');
            $table->primary(['promotion_id', 'product_id']);

            $table->foreign('promotion_id')->references('id')->on('promotions')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });

        // 14. orders
        Schema::create('orders', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('customer_id');
            $table->unsignedInteger('staff_id')->nullable();
            $table->decimal('total_amount', 18, 2)->default(0);
            $table->decimal('discount_amount', 18, 2)->default(0);
            $table->decimal('final_amount', 18, 2)->default(0);
            $table->enum('status', ['Pending', 'Confirmed', 'Processing', 'Completed', 'Cancelled', 'Refunded'])->default('Pending');
            $table->dateTime('order_date')->useCurrent();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('restrict');
            $table->foreign('staff_id')->references('id')->on('users')->onDelete('set null');
            $table->index('customer_id');
            $table->index('status');
            $table->index('order_date');
        });

        // 15. order_details
        Schema::create('order_details', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('order_id');
            $table->unsignedInteger('product_id');
            $table->unsignedInteger('promotion_id')->nullable();
            $table->integer('quantity');
            $table->decimal('unit_price', 15, 2);
            $table->decimal('cost_price', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('total', 18, 2);
            $table->decimal('profit', 18, 2);

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('restrict');
            $table->foreign('promotion_id')->references('id')->on('promotions')->onDelete('set null');
            
            $table->index('order_id');
            $table->index('product_id');
            $table->index('promotion_id');
        });

        // 16. payments
        Schema::create('payments', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('order_id');
            $table->string('payment_method', 50);
            $table->decimal('amount', 18, 2);
            $table->enum('status', ['Unpaid', 'Paid', 'Refunded'])->default('Unpaid');
            $table->dateTime('paid_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->index('order_id');
        });

        // 17. revenue_daily
        Schema::create('revenue_daily', function (Blueprint $table) {
            $table->date('date')->primary();
            $table->decimal('total_revenue', 18, 2)->default(0);
            $table->decimal('total_profit', 18, 2)->default(0);
            $table->integer('total_orders')->default(0);
            $table->timestamps();
        });

        // 18. recommendations
        Schema::create('recommendations', function (Blueprint $table) {
            $table->increments('id');
            $table->enum('type', ['Pricing', 'Promotion', 'Inventory', 'Customer']);
            $table->enum('target_type', ['product', 'customer']);
            $table->unsignedInteger('target_id');
            $table->text('reason');
            $table->text('recommended_action');
            $table->enum('status', ['Pending', 'Applied', 'Rejected'])->default('Pending');
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();

            $table->index('type');
            $table->index(['target_type', 'target_id']);
            $table->index('status');
        });

        // Required by Laravel Auth
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('recommendations');
        Schema::dropIfExists('revenue_daily');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_details');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('promotion_products');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('price_history');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('customer_segments');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('brands');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};
