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
