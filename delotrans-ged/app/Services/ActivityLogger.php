<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Enregistre dans le journal les actions qui ne sont pas des créations,
 * modifications ou suppressions : connexions, consultations, téléchargements…
 */
class ActivityLogger
{
    public static function log(
        string $action,
        string $module,
        ?Model $subject = null,
        ?string $description = null,
        ?int $userId = null
    ): void {
        try {
            ActivityLog::create([
                'user_id' => $userId ?? auth()->id(),
                'action' => "{$module}.{$action}",
                'module' => $module,
                'subject_type' => $subject ? get_class($subject) : null,
                'subject_id' => $subject?->id,
                'description' => $description,
                'ip_address' => request()?->ip(),
                'user_agent' => request()?->userAgent(),
            ]);
        } catch (\Throwable $e) {
            report($e); // le journal ne doit jamais bloquer l'action elle-même
        }
    }
}
