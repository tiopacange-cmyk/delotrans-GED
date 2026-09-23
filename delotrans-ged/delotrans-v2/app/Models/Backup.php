<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'type', 'file_path', 'file_size', 'status', 'started_at',
        'completed_at', 'error_message', 'nas_config_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function nasConfig(): BelongsTo
    {
        return $this->belongsTo(NasConfig::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
