<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Backup;
use App\Services\BackupService;
use App\Services\NasStorageService;
use Illuminate\Http\Request;

class BackupController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Backup::latest()->paginate(15)]);
    }

    public function run(Request $request, BackupService $backupService)
    {
        abort_unless($request->user()->hasPermission('backups.run'), 403);

        $data = $request->validate([
            'type' => ['required', 'in:database,config,full'],
            'nas_config_id' => ['nullable', 'exists:nas_configs,id'],
        ]);

        $backup = $backupService->run($data['type'], $data['nas_config_id'] ?? null, $request->user()->id);

        return response()->json(['data' => $backup], 201);
    }

    public function download(Request $request, Backup $backup)
    {
        abort_unless($request->user()->hasPermission('backups.view'), 403);
        abort_if($backup->status !== 'completed', 422, 'Cette sauvegarde n\'est pas terminée.');

        return response()->download(storage_path('app/' . $backup->file_path));
    }

    public function destroy(Request $request, Backup $backup)
    {
        abort_unless($request->user()->hasPermission('backups.delete'), 403);

        @unlink(storage_path('app/' . $backup->file_path));
        $backup->delete();

        return response()->json(['message' => 'Sauvegarde supprimée.']);
    }
}
