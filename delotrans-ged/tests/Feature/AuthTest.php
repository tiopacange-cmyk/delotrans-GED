<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function login(string $email, string $password = 'changeme123')
    {
        return $this->postJson('/api/v1/auth/login', compact('email', 'password'));
    }

    public function test_connexion_avec_les_bons_identifiants(): void
    {
        $this->login('admin@delotrans.fr')
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user' => ['email', 'role' => ['permissions']]]]);

        $this->assertNotNull($this->admin()->fresh()->last_login_at);
    }

    public function test_connexion_refusee_avec_un_mauvais_mot_de_passe(): void
    {
        $this->login('admin@delotrans.fr', 'mauvais-mdp')
            ->assertUnauthorized()
            ->assertJson(['message' => 'Identifiants invalides.']);
    }

    public function test_connexion_refusee_pour_un_compte_desactive(): void
    {
        $this->consultation()->update(['is_active' => false]);

        $this->login('utilisateur@delotrans.fr')->assertForbidden();
    }

    public function test_les_routes_protegees_exigent_un_jeton(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->getJson('/api/v1/documents')->assertUnauthorized();
    }

    public function test_le_jeton_donne_acces_puis_est_revoque_a_la_deconnexion(): void
    {
        $token = $this->login('admin@delotrans.fr')->json('data.token');
        // Chaque requête réelle repart sans utilisateur en mémoire
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $headers = ['Authorization' => "Bearer $token"];

        $this->getJson('/api/v1/auth/me', $headers)
            ->assertOk()
            ->assertJsonPath('data.email', 'admin@delotrans.fr');

        $this->postJson('/api/v1/auth/logout', [], $headers)->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/auth/me', $headers)->assertUnauthorized();
    }
}
