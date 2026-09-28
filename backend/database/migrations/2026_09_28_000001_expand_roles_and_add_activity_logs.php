<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Expand roles table with director (4) and customer_service (5)
        $existingRoles = DB::table('roles')->pluck('name')->toArray();
        
        if (!in_array('director', $existingRoles)) {
            DB::table('roles')->insert([
                'id' => 4,
                'name' => 'director',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        if (!in_array('customer_service', $existingRoles)) {
            DB::table('roles')->insert([
                'id' => 5,
                'name' => 'customer_service',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        // 2. Add default users for the new roles if they do not exist
        if (!DB::table('users')->where('email', 'director@srms.com')->exists()) {
            DB::table('users')->insert([
                'role_id' => 4,
                'name' => 'Director User',
                'email' => 'director@srms.com',
                'password' => Hash::make('password'),
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        if (!DB::table('users')->where('email', 'cs@srms.com')->exists()) {
            DB::table('users')->insert([
                'role_id' => 5,
                'name' => 'Customer Service User',
                'email' => 'cs@srms.com',
                'password' => Hash::make('password'),
                'status' => 'Active',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        // 3. Add resolved_by to recommendations table if missing
        if (Schema::hasTable('recommendations') && !Schema::hasColumn('recommendations', 'resolved_by')) {
            Schema::table('recommendations', function (Blueprint $table) {
                $table->unsignedInteger('resolved_by')->nullable()->after('resolved_at');
                $table->foreign('resolved_by')->references('id')->on('users')->onDelete('set null');
                $table->index('resolved_by');
            });
        }

        // 4. Add created_by & updated_by to promotions table if missing
        if (Schema::hasTable('promotions')) {
            Schema::table('promotions', function (Blueprint $table) {
                if (!Schema::hasColumn('promotions', 'created_by')) {
                    $table->unsignedInteger('created_by')->nullable()->after('status');
                    $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
                }
                if (!Schema::hasColumn('promotions', 'updated_by')) {
                    $table->unsignedInteger('updated_by')->nullable()->after('created_by');
                    $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
                }
            });
        }

        // 5. Create activity_logs table
        if (!Schema::hasTable('activity_logs')) {
            Schema::create('activity_logs', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('user_id');
                $table->string('action', 100);
                $table->string('subject_type', 50)->nullable();
                $table->unsignedInteger('subject_id')->nullable();
                $table->text('description');
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index('user_id');
                $table->index('action');
                $table->index(['subject_type', 'subject_id']);
                $table->index('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');

        if (Schema::hasTable('promotions')) {
            Schema::table('promotions', function (Blueprint $table) {
                if (Schema::hasColumn('promotions', 'created_by')) {
                    $table->dropForeign(['created_by']);
                    $table->dropColumn('created_by');
                }
                if (Schema::hasColumn('promotions', 'updated_by')) {
                    $table->dropForeign(['updated_by']);
                    $table->dropColumn('updated_by');
                }
            });
        }

        if (Schema::hasTable('recommendations') && Schema::hasColumn('recommendations', 'resolved_by')) {
            Schema::table('recommendations', function (Blueprint $table) {
                $table->dropForeign(['resolved_by']);
                $table->dropColumn('resolved_by');
            });
        }

        DB::table('users')->whereIn('email', ['director@srms.com', 'cs@srms.com'])->delete();
        DB::table('roles')->whereIn('id', [4, 5])->delete();
    }
};
