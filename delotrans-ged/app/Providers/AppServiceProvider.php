<?php

namespace App\Providers;

use App\Models\Category;
use App\Models\Client;
use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\DocumentVersion;
use App\Models\Folder;
use App\Models\NasConfig;
use App\Models\User;
use App\Observers\AuditObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Journalisation automatique des actions (V2)
        foreach ([
            Client::class,
            Category::class,
            Folder::class,
            Document::class,
            DocumentVersion::class,
            DocumentShare::class,
            NasConfig::class,
            User::class,
        ] as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}