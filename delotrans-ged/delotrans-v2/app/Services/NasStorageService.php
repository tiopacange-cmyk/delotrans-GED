<?php

namespace App\Services;

use App\Models\NasConfig;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Version V2 : supporte plusieurs configurations NAS (table nas_configs).
 * Le disque Laravel utilisé reste "nas" par défaut (config/filesystems.php),
 * qui doit pointer vers le point de montage système du NAS actif.
 * Pour un vrai support multi-NAS simultané, générer un disque dynamique par
 * NasConfig (voir buildDiskName()) et enregistrer chaque driver dans un
 * ServiceProvider au boot de l'application.
 */
class NasStorageService
{
    private string $disk;

    public function __construct(?NasConfig $nasConfig = null)
    {
        $this->disk = $nasConfig ? $this->buildDiskName($nasConfig) : 'nas';
    }

    public function store(UploadedFile $file, int $folderId): string
    {
        $path = "folders/{$folderId}/" . Str::uuid() . '_' . $file->getClientOriginalName();
        Storage::disk($this->disk)->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    public function delete(string $path): bool
    {
        return Storage::disk($this->disk)->delete($path);
    }

    public function streamDownload(string $path, string $filename): StreamedResponse
    {
        return Storage::disk($this->disk)->download($path, $filename);
    }

    public function streamInline(string $path, string $mimeType): StreamedResponse
    {
        return response()->stream(function () use ($path) {
            echo Storage::disk($this->disk)->get($path);
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline',
        ]);
    }

    public function testConnection(NasConfig $config): array
    {
        try {
            $disk = Storage::disk($this->buildDiskName($config));
            $disk->exists('/');
            return ['success' => true, 'message' => 'Connexion établie.'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Espace disque utilisé/total. L'implémentation réelle dépend du driver
     * (API DSM pour Synology, QTS pour QNAP, API REST TrueNAS) et doit être
     * ajoutée dans une classe dédiée par driver (SynologyDriver, etc.).
     */
    public function getDiskUsage(NasConfig $config): array
    {
        return [
            'total_bytes' => $config->total_space_bytes,
            'used_bytes' => $config->used_space_bytes,
        ];
    }

    private function buildDiskName(NasConfig $config): string
    {
        return 'nas_' . $config->id;
    }
}
