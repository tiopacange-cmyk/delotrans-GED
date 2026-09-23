<?php

use App\Http\Controllers\Api\{
    AuthController,
    ClientController,
    CategoryController,
    FolderController,
    DocumentController,
    SearchController,
    DashboardController,
    DocumentVersionController,
    DocumentShareController,
    NasConfigController,
    BackupController,
    ActivityLogController,
    NotificationController,
};
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Publiques
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Partage public (sans compte, limité à 20 requêtes/minute)
    Route::prefix('public/shares')->middleware('throttle:20,1')->group(function () {
        Route::get('/{token}', [DocumentShareController::class, 'publicShow']);
        Route::post('/{token}/unlock', [DocumentShareController::class, 'unlock']);
        Route::get('/{token}/download', [DocumentShareController::class, 'download'])->name('shares.public.download');
    });

    // Authentifiées
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Clients
        Route::apiResource('clients', ClientController::class)->except(['destroy']);
        Route::delete('/clients/{client}', [ClientController::class, 'destroy']);
        Route::get('/clients/{client}/documents', [ClientController::class, 'documents']);
        Route::get('/clients/{client}/folders', [ClientController::class, 'folders']);

        // Catégories
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Dossiers
        Route::get('/folders', [FolderController::class, 'index']);
        Route::post('/folders', [FolderController::class, 'store']);
        Route::get('/folders/{folder}', [FolderController::class, 'show']);
        Route::put('/folders/{folder}', [FolderController::class, 'update']);
        Route::put('/folders/{folder}/move', [FolderController::class, 'move']);
        Route::delete('/folders/{folder}', [FolderController::class, 'destroy']);
        Route::get('/folders/{folder}/breadcrumb', [FolderController::class, 'breadcrumb']);

        // Documents
        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::get('/documents/{document}', [DocumentController::class, 'show']);
        Route::put('/documents/{document}', [DocumentController::class, 'update']);
        Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);
        Route::get('/documents/{document}/preview', [DocumentController::class, 'preview']);

        // Recherche
        Route::get('/search/documents', [SearchController::class, 'documents']);

        // Tableau de bord
        Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
        Route::get('/dashboard/recent-documents', [DashboardController::class, 'recentDocuments']);

        // ===== V2 =====

        // Versions des documents
        Route::get('/documents/{document}/versions', [DocumentVersionController::class, 'index']);
        Route::post('/documents/{document}/versions', [DocumentVersionController::class, 'store']);
        Route::get('/documents/{document}/versions/{version}/download', [DocumentVersionController::class, 'download']);
        Route::post('/documents/{document}/versions/{version}/restore', [DocumentVersionController::class, 'restore']);
        Route::delete('/documents/{document}/versions/{version}', [DocumentVersionController::class, 'destroy']);

        // Partages (gestion)
        Route::get('/documents/{document}/shares', [DocumentShareController::class, 'index']);
        Route::post('/documents/{document}/shares', [DocumentShareController::class, 'store']);
        Route::delete('/shares/{share}', [DocumentShareController::class, 'destroy']);

        // NAS
        Route::get('/nas', [NasConfigController::class, 'index']);
        Route::post('/nas', [NasConfigController::class, 'store']);
        Route::put('/nas/{config}', [NasConfigController::class, 'update']);
        Route::delete('/nas/{config}', [NasConfigController::class, 'destroy']);
        Route::post('/nas/{config}/test', [NasConfigController::class, 'test']);
        Route::get('/nas/{config}/status', [NasConfigController::class, 'status']);

        // Sauvegardes
        Route::get('/backups', [BackupController::class, 'index']);
        Route::post('/backups/run', [BackupController::class, 'run']);
        Route::get('/backups/{backup}/download', [BackupController::class, 'download']);
        Route::delete('/backups/{backup}', [BackupController::class, 'destroy']);

        // Journal d'activité
        Route::get('/logs', [ActivityLogController::class, 'index']);
        Route::get('/logs/{log}', [ActivityLogController::class, 'show']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);
    });
});