<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RecommendationController extends Controller
{
    private function isAdminOrManager(Request $request)
    {
        $role = DB::table('roles')->where('id', $request->user()->role_id)->first();
        return $role && in_array($role->name, ['admin', 'manager']);
    }

    public function index(Request $request)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden. Only Admin or Manager can view recommendations.'], 403);
        }

        $recs = DB::table('recommendations')->orderBy('id', 'desc')->get();
        
        $results = [];
        
        foreach ($recs as $rec) {
            $priority = 'low';
            $relatedName = 'Unknown';
            $confidence = 80;

            if ($rec->target_type === 'product') {
                $product = DB::table('products')->where('id', $rec->target_id)->first();
                if ($product) {
                    $relatedName = $product->name;
                    
                    if (in_array(strtolower($rec->type), ['pricing', 'promotion'])) {
                        $margin = $product->current_price > 0 ? (($product->current_price - $product->cost_price) / $product->current_price) * 100 : 0;
                        if ($margin < 15) {
                            $priority = 'high';
                            $confidence = 95;
                        } else {
                            $priority = 'medium';
                            $confidence = 75;
                        }
                    } elseif (strtolower($rec->type) === 'inventory') {
                        if ($product->stock_quantity <= $product->reorder_level) {
                            $priority = 'high';
                            $confidence = 90;
                        } else {
                            $priority = 'medium';
                            $confidence = 70;
                        }
                    }
                }
            } elseif ($rec->target_type === 'customer') {
                $customer = DB::table('customers')->where('id', $rec->target_id)->first();
                if ($customer) {
                    $relatedName = $customer->name;
                    if ($customer->total_spending > 10000000) {
                        $priority = 'high';
                        $confidence = 92;
                    } else {
                        $priority = 'medium';
                        $confidence = 65;
                    }
                }
            }

            // Map DB status to UI status
            $uiStatus = 'pending';
            if ($rec->status === 'Applied') $uiStatus = 'applied';
            if ($rec->status === 'Rejected') $uiStatus = 'dismissed';
            $impactAnalysis = null;
            if ($uiStatus === 'applied' && strtolower($rec->type) === 'pricing' && $rec->target_type === 'product' && $rec->resolved_at) {
                $resolvedAt = Carbon::parse($rec->resolved_at);
                $now = Carbon::now();
                $daysPassed = max(0, $resolvedAt->floatDiffInDays($now));
                
                $hasEnoughData = $daysPassed >= 2;

                // 7 days before
                $beforeStart = $resolvedAt->copy()->subDays(7);
                $beforeStats = DB::table('order_details')
                    ->join('orders', 'order_details.order_id', '=', 'orders.id')
                    ->where('order_details.product_id', $rec->target_id)
                    ->where('orders.status', 'Completed')
                    ->whereBetween('orders.order_date', [$beforeStart, $resolvedAt])
                    ->selectRaw('COALESCE(SUM(order_details.total), 0) as rev, COALESCE(SUM(order_details.profit), 0) as prof')
                    ->first();
                
                $beforeRevAvg = $beforeStats ? $beforeStats->rev / 7 : 0;
                $beforeProfAvg = $beforeStats ? $beforeStats->prof / 7 : 0;

                // after
                $afterStats = DB::table('order_details')
                    ->join('orders', 'order_details.order_id', '=', 'orders.id')
                    ->where('order_details.product_id', $rec->target_id)
                    ->where('orders.status', 'Completed')
                    ->whereBetween('orders.order_date', [$resolvedAt, $now])
                    ->selectRaw('COALESCE(SUM(order_details.total), 0) as rev, COALESCE(SUM(order_details.profit), 0) as prof')
                    ->first();

                $divisor = $daysPassed > 0 ? $daysPassed : 1;
                $afterRevAvg = $afterStats ? $afterStats->rev / $divisor : 0;
                $afterProfAvg = $afterStats ? $afterStats->prof / $divisor : 0;

                $revChange = $beforeRevAvg > 0 ? (($afterRevAvg - $beforeRevAvg) / $beforeRevAvg) * 100 : null;
                $profChange = $beforeProfAvg > 0 ? (($afterProfAvg - $beforeProfAvg) / $beforeProfAvg) * 100 : null;

                $impactAnalysis = [
                    'hasEnoughData' => $hasEnoughData,
                    'before' => [
                        'revenue' => round($beforeRevAvg),
                        'profit' => round($beforeProfAvg)
                    ],
                    'after' => [
                        'revenue' => round($afterRevAvg),
                        'profit' => round($afterProfAvg)
                    ],
                    'change' => [
                        'revenue' => $revChange !== null ? round($revChange, 1) : null,
                        'profit' => $profChange !== null ? round($profChange, 1) : null
                    ]
                ];
            }
            $results[] = [
                'id' => (string) $rec->id,
                'type' => strtolower($rec->type),
                'title' => $rec->type . ' Optimization for ' . $relatedName,
                'reason' => $rec->reason,
                'action' => $rec->recommended_action,
                'status' => $uiStatus,
                'priority' => $priority,
                'confidence' => $confidence,
                'createdDate' => Carbon::parse($rec->generated_at)->format('Y-m-d'),
                'relatedProduct' => $relatedName,
                'impact' => $priority, // Reusing priority as impact size roughly
                'impactAnalysis' => $impactAnalysis
            ];
        }

        return response()->json($results);
    }

    public function apply(Request $request, $id)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rec = DB::table('recommendations')->where('id', $id)->first();
        if (!$rec) {
            return response()->json(['message' => 'Recommendation not found.'], 404);
        }

        if ($rec->status !== 'Pending') {
            return response()->json(['message' => 'Recommendation already processed.'], 400);
        }

        // Execution Logic for Pricing
        if ($rec->type === 'Pricing' && $rec->target_type === 'product') {
            $product = DB::table('products')->where('id', $rec->target_id)->first();
            if (!$product) {
                return response()->json(['message' => 'Target product not found.'], 404);
            }
            
            // Parse percentage from "Increase base price by 5%" or "Apply 20% clearance discount"
            preg_match('/(\d+)%/', $rec->recommended_action, $matches);
            if (empty($matches[1])) {
                return response()->json(['message' => 'Could not parse a percentage from this recommendation.'], 422);
            }
            
            $percent = (float) $matches[1];
            $isDecrease = stripos($rec->recommended_action, 'decrease') !== false || stripos($rec->recommended_action, 'reduce') !== false || stripos($rec->recommended_action, 'discount') !== false;
            
            $factor = $isDecrease ? (1 - $percent/100) : (1 + $percent/100);
            $newPrice = round($product->current_price * $factor);
            
            if ($newPrice < $product->cost_price) {
                return response()->json(['message' => "Calculated price ($newPrice) is below cost price ({$product->cost_price})."], 422);
            }

            DB::table('products')->where('id', $product->id)->update([
                'current_price' => $newPrice,
                'updated_at' => Carbon::now()
            ]);

            DB::table('price_history')->insert([
                'product_id' => $product->id,
                'old_price' => $product->current_price,
                'new_price' => $newPrice,
                'changed_by' => $request->user()->id,
                'reason' => "Applied Recommendation #{$rec->id}",
                'changed_at' => Carbon::now()
            ]);
        }

        // Mark as applied
        DB::table('recommendations')->where('id', $id)->update([
            'status' => 'Applied',
            'resolved_at' => Carbon::now()
        ]);

        return response()->json(['message' => 'Recommendation applied successfully.']);
    }

    public function dismiss(Request $request, $id)
    {
        if (!$this->isAdminOrManager($request)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $rec = DB::table('recommendations')->where('id', $id)->first();
        if (!$rec) {
            return response()->json(['message' => 'Recommendation not found.'], 404);
        }

        if ($rec->status !== 'Pending') {
            return response()->json(['message' => 'Recommendation already processed.'], 400);
        }

        DB::table('recommendations')->where('id', $id)->update([
            'status' => 'Rejected',
            'resolved_at' => Carbon::now()
        ]);

        return response()->json(['message' => 'Recommendation dismissed.']);
    }
}
