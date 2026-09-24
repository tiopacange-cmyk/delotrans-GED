<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(
            $request->user()->hasPermission('roles.manage') || $request->user()->hasPermission('users.view'),
            403
        );

        $roles = Role::withCount('users')->with('permissions:id,slug')->orderBy('id')->get();

        return response()->json(['data' => $roles]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->hasPermission('roles.manage'), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:roles,name'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $slug = Str::slug($data['name']);
        $base = $slug;
        $i = 2;
        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        $role = Role::create(['name' => $data['name'], 'slug' => $slug, 'description' => $data['description'] ?? null]);
        $role->permissions()->sync($data['permissions'] ?? []);

        return response()->json(['data' => $role->load('permissions:id,slug')->loadCount('users')], 201);
    }

    public function update(Request $request, Role $role)
    {
        abort_unless($request->user()->hasPermission('roles.manage'), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', 'unique:roles,name,' . $role->id],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['integer', 'exists:permissions,id'],
        ]);

        $role->update(collect($data)->only(['name', 'description'])->all());

        if (array_key_exists('permissions', $data)) {
            // L'administrateur garde toujours toutes les permissions
            $role->permissions()->sync(
                $role->slug === 'admin' ? Permission::pluck('id') : $data['permissions']
            );
        }

        return response()->json(['data' => $role->load('permissions:id,slug')->loadCount('users')]);
    }

    public function destroy(Request $request, Role $role)
    {
        abort_unless($request->user()->hasPermission('roles.manage'), 403);
        abort_if(in_array($role->slug, ['admin', 'manager', 'user'], true), 422, 'Les rôles de base ne peuvent pas être supprimés.');
        abort_if($role->users()->exists(), 422, 'Ce rôle est encore attribué à des utilisateurs.');

        $role->permissions()->detach();
        $role->delete();

        return response()->json(['message' => 'Rôle supprimé.']);
    }
}
