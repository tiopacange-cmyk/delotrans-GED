<?php

namespace App\Observers;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

class AuditObserver
{
    public function created(Model $model): void
    {
        $this->log('created', $model);
    }

    public function updated(Model $model): void
    {
        $this->log('updated', $model);
    }

    public function deleted(Model $model): void
    {
        $this->log('deleted', $model);
    }

    private function log(string $action, Model $model): void
    {
        $moduleName = strtolower(class_basename($model));

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => "{$moduleName}.{$action}",
            'module' => $moduleName,
            'subject_type' => get_class($model),
            'subject_id' => $model->id,
            'description' => "{$moduleName} #{$model->id} {$action}",
            'ip_address' => request()?->ip(),
            'user_agent' => request()?->userAgent(),
        ]);
    }
}
