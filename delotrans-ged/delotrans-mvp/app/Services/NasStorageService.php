<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Version MVP : un seul NAS, monté au niveau système (SMB/NFS via /etc/fstab)
 * et exposé comme disque Laravel "nas" (voir config/filesystems.php + .env FILESYSTEM_NAS_MOUNT_PATH).
 * La gestion multi-NAS / multi-driver (Synology, QNAP, TrueNAS) est prévue en V2.
 */
class NasStorageService
{
    private string $disk = 'nas';

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
}
