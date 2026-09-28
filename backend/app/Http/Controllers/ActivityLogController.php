<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\PermissionService;
use Carbon\Carbon;

class ActivityLogController extends Controller
{
    /**
     * Get paginated activity logs (Admin and Director only).
     */
    public function index(Request $request)
    {
        PermissionService::authorize($request->user(), 'activity_logs.view');

        $query = DB::table('activity_logs')
            ->join('users', 'activity_logs.user_id', '=', 'users.id')
            ->leftJoin('roles', 'users.role_id', '=', 'roles.id')
            ->select(
                'activity_logs.id',
                'activity_logs.user_id',
                'users.name as user_name',
                'users.email as user_email',
                'roles.name as user_role',
                'activity_logs.action',
                'activity_logs.subject_type',
                'activity_logs.subject_id',
                'activity_logs.description',
                'activity_logs.metadata',
                'activity_logs.created_at'
            )
            ->orderBy('activity_logs.created_at', 'desc')
            ->orderBy('activity_logs.id', 'desc');

        // Filters
        if ($request->filled('user_id')) {
            $query->where('activity_logs.user_id', $request->query('user_id'));
        }

        if ($request->filled('action')) {
            $query->where('activity_logs.action', $request->query('action'));
        }

        if ($request->filled('subject_type')) {
            $query->where('activity_logs.subject_type', $request->query('subject_type'));
        }

        if ($request->filled('from')) {
            $query->where('activity_logs.created_at', '>=', Carbon::parse($request->query('from'))->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('activity_logs.created_at', '<=', Carbon::parse($request->query('to'))->endOfDay());
        }

        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));
        $logs = $query->paginate($perPage);

        // Decode JSON metadata
        $logs->getCollection()->transform(function ($item) {
            if ($item->metadata) {
                $item->metadata = json_decode($item->metadata, true);
            }
            return $item;
        });

        return response()->json($logs);
    }
}
