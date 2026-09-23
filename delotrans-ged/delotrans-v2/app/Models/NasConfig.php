<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NasConfig extends Model
{
    protected $fillable = [
        'name', 'driver', 'host', 'port', 'protocol', 'username',
        'credentials_encrypted', 'base_path', 'is_active', 'status',
        'total_space_bytes', 'used_space_bytes', 'last_checked_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'credentials_encrypted' => 'encrypted',
            'last_checked_at' => 'datetime',
        ];
    }

    protected $hidden = ['credentials_encrypted'];

    public function backups(): HasMany
    {
        return $this->hasMany(Backup::class);
    }
}
