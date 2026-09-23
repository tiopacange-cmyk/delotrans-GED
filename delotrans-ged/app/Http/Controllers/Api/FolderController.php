<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Folder\StoreFolderRequest;
use App\Http\Requests\Folder\MoveFolderRequest;
use App\Models\Folder;
use Illuminate\Http\Request;

class FolderController extends Controller
{
    public function index(Request $request)
    {
        $folders = Folder::query()
            ->where('parent_id', $request->integer('parent_id') ?: null)
            ->with(['category', 'client'])
            ->withCount('documents')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return response()->json($folders);
    }

    public function store(StoreFolderRequest $request)
    {
        $folder = Folder::create($request->validated() + ['created_by' => $request->user()->id]);
        $folder->rebuildPath();

        return response()->json(['data' => $folder], 201);
    }

    public function show(Folder $folder)
    {
        $folder->load(['children', 'documents', 'category', 'client']);

        return response()->json(['data' => $folder]);
    }

    public function update(Request $request, Folder $folder)
    {
        abort_unless($request->user()->hasPermission('folders.update'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $folder->update($data);

        return response()->json(['data' => $folder]);
    }

    public function move(MoveFolderRequest $request, Folder $folder)
    {
        abort_if(
            $this->isDescendant($folder, $request->parent_id),
            422,
            'Déplacement invalide : le dossier cible est un sous-dossier du dossier déplacé.'
        );

        $folder->update(['parent_id' => $request->parent_id]);
        $folder->refresh();
        $folder->rebuildPath();
        $folder->children->each(fn ($child) => $child->rebuildPath());

        return response()->json(['data' => $folder]);
    }

    public function destroy(Request $request, Folder $folder)
    {
        abort_unless($request->user()->hasPermission('folders.delete'), 403);

        $folder->delete();

        return response()->json(['message' => 'Dossier déplacé vers la corbeille.']);
    }

    public function breadcrumb(Folder $folder)
    {
        $trail = collect();
        $current = $folder;

        while ($current) {
            $trail->prepend($current);
            $current = $current->parent;
        }

        return response()->json(['data' => $trail->values()]);
    }

    private function isDescendant(Folder $folder, ?int $targetParentId): bool
    {
        if (!$targetParentId) {
            return false;
        }

        $target = Folder::find($targetParentId);

        while ($target) {
            if ($target->id === $folder->id) {
                return true;
            }
            $target = $target->parent;
        }

        return false;
    }
}
