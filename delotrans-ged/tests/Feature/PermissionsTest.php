<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Les écrans d'administration sont réservés à l'admin ; les écrans courants sont ouverts à tous.
 */
class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public static function routesAdmin(): array
    {
        return [
            'utilisateurs' => ['/api/v1/users'],
            'rôles' => ['/api/v1/roles'],
            'permissions' => ['/api/v1/permissions'],
            'NAS' => ['/api/v1/nas'],
            'sauvegardes' => ['/api/v1/backups'],
        ];
    }

    public static function routesCourantes(): array
    {
        return [
            'profil' => ['/api/v1/auth/me'],
            'clients' => ['/api/v1/clients'],
            'catégories' => ['/api/v1/categories'],
            'dossiers' => ['/api/v1/folders'],
            'documents' => ['/api/v1/documents'],
            'recherche' => ['/api/v1/search/documents?q=test'],
            'statistiques' => ['/api/v1/dashboard/stats'],
            'documents récents' => ['/api/v1/dashboard/recent-documents'],
            'graphiques' => ['/api/v1/dashboard/charts'],
            'journal' => ['/api/v1/logs'],
            'notifications' => ['/api/v1/notifications'],
        ];
    }

    #[DataProvider('routesAdmin')]
    public function test_l_admin_accede_a_l_administration(string $url): void
    {
        Sanctum::actingAs($this->admin());

        $this->getJson($url)->assertOk();
    }

    #[DataProvider('routesAdmin')]
    public function test_la_consultation_n_accede_pas_a_l_administration(string $url): void
    {
        Sanctum::actingAs($this->consultation());

        $this->getJson($url)->assertForbidden();
    }

    #[DataProvider('routesCourantes')]
    public function test_les_ecrans_courants_sont_accessibles_a_tous(string $url): void
    {
        Sanctum::actingAs($this->consultation());
        $this->getJson($url)->assertOk();

        Sanctum::actingAs($this->admin());
        $this->getJson($url)->assertOk();
    }

    public function test_la_consultation_ne_peut_pas_creer_ni_supprimer(): void
    {
        Sanctum::actingAs($this->admin());
        $clientId = $this->postJson('/api/v1/clients', ['code' => 'CLI001', 'name' => 'Client'])
            ->assertCreated()->json('data.id');

        Sanctum::actingAs($this->consultation());
        $this->postJson('/api/v1/clients', ['code' => 'CLI002', 'name' => 'Autre'])->assertForbidden();
        $this->postJson('/api/v1/folders', ['name' => 'Dossier'])->assertForbidden();
        $this->deleteJson("/api/v1/clients/$clientId")->assertForbidden();
        $this->postJson('/api/v1/backups/run', ['type' => 'database'])->assertForbidden();
    }
}
