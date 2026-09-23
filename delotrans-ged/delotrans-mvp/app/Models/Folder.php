<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Folder extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'parent_id', 'client_id', 'category_id', 'path', 'description', 'created_by'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Reconstruit le chemin matérialisé (ex: "1/4/12") à partir de la chaîne de parents.
     * À appeler après création ou déplacement (voir FolderController::move).
     */
    public function rebuildPath(): void
    {
        $this->path = $this->parent
            ? trim($this->parent->path, '/') . '/' . $this->id
            : (string) $this->id;
        $this->saveQuietly();
    }
}
