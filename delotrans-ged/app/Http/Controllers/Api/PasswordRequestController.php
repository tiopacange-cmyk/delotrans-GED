<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;

class PasswordRequestController extends Controller
{
    /**
     * Mot de passe oublié : prévient les administrateurs.
     * La réponse est toujours identique pour ne pas révéler quels comptes existent.
     */
    public function store(Request $request, NotificationService $notifications)
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:150']]);

        $user = User::where('email', $data['email'])->where('is_active', true)->first();

        if ($user) {
            $notifications->notifyAdmins(
                'password.reset_request',
                'Demande de nouveau mot de passe',
                "{$user->name} ({$user->email}) a oublié son mot de passe. Attribuez-lui-en un nouveau depuis l'écran Utilisateurs."
            );
        }

        return response()->json([
            'message' => 'Si ce compte existe, les administrateurs ont été prévenus. Ils vous communiqueront un nouveau mot de passe.',
        ]);
    }
}
