<?php

namespace App\Services;

use App\Models\NasConfig;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Stockage des documents sur NAS.
 *
 * SMB / NFS : le partage du NAS (Synology, QNAP, TrueNAS) est monté par le
 * système (ex. /mnt/nas-delotrans via /etc/fstab) et base_path pointe sur ce
 * point de montage. Laravel y accède comme à un dossier local.
 * FTP : accès direct (nécessite le paquet league/flysystem-ftp).
 * Sans NAS précisé, le disque "nas" de config/filesystems.php est utilisé.
 */
class NasStorageService
{
    private Filesystem $fs;

    public function __construct(?NasConfig $nasConfig = null)
    {
        $this->fs = $nasConfig ? $this->diskFor($nasConfig) : Storage::disk('nas');
    }

    public function store(UploadedFile $file, int $folderId): string
    {
        $path = "folders/{$folderId}/" . Str::uuid() . '_' . $file->getClientOriginalName();
        $this->fs->put($path, file_get_contents($file->getRealPath()));

        return $path;
    }

    public function delete(string $path): bool
    {
        return $this->fs->delete($path);
    }

    public function streamDownload(string $path, string $filename): StreamedResponse
    {
        return $this->fs->download($path, $filename);
    }

    public function streamInline(string $path, string $mimeType): StreamedResponse
    {
        return response()->stream(function () use ($path) {
            echo $this->fs->get($path);
        }, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline',
        ]);
    }

    /**
     * Test réel : écrit, relit puis supprime un fichier témoin.
     */
    public function testConnection(NasConfig $config): array
    {
        try {
            $disk = $this->diskFor($config);
            $probe = '.delotrans_test_' . Str::random(8);

            $disk->put($probe, 'ok');
            $lu = $disk->get($probe);
            $disk->delete($probe);

            if ($lu !== 'ok') {
                return ['success' => false, 'message' => 'Lecture du fichier témoin incorrecte.'];
            }

            return ['success' => true, 'message' => 'Connexion établie (lecture et écriture OK).'];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Espace disque mesuré sur le point de montage (SMB / NFS).
     * Pour FTP, on renvoie les dernières valeurs connues.
     */
    public function getDiskUsage(NasConfig $config): array
    {
        if (in_array($config->protocol, ['smb', 'nfs'], true) && is_dir($config->base_path)) {
            $total = @disk_total_space($config->base_path);
            $free = @disk_free_space($config->base_path);

            if ($total !== false && $free !== false) {
                return [
                    'total_bytes' => (int) $total,
                    'used_bytes' => (int) ($total - $free),
                    'free_bytes' => (int) $free,
                ];
            }
        }

        return [
            'total_bytes' => $config->total_space_bytes,
            'used_bytes' => $config->used_space_bytes,
        ];
    }

    /**
     * Construit le disque Laravel correspondant à un NAS enregistré.
     */
    private function diskFor(NasConfig $config): Filesystem
    {
        return match ($config->protocol) {
            'smb', 'nfs' => $this->localMountDisk($config),
            'ftp' => Storage::build([
                'driver' => 'ftp',
                'host' => $config->host,
                'port' => (int) $config->port,
                'username' => $config->username,
                'password' => $config->credentials_encrypted,
                'root' => $config->base_path,
                'throw' => true,
            ]),
            default => throw new \RuntimeException(
                "Le protocole {$config->protocol} n'est pas encore pris en charge. Utilisez SMB ou NFS (partage monté)."
            ),
        };
    }

    private function localMountDisk(NasConfig $config): Filesystem
    {
        if (! is_dir($config->base_path)) {
            throw new \RuntimeException(
                "Le dossier {$config->base_path} est introuvable. Le partage du NAS est-il bien monté sur le serveur ?"
            );
        }

        return Storage::build([
            'driver' => 'local',
            'root' => $config->base_path,
            'throw' => true,
        ]);
    }
}