<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class ActivityLogger
{
    /**
     * Record an audit activity log entry inside the active database transaction.
     */
    public static function log(
        int $userId,
        string $action,
        ?string $subjectType,
        ?int $subjectId,
        string $description,
        ?array $metadata = null
    ): int {
        return DB::table('activity_logs')->insertGetId([
            'user_id' => $userId,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'description' => $description,
            'metadata' => $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => now(),
        ]);
    }
}
