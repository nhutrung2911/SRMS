<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

class ForecastAndInsightsTest extends TestCase
{
    use DatabaseTransactions;

    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();
        $this->manager = User::where('email', 'manager@srms.com')->firstOrFail();
    }

    /**
     * Test forecast endpoint returns correct structure and SMA confidence bounds:
     * - Tests next7, next30, nextMonth
     * - Verifies summary contains expected, low, high, trend
     * - Verifies low <= expected <= high
     * - Verifies chart data contains actual points and forecast points
     */
    public function test_forecast_endpoint_returns_expected_kpis_and_sma_bands(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        $periods = ['next7', 'next30', 'nextMonth'];

        foreach ($periods as $period) {
            $response = $this->getJson("/api/forecast?period={$period}");

            $response->assertStatus(200)
                ->assertJsonStructure([
                    'period',
                    'summary' => [
                        'expected',
                        'low',
                        'high',
                        'trend'
                    ],
                    'data'
                ]);

            $summary = $response->json('summary');
            $this->assertGreaterThanOrEqual(0, $summary['expected']);
            $this->assertGreaterThanOrEqual(0, $summary['low']);
            $this->assertGreaterThanOrEqual($summary['low'], $summary['expected']);
            $this->assertGreaterThanOrEqual($summary['expected'], $summary['high']);

            $data = $response->json('data');
            $this->assertIsArray($data);
            $this->assertNotEmpty($data);

            // Verify chart points structure
            $samplePoint = $data[0];
            $this->assertArrayHasKey('label', $samplePoint);
            $this->assertArrayHasKey('actual', $samplePoint);
            $this->assertArrayHasKey('forecast', $samplePoint);
            $this->assertArrayHasKey('lower', $samplePoint);
            $this->assertArrayHasKey('upper', $samplePoint);
        }
    }

    /**
     * Test SMA standard deviation calculation with low data points (N < 2):
     * Ensures sample variance does not divide by (N-1) when N <= 1, avoiding division by zero.
     */
    public function test_forecast_guards_low_data_points(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        // Temporarily clear all except 1 revenue_daily record
        $keepDate = DB::table('revenue_daily')->orderBy('date', 'desc')->value('date');
        DB::table('revenue_daily')->where('date', '!=', $keepDate)->delete();

        $response = $this->getJson('/api/forecast?period=next7');

        $response->assertStatus(200);
        $summary = $response->json('summary');

        // With N=1, stdDev is guarded to 0, so low == expected == high
        $this->assertEquals($summary['expected'], $summary['low']);
        $this->assertEquals($summary['expected'], $summary['high']);
    }

    /**
     * Test AI Insights endpoint returns insights for inventory, pricing/revenue,
     * customer, and promotion pillars.
     */
    public function test_insights_endpoint_returns_core_pillars(): void
    {
        Sanctum::actingAs($this->manager, ['*']);

        $response = $this->getJson('/api/insights');

        $response->assertStatus(200);
        $insights = $response->json();

        $this->assertIsArray($insights);
        $this->assertNotEmpty($insights);

        $types = collect($insights)->pluck('type')->unique()->toArray();

        // Check common pillars are represented
        $this->assertContains('inventory', $types);
        $this->assertContains('customer', $types);

        foreach ($insights as $insight) {
            $this->assertArrayHasKey('id', $insight);
            $this->assertArrayHasKey('type', $insight);
            $this->assertArrayHasKey('title', $insight);
            $this->assertArrayHasKey('description', $insight);
            $this->assertArrayHasKey('impact', $insight);
            $this->assertArrayHasKey('action', $insight);
            $this->assertArrayHasKey('evidence', $insight);
            $this->assertIsArray($insight['evidence']);
        }
    }
}
