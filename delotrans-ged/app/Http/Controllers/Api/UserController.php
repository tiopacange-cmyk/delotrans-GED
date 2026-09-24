<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        abort_unless($request->user()->hasPermission('users.view'), 403);

        $users = User::query()
            ->with('role:id,name,slug')
            ->when($request->q, fn ($q) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$request->q}%")
                ->orWhere('email', 'like', "%{$request->q}%")))
            ->when($request->role_id, fn ($q) => $q->where('role_id', $request->role_id))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 20));

        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasPermission('users.manage'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role_id' => ['required', 'exists:roles,id'],
            'password' => ['required', 'string', 'min:8'],
            'is_active' => ['boolean'],
        ]);

        $data['password'] = Hash::make($data['password']);
        $data['is_active'] = $data['is_active'] ?? true;

        $user = User::create($data);

        return response()->json(['data' => $user->load('role:id,name,slug')], 201);
    }

    public function update(Request $request, User $user)
    {
        abort_unless($request->user()->hasPermission('users.manage'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'email' => ['sometimes', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'role_id' => ['sometimes', 'exists:roles,id'],
            'password' => ['nullable', 'string', 'min:8'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $moiMeme = $request->user()->id === $user->id;

        // Garde-fous : on ne peut ni se désactiver ni changer son propre rôle
        if ($moiMeme && array_key_exists('is_active', $data) && ! $data['is_active']) {
            abort(422, 'Vous ne pouvez pas désactiver votre propre compte.');
        }
        if ($moiMeme && isset($data['role_id']) && (int) $data['role_id'] !== (int) $user->role_id) {
            abort(422, 'Vous ne pouvez pas modifier votre propre rôle.');
        }

        // On ne retire jamais le dernier administrateur actif
        $perdAdmin = (isset($data['role_id']) && (int) $data['role_id'] !== (int) $user->role_id)
            || (array_key_exists('is_active', $data) && ! $data['is_active']);
        if ($perdAdmin && $this->estDernierAdmin($user)) {
            abort(422, 'Impossible : c\'est le dernier administrateur actif.');
        }

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        // Compte désactivé : déconnexion immédiate
        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $user->fresh()->load('role:id,name,slug')]);
    }

    public function destroy(Request $request, User $user)
    {
        abort_unless($request->user()->hasPermission('users.manage'), 403);
        abort_if($request->user()->id === $user->id, 422, 'Vous ne pouvez pas supprimer votre propre compte.');
        abort_if($this->estDernierAdmin($user), 422, 'Impossible : c\'est le dernier administrateur actif.');

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    private function estDernierAdmin(User $user): bool
    {
        if ($user->role?->slug !== 'admin' || ! $user->is_active) {
            return false;
        }

        return User::where('is_active', true)
            ->whereHas('role', fn ($q) => $q->where('slug', 'admin'))
            ->count() <= 1;
    }
}
