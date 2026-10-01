<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Une installation neuve (migrate --seed) doit donner une application utilisable.
 */
class InstallationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_la_table_sessions_existe(): void
    {
        $this->assertTrue(Schema::hasTable('sessions'));
    }

    public function test_les_trois_roles_sont_crees(): void
    {
        $this->assertEqualsCanonicalizing(
            ['admin', 'manager', 'user'],
            Role::pluck('slug')->all()
        );
    }

    public function test_l_admin_a_toutes_les_permissions(): void
    {
        $admin = $this->admin();

        foreach (Permission::pluck('slug') as $slug) {
            $this->assertTrue($admin->hasPermission($slug), "Permission manquante pour l'admin : $slug");
        }

        foreach (['users.view', 'users.manage', 'roles.manage', 'nas.manage', 'backups.view', 'logs.view_all'] as $slug) {
            $this->assertTrue($admin->hasPermission($slug), "Permission V2 manquante : $slug");
        }
    }

    public function test_le_role_consultation_est_en_lecture_seule(): void
    {
        $user = $this->consultation();

        $this->assertTrue($user->hasPermission('documents.view'));
        $this->assertTrue($user->hasPermission('documents.download'));
        $this->assertFalse($user->hasPermission('documents.create'));
        $this->assertFalse($user->hasPermission('documents.delete'));
        $this->assertFalse($user->hasPermission('users.view'));
    }

    public function test_le_seeder_peut_etre_relance(): void
    {
        $avant = Permission::count();

        $this->seed();

        $this->assertSame($avant, Permission::count());
        $this->assertTrue($this->admin()->hasPermission('users.view'));
    }
}
