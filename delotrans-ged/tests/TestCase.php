<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // Comptes créés par DatabaseSeeder
    protected function admin(): User
    {
        return User::where('email', 'admin@delotrans.fr')->firstOrFail();
    }

    protected function consultation(): User
    {
        return User::where('email', 'utilisateur@delotrans.fr')->firstOrFail();
    }
}
