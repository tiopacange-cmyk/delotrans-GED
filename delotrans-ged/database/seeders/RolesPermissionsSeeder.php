<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Rôles de départ DELOTRANS GED : Administrateur, Gestionnaire, Consultation.
 * Peut être relancé sans risque : les permissions de chaque rôle sont réalignées.
 */
class RolesPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Nouvelles permissions : gestion des utilisateurs et des rôles
        foreach ([
            ['slug' => 'users.view',   'name' => 'Voir les utilisateurs',   'module' => 'users'],
            ['slug' => 'users.manage', 'name' => 'Gérer les utilisateurs',  'module' => 'users'],
            ['slug' => 'roles.manage', 'name' => 'Gérer les rôles et droits', 'module' => 'roles'],
        ] as $p) {
            Permission::firstOrCreate(['slug' => $p['slug']], $p);
        }

        $roles = [
            'admin' => [
                'name' => 'Administrateur',
                'description' => 'Accès total au système',
                'permissions' => '*',
            ],
            'manager' => [
                'name' => 'Gestionnaire',
                'description' => 'Gère les documents, dossiers, clients et partages',
                'permissions' => [
                    'clients.view', 'clients.create', 'clients.update', 'clients.delete',
                    'categories.view', 'categories.create', 'categories.update', 'categories.delete',
                    'folders.view', 'folders.create', 'folders.update', 'folders.move', 'folders.delete',
                    'documents.view', 'documents.create', 'documents.update', 'documents.download', 'documents.delete',
                    'documents.version.create', 'documents.version.restore',
                    'shares.create', 'shares.revoke_own',
                    'logs.view_own',
                ],
            ],
            'user' => [
                'name' => 'Consultation',
                'description' => 'Consulte et télécharge les documents',
                'permissions' => [
                    'clients.view', 'categories.view', 'folders.view',
                    'documents.view', 'documents.download',
                    'logs.view_own',
                ],
            ],
        ];

        foreach ($roles as $slug => $def) {
            $role = Role::updateOrCreate(
                ['slug' => $slug],
                ['name' => $def['name'], 'description' => $def['description']]
            );

            $ids = $def['permissions'] === '*'
                ? Permission::pluck('id')
                : Permission::whereIn('slug', $def['permissions'])->pluck('id');

            $role->permissions()->sync($ids);
        }
    }
}
