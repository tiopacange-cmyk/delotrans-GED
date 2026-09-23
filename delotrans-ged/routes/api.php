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
    });
});
