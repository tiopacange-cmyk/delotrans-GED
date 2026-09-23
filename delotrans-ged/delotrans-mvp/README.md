# DELOTRANS GED — Scaffold MVP

Fichiers de code réels (pas de la doc) pour le périmètre MVP : Auth, Clients, Catégories, Dossiers, Documents, Recherche, Dashboard basique.

## Ce qui est inclus
- `database/migrations/*` — 9 migrations (roles, permissions, permission_role, users, auth support, clients, categories, folders, documents)
- `app/Models/*` — 7 modèles Eloquent avec relations
- `app/Http/Controllers/Api/*` — 6 contrôleurs
- `app/Http/Requests/*` — Form Requests de validation
- `app/Services/NasStorageService.php` — stockage NAS simplifié (un seul point de montage)
- `routes/api.php` — toutes les routes câblées
- `database/seeders/DatabaseSeeder.php` — permissions, rôles, 2 comptes de démo

## Ce qui n'est PAS inclus (volontairement, hors périmètre MVP)
- Versioning des documents, partage sécurisé de liens
- Gestion NAS multi-marques, sauvegardes automatiques
- Logs détaillés, notifications e-mail
- Le squelette Laravel lui-même (`composer.json`, `bootstrap/`, `config/`, etc.) — ce projet suppose un `laravel new` déjà fait

## Comment l'intégrer

1. Créer un projet Laravel 12 vierge :
   ```bash
   composer create-project laravel/laravel delotrans-ged
   cd delotrans-ged
   composer require laravel/sanctum
   ```

2. Copier les dossiers de ce scaffold **par-dessus** la structure générée (fusion, pas remplacement) :
   ```bash
   cp -r database/migrations/* /chemin/vers/delotrans-ged/database/migrations/
   cp -r database/seeders/* /chemin/vers/delotrans-ged/database/seeders/
   cp -r app/Models/* /chemin/vers/delotrans-ged/app/Models/
   cp -r app/Http/Controllers/Api /chemin/vers/delotrans-ged/app/Http/Controllers/
   cp -r app/Http/Requests/* /chemin/vers/delotrans-ged/app/Http/Requests/
   cp -r app/Services /chemin/vers/delotrans-ged/app/
   cp routes/api.php /chemin/vers/delotrans-ged/routes/api.php
   ```

3. Configurer le disque NAS dans `config/filesystems.php` (ajouter un disque `nas`) :
   ```php
   'nas' => [
       'driver' => 'local',
       'root' => env('FILESYSTEM_NAS_MOUNT_PATH', '/mnt/nas_delotrans'),
   ],
   ```
   Le montage système (SMB/NFS) doit être fait au préalable — voir le manuel d'installation.

4. Configurer `.env` : `DB_*`, `FILESYSTEM_NAS_MOUNT_PATH`.

5. Migrer et peupler :
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

6. Tester :
   ```bash
   php artisan serve
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@delotrans.fr","password":"changeme123"}'
   ```

## Après validation du MVP
Reprendre les documents complets déjà produits (schéma BDD complet, rôles/permissions détaillés, endpoints API complets, sprints, services NAS multi-driver) pour étendre vers la V2 : versioning, partage, sauvegardes, logs, notifications.
