<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NasConfig;
use App\Services\NasStorageService;
use Illuminate\Http\Request;

class NasConfigController extends Controller
{
    public function index()
    {
        return response()->json(['data' => NasConfig::all()]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasPermission('nas.manage'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'driver' => ['required', 'in:synology,qnap,truenas'],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'protocol' => ['required', 'in:smb,nfs,webdav,ftp'],
            'username' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string'],
            'base_path' => ['required', 'string', 'max:500'],
        ]);

        $nas = NasConfig::create([
            ...$data,
            'credentials_encrypted' => $data['password'],
        ]);

        return response()->json(['data' => $nas], 201);
    }

    public function update(Request $request, NasConfig $config)
    {
        abort_unless($request->user()->hasPermission('nas.manage'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'host' => ['sometimes', 'string', 'max:255'],
            'port' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'password' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (!empty($data['password'])) {
            $data['credentials_encrypted'] = $data['password'];
        }
        unset($data['password']);

        $config->update($data);

        return response()->json(['data' => $config]);
    }

    public function destroy(Request $request, NasConfig $config)
    {
        abort_unless($request->user()->hasPermission('nas.manage'), 403);

        $config->delete();

        return response()->json(['message' => 'Configuration NAS supprimée.']);
    }

    public function test(Request $request, NasConfig $config, NasStorageService $nasStorage)
    {
        abort_unless($request->user()->hasPermission('nas.test_connection'), 403);

        $result = $nasStorage->testConnection($config);

        $config->update([
            'status' => $result['success'] ? 'online' : 'error',
            'last_checked_at' => now(),
        ]);

        return response()->json(['data' => $result]);
    }

    public function status(NasConfig $config, NasStorageService $nasStorage)
    {
        $usage = $nasStorage->getDiskUsage($config);

        // État réel : pour SMB/NFS, le point de montage doit exister et être accessible en écriture
        $enLigne = in_array($config->protocol, ['smb', 'nfs'], true)
            ? (is_dir($config->base_path) && is_writable($config->base_path))
            : $config->status === 'online';
        $statut = $enLigne ? 'online' : 'offline';

        // Mémorise l'état et l'espace mesurés (sans polluer le journal)
        $config->forceFill([
            'status' => $statut,
            'total_space_bytes' => $usage['total_bytes'] ?? $config->total_space_bytes,
            'used_space_bytes' => $usage['used_bytes'] ?? $config->used_space_bytes,
        ])->saveQuietly();

        return response()->json(['data' => $usage + ['status' => $statut]]);
    }
}
