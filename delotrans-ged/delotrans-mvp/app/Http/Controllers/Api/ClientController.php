<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\StoreClientRequest;
use App\Http\Requests\Client\UpdateClientRequest;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clients = Client::query()
            ->when($request->q, fn ($q) => $q->where('name', 'like', "%{$request->q}%")
                ->orWhere('code', 'like', "%{$request->q}%"))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($clients);
    }

    public function store(StoreClientRequest $request)
    {
        $client = Client::create($request->validated() + ['created_by' => $request->user()->id]);

        return response()->json(['data' => $client], 201);
    }

    public function show(Client $client)
    {
        return response()->json(['data' => $client]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $client->update($request->validated());

        return response()->json(['data' => $client]);
    }

    public function destroy(Request $request, Client $client)
    {
        abort_unless($request->user()->hasPermission('clients.delete'), 403);

        $client->delete();

        return response()->json(['message' => 'Client supprimé.']);
    }

    public function documents(Client $client)
    {
        return response()->json(['data' => $client->documents()->with('category')->paginate(15)]);
    }

    public function folders(Client $client)
    {
        return response()->json(['data' => $client->folders()->paginate(15)]);
    }
}
