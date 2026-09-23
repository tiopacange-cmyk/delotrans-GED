<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Share\StoreShareRequest;
use App\Http\Requests\Share\UnlockShareRequest;
use App\Models\Document;
use App\Models\DocumentShare;
use App\Services\NasStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class DocumentShareController extends Controller
{
    public function index(Document $document)
    {
        return response()->json(['data' => $document->shares]);
    }

    public function store(StoreShareRequest $request, Document $document)
    {
        $share = $document->shares()->create([
            'password_hash' => $request->password ? Hash::make($request->password) : null,
            'expires_at' => $request->expires_at,
            'max_downloads' => $request->max_downloads,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $share], 201);
    }

    public function destroy(Request $request, DocumentShare $share)
    {
        $isOwner = $share->created_by === $request->user()->id;
        abort_unless(
            $request->user()->hasPermission('shares.revoke_any') || ($isOwner && $request->user()->hasPermission('shares.revoke_own')),
            403
        );

        $share->update(['revoked_at' => now()]);

        return response()->json(['message' => 'Partage révoqué.']);
    }

    // --- Endpoints publics, protégés par throttle dans routes/api.php ---

    public function publicShow(string $token)
    {
        $share = DocumentShare::where('token', $token)->firstOrFail();
        abort_if($share->isExpired(), 410, 'Ce lien de partage a expiré.');

        return response()->json(['data' => [
            'document_name' => $share->document->name,
            'requires_password' => (bool) $share->password_hash,
        ]]);
    }

    public function unlock(UnlockShareRequest $request, string $token)
    {
        $share = DocumentShare::where('token', $token)->firstOrFail();
        abort_if($share->isExpired(), 410, 'Ce lien de partage a expiré.');
        abort_unless(Hash::check($request->password, $share->password_hash), 403, 'Mot de passe incorrect.');

        return response()->json(['message' => 'Accès autorisé.']);
    }

    public function download(string $token, NasStorageService $nasStorage)
    {
        $share = DocumentShare::where('token', $token)->firstOrFail();
        abort_if($share->isExpired(), 410, 'Ce lien de partage a expiré.');

        $share->increment('download_count');

        return $nasStorage->streamDownload(
            $share->document->currentVersion->file_path,
            $share->document->name
        );
    }
}
