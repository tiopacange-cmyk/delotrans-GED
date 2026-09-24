<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->hasPermission('roles.manage'), 403);

        return response()->json([
            'data' => Permission::orderBy('module')->orderBy('id')->get(['id', 'name', 'slug', 'module'])->groupBy('module'),
        ]);
    }
}
