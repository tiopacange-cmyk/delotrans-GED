<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        abort_unless(Hash::check($data['current_password'], $request->user()->password), 422, 'Le mot de passe actuel est incorrect.');

        $request->user()->update(['password' => Hash::make($data['password'])]);

        // Déconnecte les autres appareils, garde la session actuelle
        $actuel = $request->user()->currentAccessToken()?->id;
        $request->user()->tokens()->where('id', '!=', $actuel)->delete();

        return response()->json(['message' => 'Mot de passe modifié.']);
    }
}
