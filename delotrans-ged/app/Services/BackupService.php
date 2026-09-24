<?php

namespace App\Services;

use App\Models\Backup;

class BackupService
{
    public function run(string $type, ?int $nasConfigId, ?int $createdBy): Backup
    {
        $backup = Backup::create([
            'type' => $type,
            'file_path' => '',
            'status' => 'pending',
            'nas_config_id' => $nasConfigId,
            'created_by' => $createdBy,
        ]);

        \App\Jobs\RunBackupJob::dispatch($backup);

        return $backup;
    }

    public function execute(Backup $backup): void
    {
        $backup->update(['status' => 'running', 'started_at' => now()]);

        try {
            $filename = match ($backup->type) {
                'database' => $this->dumpDatabase(),
                'config' => $this->dumpConfig(),
                'full' => $this->dumpFull(),
            };

            $backup->update([
                'file_path' => $filename,
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            if ($backup->created_by && ($demandeur = \App\Models\User::find($backup->created_by))) {
                app(NotificationService::class)->notify($demandeur, 'backup.completed', 'Sauvegarde terminée', "Votre sauvegarde « {$backup->type} » s'est terminée avec succès.");
            }
        } catch (\Throwable $e) {
            $backup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            app(NotificationService::class)->notifyAdmins(
                'backup.failed',
                'Échec de sauvegarde',
                "La sauvegarde « {$backup->type} » a échoué : " . $e->getMessage()
            );
        }
    }

    private function dumpDatabase(): string
    {
        $connection = config('database.default');
        $filename = 'backups/db_' . now()->format('Y_m_d_His') . '.sqlite';

        if ($connection === 'sqlite') {
            $source = database_path('database.sqlite');
            $destination = storage_path('app/' . $filename);
            @mkdir(dirname($destination), 0755, true);
            copy($source, $destination);

            return $filename;
        }

        // MySQL : utiliser mysqldump via Process, voir manuel d'installation.
        $filename = 'backups/db_' . now()->format('Y_m_d_His') . '.sql';
        $db = config('database.connections.mysql');
        $path = storage_path('app/' . $filename);
        @mkdir(dirname($path), 0755, true);
        $command = sprintf(
            'mysqldump -h%s -u%s -p%s %s > %s',
            escapeshellarg($db['host']), escapeshellarg($db['username']),
            escapeshellarg($db['password']), escapeshellarg($db['database']), $path
        );
        exec($command);

        return $filename;
    }

    /**
     * Sauvegarde complète : une archive contenant la base de données et la configuration.
     */
    private function dumpFull(): string
    {
        $fichierBase = $this->dumpDatabase();
        $cheminBase = storage_path('app/' . $fichierBase);

        $fichiers = [$cheminBase => 'base/' . basename($cheminBase)];
        if (file_exists(base_path('.env'))) {
            $fichiers[base_path('.env')] = 'config/.env';
        }

        $archive = $this->creerArchive('backups/complete_' . now()->format('Y_m_d_His'), $fichiers);
        @unlink($cheminBase); // la copie de la base est maintenant dans l'archive

        return $archive;
    }

    /**
     * Sauvegarde de la configuration (.env).
     */
    private function dumpConfig(): string
    {
        $fichiers = [];
        if (file_exists(base_path('.env'))) {
            $fichiers[base_path('.env')] = '.env';
        }

        return $this->creerArchive('backups/config_' . now()->format('Y_m_d_His'), $fichiers);
    }

    /**
     * Crée une archive ZIP si l'extension zip est disponible, sinon une archive .tar.gz.
     * Retourne le chemin relatif (dans storage/app) de l'archive créée.
     */
    private function creerArchive(string $nomSansExtension, array $fichiers): string
    {
        $base = storage_path('app/' . $nomSansExtension);
        @mkdir(dirname($base), 0755, true);

        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive();
            if ($zip->open($base . '.zip', \ZipArchive::CREATE) !== true) {
                throw new \RuntimeException("Impossible de créer l'archive ZIP.");
            }
            foreach ($fichiers as $source => $nomDansArchive) {
                $zip->addFile($source, $nomDansArchive);
            }
            $zip->close();

            return $nomSansExtension . '.zip';
        }

        $tar = new \PharData($base . '.tar');
        foreach ($fichiers as $source => $nomDansArchive) {
            $tar->addFile($source, $nomDansArchive);
        }
        $tar->compress(\Phar::GZ);
        unset($tar);
        @unlink($base . '.tar');

        return $nomSansExtension . '.tar.gz';
    }
}
