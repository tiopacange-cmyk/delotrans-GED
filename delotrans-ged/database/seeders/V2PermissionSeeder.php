<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class V2PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['slug' => 'backups.view',              'name' => 'Voir les sauvegardes',               'module' => 'backups'],
            ['slug' => 'backups.run',               'name' => 'Lancer une sauvegarde',              'module' => 'backups'],
            ['slug' => 'backups.delete',            'name' => 'Supprimer une sauvegarde',           'module' => 'backups'],
            ['slug' => 'documents.version.create',  'name' => 'Ajouter une version',                'module' => 'documents'],
            ['slug' => 'shares.create',             'name' => 'Créer un partage',                   'module' => 'shares'],
            ['slug' => 'documents.version.restore', 'name' => 'Restaurer une version',              'module' => 'documents'],
            ['slug' => 'documents.version.delete',  'name' => 'Supprimer une version',              'module' => 'documents'],
            ['slug' => 'logs.view_own',             'name' => 'Voir son propre journal',            'module' => 'logs'],
            ['slug' => 'logs.view_all',             'name' => 'Voir tout le journal',               'module' => 'logs'],
            ['slug' => 'nas.manage',                'name' => 'Gérer les NAS',                      'module' => 'nas'],
            ['slug' => 'nas.test_connection',       'name' => 'Tester la connexion NAS',            'module' => 'nas'],
            ['slug' => 'shares.revoke_own',         'name' => 'Révoquer ses propres partages',      'module' => 'shares'],
            ['slug' => 'shares.revoke_any',         'name' => 'Révoquer tous les partages',         'module' => 'shares'],
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['slug' => $p['slug']], $p);
        }

        // L'administrateur reçoit toutes les permissions existantes
        $admin = Role::where('slug', 'admin')->first();
        if ($admin) {
            $admin->permissions()->syncWithoutDetaching(Permission::pluck('id'));
        }
    }
}
