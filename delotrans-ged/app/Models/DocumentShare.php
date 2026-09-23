<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DocumentShare extends Model
{
    protected $fillable = [
        'document_id', 'token', 'password_hash', 'expires_at',
        'max_downloads', 'download_count', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $share) {
            $share->token ??= Str::random(40);
        });
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isExpired(): bool
    {
        if ($this->revoked_at) {
            return true;
        }
        if ($this->expires_at && $this->expires_at->isPast()) {
            return true;
        }
        if ($this->max_downloads && $this->download_count >= $this->max_downloads) {
            return true;
        }
        return false;
    }
}
