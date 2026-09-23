<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json(['data' => [
            'documents' => Document::count(),
            'clients' => Client::count(),
            'folders' => Folder::count(),
            'users' => User::count(),
        ]]);
    }

    public function recentDocuments()
    {
        return response()->json([
            'data' => Document::with(['client', 'category'])->latest()->limit(10)->get(),
        ]);
    }
}
