<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Category::withCount('documents')->orderBy('name')->get()]);
    }

    public function store(StoreCategoryRequest $request)
    {
        $category = Category::create($request->validated() + ['slug' => Str::slug($request->name)]);

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, Category $category)
    {
        abort_unless($request->user()->hasPermission('categories.update'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $category->update($data);

        return response()->json(['data' => $category]);
    }

    public function destroy(Request $request, Category $category)
    {
        abort_unless($request->user()->hasPermission('categories.delete'), 403);

        $category->delete();

        return response()->json(['message' => 'Catégorie supprimée.']);
    }
}
