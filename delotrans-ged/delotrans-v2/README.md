# DELOTRANS GED — Scaffold V2 (add-on)

Ce scaffold **s'ajoute** au scaffold MVP déjà en place, il ne le remplace pas. Il apporte : versioning des documents, partage sécurisé, gestion NAS multi-marques, sauvegardes, journalisation automatique, notifications.

## 1. Copier les nouveaux fichiers

Depuis la racine de ton projet Laravel (`delotrans-ged`), en supposant que ce dossier `delotrans-v2` est extrait au même niveau (comme `delotrans-mvp` l'était) :

```bash
cp -r delotrans-v2/database/migrations/* database/migrations/
cp -r delotrans-v2/app/Models/* app/Models/
cp -r delotrans-v2/app/Http/Controllers/Api/* app/Http/Controllers/Api/
cp -r delotrans-v2/app/Http/Requests/* app/Http/Requests/
cp -r delotrans-v2/app/Services/* app/Services/
mkdir -p app/Observers app/Jobs
cp -r delotrans-v2/app/Observers/* app/Observers/
cp -r delotrans-v2/app/Jobs/* app/Jobs/
```

## 2. Fusionner les routes (à la main, pas de copie brute)

Contrairement au MVP, on ne peut pas juste écraser `routes/api.php` — il contient déjà les routes MVP. Ouvre `routes/api-v2-additions.php` (fourni ici) et copie son contenu aux bons endroits dans `routes/api.php`, comme indiqué en commentaire dans ce fichier :
- Les routes authentifiées vont dans le groupe `Route::middleware('auth:sanctum')->group(...)` existant
- Les routes publiques de partage vont à côté des autres routes publiques (login, etc.)

N'oublie pas d'ajouter les imports des nouveaux contrôleurs en haut de `routes/api.php`.

## 3. Compléter le modèle `Document` existant

Le modèle `app/Models/Document.php` du MVP ne connaît pas encore les versions ni les partages. Ajoute ces méthodes dedans (ne pas écraser le fichier, juste ajouter) :

```php
public function currentVersion()
{
    return $this->belongsTo(DocumentVersion::class, 'current_version_id');
}

public function versions()
{
    return $this->hasMany(DocumentVersion::class)->orderByDesc('version_number');
}

public function shares()
{
    return $this->hasMany(DocumentShare::class);
}
```

Et dans `$fillable`, ajoute `'current_version_id'`.

## 4. Ajouter la relation `notifications()` au modèle `User`

Dans `app/Models/User.php`, ajoute :
```php
public function notifications()
{
    return $this->hasMany(DelotransNotification::class);
}
```

> Le modèle s'appelle `DelotransNotification` (pas `Notification`) pour éviter tout conflit avec le système de notifications intégré de Laravel — les deux peuvent cohabiter sans problème.

## 5. Enregistrer l'Observer de journalisation automatique

Dans `app/Providers/AppServiceProvider.php`, méthode `boot()` :
```php
use App\Models\{Document, Folder, Client, User};
use App\Observers\AuditObserver;

public function boot(): void
{
    Document::observe(AuditObserver::class);
    Folder::observe(AuditObserver::class);
    Client::observe(AuditObserver::class);
    User::observe(AuditObserver::class);
}
```

## 6. Ajouter le disque NAS "par défaut" si pas déjà fait

Si tu as suivi le test MVP, le disque `nas` existe déjà dans `config/filesystems.php`. Rien à changer ici pour le mode test (SQLite + dossier local). Le multi-NAS réel (plusieurs `NasConfig` simultanés) nécessite un `ServiceProvider` supplémentaire décrit dans le document `delotrans_services.md` (§1.1) produit plus tôt — à ajouter uniquement pour la production avec plusieurs NAS physiques.

## 7. Migrer

```bash
php artisan migrate
```

(pas besoin de `migrate:fresh` cette fois — ces migrations s'ajoutent proprement aux tables existantes)

## 8. Permissions manquantes dans le seeder

Le seeder MVP ne contient pas encore les permissions des nouveaux modules (`shares.*`, `nas.*`, `backups.*`, `logs.*`). Ajoute-les dans `database/seeders/DatabaseSeeder.php`, dans le tableau `$permissions`, avant la boucle `firstOrCreate` :

```php
['name' => 'Créer un partage', 'slug' => 'shares.create', 'module' => 'shares'],
['name' => 'Voir les partages', 'slug' => 'shares.view', 'module' => 'shares'],
['name' => 'Révoquer ses partages', 'slug' => 'shares.revoke_own', 'module' => 'shares'],
['name' => 'Révoquer tous les partages', 'slug' => 'shares.revoke_any', 'module' => 'shares'],
['name' => 'Ajouter une version', 'slug' => 'documents.version.create', 'module' => 'documents'],
['name' => 'Supprimer une version', 'slug' => 'documents.version.delete', 'module' => 'documents'],
['name' => 'Restaurer une version', 'slug' => 'documents.version.restore', 'module' => 'documents'],
['name' => 'Voir la config NAS', 'slug' => 'nas.view', 'module' => 'nas'],
['name' => 'Gérer la config NAS', 'slug' => 'nas.manage', 'module' => 'nas'],
['name' => 'Tester la connexion NAS', 'slug' => 'nas.test_connection', 'module' => 'nas'],
['name' => 'Voir les sauvegardes', 'slug' => 'backups.view', 'module' => 'backups'],
['name' => 'Lancer une sauvegarde', 'slug' => 'backups.run', 'module' => 'backups'],
['name' => 'Supprimer une sauvegarde', 'slug' => 'backups.delete', 'module' => 'backups'],
['name' => 'Voir ses logs', 'slug' => 'logs.view_own', 'module' => 'logs'],
['name' => 'Voir tous les logs', 'slug' => 'logs.view_all', 'module' => 'logs'],
```

Puis rejoue le seeder pour que le rôle `admin` récupère automatiquement toutes ces nouvelles permissions (le seeder fait déjà `$admin->permissions()->sync(Permission::pluck('id'))`) :
```bash
php artisan db:seed
```

## 9. Point d'attention — sauvegardes en environnement de test

`BackupService::dumpDatabase()` détecte automatiquement si la connexion est SQLite (comme dans ton environnement de test Codespaces) et fait une simple copie du fichier `.sqlite`, plutôt que `mysqldump`. En production avec MySQL, aucune adaptation nécessaire, le service bascule automatiquement.

## 10. Ce qui reste non couvert par ce scaffold

- Le driver NAS réel par marque (Synology/QNAP/TrueNAS) — actuellement `NasStorageService` suppose un disque local déjà monté, comme en MVP. Le vrai appel aux API propriétaires (DSM, QTS, TrueNAS REST) est à écrire au cas par cas, voir `delotrans_services.md` §1.2 pour un exemple Synology.
- L'envoi d'e-mails de notification (`NotificationService` ne fait que du in-app pour l'instant) — ajouter `Mail::to(...)->queue(...)` quand un serveur SMTP est configuré.
- La planification automatique des sauvegardes (`Schedule::call(...)` dans `routes/console.php`) — à ajouter en prod, pas nécessaire pour tester manuellement via `POST /backups/run`.
