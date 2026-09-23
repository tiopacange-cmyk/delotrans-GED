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
                'full' => $this->dumpDatabase(),
            };

            $backup->update([
                'file_path' => $filename,
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            $backup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
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

    private function dumpConfig(): string
    {
        $filename = 'backups/config_' . now()->format('Y_m_d_His') . '.zip';
        $path = storage_path('app/' . $filename);
        @mkdir(dirname($path), 0755, true);

        $zip = new \ZipArchive();
        $zip->open($path, \ZipArchive::CREATE);
        if (file_exists(base_path('.env'))) {
            $zip->addFile(base_path('.env'), '.env');
        }
        $zip->close();

        return $filename;
    }
}
