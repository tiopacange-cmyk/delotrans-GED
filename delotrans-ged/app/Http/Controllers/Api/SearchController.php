<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function documents(Request $request)
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'folder_id' => ['nullable', 'exists:folders,id'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $results = Document::query()
            ->when($request->q, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->q}%")
                ->orWhereHas('category', fn ($c) => $c->where('name', 'like', "%{$request->q}%"))
                ->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%{$request->q}%")->orWhere('code', 'like', "%{$request->q}%"))
            ))
            ->when($request->client_id, fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->category_id, fn ($q) => $q->where('category_id', $request->category_id))
            ->when($request->folder_id, fn ($q) => $q->where('folder_id', $request->folder_id))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->with(['client', 'category', 'folder'])
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($results);
    }
}
