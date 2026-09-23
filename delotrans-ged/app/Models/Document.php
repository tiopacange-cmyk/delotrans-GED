<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'current_version_id',
        'name', 'folder_id', 'client_id', 'category_id',
        'mime_type', 'file_size', 'nas_path', 'status', 'created_by',
    ];

    public function folder(): BelongsTo
    {
        return $this->belongsTo(Folder::class);
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

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'current_version_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(DocumentVersion::class)->orderByDesc('version_number');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(DocumentShare::class);
    }
/**
     * Quand la version courante change, le document reprend le fichier,
     * la taille et le type de cette version (téléchargement, aperçu, affichage).
     */
    protected static function booted(): void
    {
        static::saving(function (Document $document) {
            if ($document->isDirty("current_version_id") && $document->current_version_id) {
                $version = DocumentVersion::find($document->current_version_id);
                if ($version) {
                    $document->nas_path = $version->file_path;
                    $document->file_size = $version->file_size;
                    $document->mime_type = $version->mime_type;
                }
            }
        });
    }
}
