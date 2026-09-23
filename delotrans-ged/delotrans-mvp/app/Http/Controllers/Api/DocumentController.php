<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Document\StoreDocumentRequest;
use App\Models\Document;
use App\Services\NasStorageService;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(private NasStorageService $nasStorage)
    {
    }

    public function index(Request $request)
    {
        $documents = Document::query()
            ->when($request->folder_id, fn ($q) => $q->where('folder_id', $request->folder_id))
            ->when($request->client_id, fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->category_id, fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->q, fn ($q) => $q->where('name', 'like', "%{$request->q}%"))
            ->with(['category', 'client'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($documents);
    }

    public function store(StoreDocumentRequest $request)
    {
        $file = $request->file('file');
        $nasPath = $this->nasStorage->store($file, $request->folder_id);

        $document = Document::create([
            'name' => $request->name ?? $file->getClientOriginalName(),
            'folder_id' => $request->folder_id,
            'client_id' => $request->client_id,
            'category_id' => $request->category_id,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'nas_path' => $nasPath,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => $document], 201);
    }

    public function show(Document $document)
    {
        return response()->json(['data' => $document->load(['folder', 'client', 'category'])]);
    }

    public function update(Request $request, Document $document)
    {
        abort_unless($request->user()->hasPermission('documents.update'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'folder_id' => ['sometimes', 'exists:folders,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'status' => ['sometimes', 'in:draft,published,archived'],
        ]);

        $document->update($data);

        return response()->json(['data' => $document]);
    }

    public function destroy(Request $request, Document $document)
    {
        abort_unless($request->user()->hasPermission('documents.delete'), 403);

        $document->delete();

        return response()->json(['message' => 'Document déplacé vers la corbeille.']);
    }

    public function download(Document $document)
    {
        abort_unless(request()->user()->hasPermission('documents.download'), 403);

        return $this->nasStorage->streamDownload($document->nas_path, $document->name);
    }

    public function preview(Document $document)
    {
        return $this->nasStorage->streamInline($document->nas_path, $document->mime_type);
    }
}
