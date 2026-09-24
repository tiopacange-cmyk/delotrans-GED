<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Document;
use App\Models\Folder;
use App\Models\User;

class DashboardController extends Controller
{
    public function stats()
    {
        return response()->json(['data' => [
            'documents' => Document::count(),
            'clients' => Client::count(),
            'folders' => Folder::count(),
            'users' => User::count(),
        ]]);
    }

    public function recentDocuments()
    {
        return response()->json([
            'data' => Document::with(['client', 'category'])->latest()->limit(10)->get(),
        ]);
    }

    /**
     * Données des graphiques du tableau de bord.
     */
    public function charts()
    {
        $mois = collect(range(11, 0))->map(fn ($n) => now()->startOfMonth()->subMonths($n));

        // 1) Dépôts de documents sur 12 mois
        $depots = \App\Models\Document::where('created_at', '>=', $mois->first())
            ->get(['created_at'])
            ->groupBy(fn ($d) => $d->created_at->format('Y-m'))
            ->map->count();
        $parMois = $mois->map(fn ($m) => [
            'mois' => ucfirst($m->locale('fr')->translatedFormat('M y')),
            'documents' => $depots[$m->format('Y-m')] ?? 0,
        ])->values();

        // 2) Répartition par catégorie
        $parCategorie = \App\Models\Category::withCount('documents')->get()
            ->map(fn ($c) => ['nom' => $c->name, 'valeur' => $c->documents_count, 'couleur' => $c->color])
            ->filter(fn ($c) => $c['valeur'] > 0)
            ->values();
        $sansCategorie = \App\Models\Document::whereNull('category_id')->count();
        if ($sansCategorie > 0) {
            $parCategorie->push(['nom' => 'Sans catégorie', 'valeur' => $sansCategorie, 'couleur' => '#94a3b8']);
        }

        // 3) Clients ayant le plus de documents
        $topClients = \App\Models\Client::withCount('documents')
            ->orderByDesc('documents_count')
            ->take(5)
            ->get()
            ->filter(fn ($c) => $c->documents_count > 0)
            ->map(fn ($c) => ['nom' => $c->name, 'documents' => $c->documents_count])
            ->values();

        // 4) Activité des 7 derniers jours
        $jours = collect(range(6, 0))->map(fn ($n) => now()->startOfDay()->subDays($n));
        $logs = \App\Models\ActivityLog::where('created_at', '>=', $jours->first())->get(['action', 'created_at']);
        $categorie = function (string $action) {
            $type = \Illuminate\Support\Str::afterLast($action, '.');
            return match (true) {
                $type === 'login' => 'connexions',
                in_array($type, ['viewed', 'downloaded', 'version_downloaded', 'share_downloaded'], true) => 'consultations',
                in_array($type, ['created', 'updated', 'deleted'], true) => 'modifications',
                default => null,
            };
        };
        $activite = $jours->map(function ($j) use ($logs, $categorie) {
            $duJour = $logs->filter(fn ($l) => $l->created_at->isSameDay($j));
            $ligne = ['jour' => ucfirst($j->locale('fr')->translatedFormat('D d')), 'connexions' => 0, 'consultations' => 0, 'modifications' => 0];
            foreach ($duJour as $l) {
                if ($c = $categorie($l->action)) {
                    $ligne[$c]++;
                }
            }
            return $ligne;
        })->values();

        return response()->json(['data' => [
            'documents_par_mois' => $parMois,
            'par_categorie' => $parCategorie,
            'top_clients' => $topClients,
            'activite_7_jours' => $activite,
        ]]);
    }
}
