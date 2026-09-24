<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// ===== Sauvegardes automatiques (V2) =====
Illuminate\Support\Facades\Schedule::call(function () {
    app(App\Services\BackupService::class)->run('database', null, null);
})->dailyAt('02:00')->name('sauvegarde-base-quotidienne');

Illuminate\Support\Facades\Schedule::call(function () {
    app(App\Services\BackupService::class)->run('config', null, null);
})->weeklyOn(0, '03:00')->name('sauvegarde-config-hebdo');

// ===== Surveillance des NAS (V2) =====
Illuminate\Support\Facades\Schedule::call(function () {
    $service = app(App\Services\NotificationService::class);

    foreach (App\Models\NasConfig::all() as $nas) {
        if (! in_array($nas->protocol, ['smb', 'nfs'], true)) {
            continue;
        }

        $enLigne = is_dir($nas->base_path) && is_writable($nas->base_path);
        $statut = $enLigne ? 'online' : 'offline';

        if ($statut !== $nas->status) {
            $enLigne
                ? $service->notifyAdmins('nas.online', 'NAS de nouveau en ligne', "« {$nas->name} » est de nouveau accessible.")
                : $service->notifyAdmins('nas.offline', 'NAS hors ligne', "« {$nas->name} » n'est plus accessible. Vérifiez le montage du partage sur le serveur.");
        }

        $maj = ['status' => $statut];

        if ($enLigne) {
            $total = @disk_total_space($nas->base_path);
            $libre = @disk_free_space($nas->base_path);

            if ($total) {
                $avant = $nas->total_space_bytes ? $nas->used_space_bytes / $nas->total_space_bytes * 100 : 0;
                $maintenant = ($total - $libre) / $total * 100;

                if ($maintenant >= 90 && $avant < 90) {
                    $service->notifyAdmins('nas.full', 'NAS presque plein', "« {$nas->name} » est rempli à " . round($maintenant) . " %.");
                }

                $maj['total_space_bytes'] = (int) $total;
                $maj['used_space_bytes'] = (int) ($total - $libre);
            }
        }

        $nas->forceFill($maj)->saveQuietly();
    }
})->hourly()->name('surveillance-nas');
