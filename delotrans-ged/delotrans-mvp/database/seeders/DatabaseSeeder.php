<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Permissions MVP (sous-ensemble de la matrice complète, modules NAS/backups/logs exclus)
        $permissions = [
            ['name' => 'Voir les clients', 'slug' => 'clients.view', 'module' => 'clients'],
            ['name' => 'Créer un client', 'slug' => 'clients.create', 'module' => 'clients'],
            ['name' => 'Modifier un client', 'slug' => 'clients.update', 'module' => 'clients'],
            ['name' => 'Supprimer un client', 'slug' => 'clients.delete', 'module' => 'clients'],

            ['name' => 'Voir les catégories', 'slug' => 'categories.view', 'module' => 'categories'],
            ['name' => 'Créer une catégorie', 'slug' => 'categories.create', 'module' => 'categories'],
            ['name' => 'Modifier une catégorie', 'slug' => 'categories.update', 'module' => 'categories'],
            ['name' => 'Supprimer une catégorie', 'slug' => 'categories.delete', 'module' => 'categories'],

            ['name' => 'Voir les dossiers', 'slug' => 'folders.view', 'module' => 'folders'],
            ['name' => 'Créer un dossier', 'slug' => 'folders.create', 'module' => 'folders'],
            ['name' => 'Modifier un dossier', 'slug' => 'folders.update', 'module' => 'folders'],
            ['name' => 'Déplacer un dossier', 'slug' => 'folders.move', 'module' => 'folders'],
            ['name' => 'Supprimer un dossier', 'slug' => 'folders.delete', 'module' => 'folders'],

            ['name' => 'Voir les documents', 'slug' => 'documents.view', 'module' => 'documents'],
            ['name' => 'Créer un document', 'slug' => 'documents.create', 'module' => 'documents'],
            ['name' => 'Modifier un document', 'slug' => 'documents.update', 'module' => 'documents'],
            ['name' => 'Télécharger un document', 'slug' => 'documents.download', 'module' => 'documents'],
            ['name' => 'Supprimer un document', 'slug' => 'documents.delete', 'module' => 'documents'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['slug' => $permission['slug']], $permission);
        }

        // Rôles
        $admin = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Administrateur', 'description' => 'Accès total au système']
        );
        $admin->permissions()->sync(Permission::pluck('id'));

        $manager = Role::firstOrCreate(
            ['slug' => 'manager'],
            ['name' => 'Gestionnaire', 'description' => 'Gestion opérationnelle des documents et clients']
        );
        $manager->permissions()->sync(Permission::pluck('id')); // même périmètre que admin pour le MVP

        $user = Role::firstOrCreate(
            ['slug' => 'user'],
            ['name' => 'Utilisateur', 'description' => 'Usage quotidien : consultation, dépôt, téléchargement']
        );
        $userSlugs = Permission::whereIn('slug', [
            'clients.view', 'categories.view',
            'folders.view', 'folders.create', 'folders.update',
            'documents.view', 'documents.create', 'documents.update', 'documents.download', 'documents.delete',
        ])->pluck('id');
        $user->permissions()->sync($userSlugs);

        // Comptes de démo — mots de passe à changer immédiatement après la première connexion
        User::firstOrCreate(
            ['email' => 'admin@delotrans.fr'],
            [
                'name' => 'Administrateur DELOTRANS',
                'password' => Hash::make('changeme123'),
                'role_id' => $admin->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        User::firstOrCreate(
            ['email' => 'utilisateur@delotrans.fr'],
            [
                'name' => 'Utilisateur Démo',
                'password' => Hash::make('changeme123'),
                'role_id' => $user->id,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
