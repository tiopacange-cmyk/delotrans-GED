<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $query = ActivityLog::query()->with('user')->latest();

        if (!$request->user()->hasPermission('logs.view_all')) {
            abort_unless($request->user()->hasPermission('logs.view_own'), 403);
            $query->where('user_id', $request->user()->id);
        }

        return response()->json(['data' => $query->paginate(20)]);
    }

    public function show(Request $request, ActivityLog $log)
    {
        $canViewAll = $request->user()->hasPermission('logs.view_all');
        $isOwn = $log->user_id === $request->user()->id;
        abort_unless($canViewAll || ($isOwn && $request->user()->hasPermission('logs.view_own')), 403);

        return response()->json(['data' => $log->load('user')]);
    }
}
