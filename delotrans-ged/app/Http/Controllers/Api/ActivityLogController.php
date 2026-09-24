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

        // Filtres
        $query
            ->when($request->module, fn ($q) => $q->where('module', $request->module))
            ->when($request->action, fn ($q) => $q->where('action', 'like', "%.{$request->action}"))
            ->when($request->date_from, fn ($q) => $q->whereDate('created_at', '>=', $request->date_from))
            ->when($request->date_to, fn ($q) => $q->whereDate('created_at', '<=', $request->date_to))
            ->when($request->q, fn ($q) => $q->where(fn ($w) => $w
                ->where('description', 'like', "%{$request->q}%")
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$request->q}%"))
            ));

        return response()->json(['data' => $query->paginate($request->integer('per_page', 20))]);
    }

    public function show(Request $request, ActivityLog $log)
    {
        $canViewAll = $request->user()->hasPermission('logs.view_all');
        $isOwn = $log->user_id === $request->user()->id;
        abort_unless($canViewAll || ($isOwn && $request->user()->hasPermission('logs.view_own')), 403);

        return response()->json(['data' => $log->load('user')]);
    }
}
