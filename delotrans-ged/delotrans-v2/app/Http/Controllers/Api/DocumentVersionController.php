<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Document\StoreDocumentVersionRequest;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Services\NasStorageService;
use Illuminate\Http\Request;

class DocumentVersionController extends Controller
{
    public function __construct(private NasStorageService $nasStorage)
    {
    }

    public function index(Document $document)
    {
        return response()->json(['data' => $document->versions()->orderByDesc('version_number')->get()]);
    }

    public function store(StoreDocumentVersionRequest $request, Document $document)
    {
        $file = $request->file('file');
        $nasPath = $this->nasStorage->store($file, $document->folder_id);
        $nextNumber = $document->versions()->max('version_number') + 1;

        $version = $document->versions()->create([
            'version_number' => $nextNumber,
            'file_path' => $nasPath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'checksum' => hash_file('sha256', $file->getRealPath()),
            'comment' => $request->comment,
            'created_by' => $request->user()->id,
        ]);

        $document->update([
            'current_version_id' => $version->id,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'nas_path' => $nasPath,
        ]);

        return response()->json(['data' => $version], 201);
    }

    public function download(Document $document, DocumentVersion $version)
    {
        abort_unless(request()->user()->hasPermission('documents.download'), 403);

        return $this->nasStorage->streamDownload($version->file_path, $document->name);
    }

    public function restore(Request $request, Document $document, DocumentVersion $version)
    {
        abort_unless($request->user()->hasPermission('documents.version.restore'), 403);

        $document->update(['current_version_id' => $version->id]);

        return response()->json(['data' => $document->load('currentVersion')]);
    }

    public function destroy(Request $request, Document $document, DocumentVersion $version)
    {
        abort_unless($request->user()->hasPermission('documents.version.delete'), 403);
        abort_if($document->current_version_id === $version->id, 422, 'Impossible de supprimer la version courante.');

        $this->nasStorage->delete($version->file_path);
        $version->delete();

        return response()->json(['message' => 'Version supprimée.']);
    }
}
