<?php
// routes/api-v2-additions.php
// Contenu à insérer dans routes/api.php, À L'INTÉRIEUR du groupe
// Route::prefix('v1')->group(function () { ... Route::middleware('auth:sanctum')->group(function () { ... } ) ... });
// (c'est-à-dire dans la partie authentifiée existante, pas au niveau racine).

use App\Http\Controllers\Api\{
    DocumentVersionController,
    DocumentShareController,
    NasConfigController,
    BackupController,
    ActivityLogController,
    NotificationController,
};

// --- À ajouter DANS le groupe auth:sanctum existant ---

// Versions de documents
Route::get('/documents/{document}/versions', [DocumentVersionController::class, 'index']);
Route::post('/documents/{document}/versions', [DocumentVersionController::class, 'store']);
Route::get('/documents/{document}/versions/{version}/download', [DocumentVersionController::class, 'download']);
Route::put('/documents/{document}/versions/{version}/restore', [DocumentVersionController::class, 'restore']);
Route::delete('/documents/{document}/versions/{version}', [DocumentVersionController::class, 'destroy']);

// Partage de documents
Route::get('/documents/{document}/shares', [DocumentShareController::class, 'index']);
Route::post('/documents/{document}/shares', [DocumentShareController::class, 'store']);
Route::delete('/shares/{share}', [DocumentShareController::class, 'destroy']);

// Gestion NAS
Route::get('/nas/configs', [NasConfigController::class, 'index']);
Route::post('/nas/configs', [NasConfigController::class, 'store']);
Route::put('/nas/configs/{config}', [NasConfigController::class, 'update']);
Route::delete('/nas/configs/{config}', [NasConfigController::class, 'destroy']);
Route::post('/nas/configs/{config}/test', [NasConfigController::class, 'test']);
Route::get('/nas/configs/{config}/status', [NasConfigController::class, 'status']);

// Sauvegardes
Route::get('/backups', [BackupController::class, 'index']);
Route::post('/backups/run', [BackupController::class, 'run']);
Route::get('/backups/{backup}/download', [BackupController::class, 'download']);
Route::delete('/backups/{backup}', [BackupController::class, 'destroy']);

// Journalisation
Route::get('/logs', [ActivityLogController::class, 'index']);
Route::get('/logs/{log}', [ActivityLogController::class, 'show']);

// Notifications
Route::get('/notifications', [NotificationController::class, 'index']);
Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

// --- À ajouter EN DEHORS du groupe auth:sanctum, dans les routes publiques ---
// (avec ->middleware('throttle:20,1') recommandé)

// Route::prefix('public/shares')->middleware('throttle:20,1')->group(function () {
//     Route::get('/{token}', [DocumentShareController::class, 'publicShow']);
//     Route::post('/{token}/unlock', [DocumentShareController::class, 'unlock']);
//     Route::get('/{token}/download', [DocumentShareController::class, 'download']);
// });
