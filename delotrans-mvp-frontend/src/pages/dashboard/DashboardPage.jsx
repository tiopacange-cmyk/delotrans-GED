import DashboardCharts from '../../components/dashboard/DashboardCharts';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, FolderTree, UserCog, HardDrive, FileWarning } from 'lucide-react';
import { dashboardApi } from '../../api';
import axiosClient from '../../api/axiosClient';

const STATUTS = {
  draft: { label: 'Brouillon', classe: 'bg-slate-100 text-slate-600' },
  published: { label: 'Publié', classe: 'bg-emerald-50 text-emerald-700' },
  archived: { label: 'Archivé', classe: 'bg-amber-50 text-amber-700' },
};

function tailleLisible(octets) {
  if (octets == null) return '—';
  const unites = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  let v = Number(octets);
  while (v >= 1024 && i < unites.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${unites[i]}`;
}

function dateLisible(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CarteStat({ icone: Icone, libelle, valeur, couleur }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{libelle}</span>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${couleur}`}>
          <Icone size={20} />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-800">{valeur ?? '—'}</div>
    </div>
  );
}

function CarteNas({ nas }) {
  if (!nas) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <HardDrive size={18} /> Espace NAS
        </div>
        <p className="mt-4 text-sm text-slate-400">Aucun NAS configuré.</p>
      </div>
    );
  }

  const total = nas.total_bytes || 0;
  const utilise = nas.used_bytes || 0;
  const pourcentage = total ? Math.round((utilise / total) * 100) : 0;
  const couleurBarre =
    pourcentage >= 90 ? 'bg-red-500' : pourcentage >= 75 ? 'bg-amber-500' : 'bg-brand-500';
  const enLigne = nas.status === 'online';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <HardDrive size={18} /> Espace NAS · {nas.name}
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            enLigne ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {enLigne ? 'En ligne' : 'Hors ligne'}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-800">{pourcentage} %</span>
        <span className="text-sm text-slate-500">
          {tailleLisible(utilise)} / {tailleLisible(total)}
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${couleurBarre}`} style={{ width: `${pourcentage}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recents, setRecents] = useState([]);
  const [nas, setNas] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    async function charger() {
      try {
        const [resStats, resRecents] = await Promise.all([
          dashboardApi.stats(),
          dashboardApi.recentDocuments(),
        ]);
        setStats(resStats.data.data);
        setRecents(resRecents.data.data ?? []);
      } catch {
        setErreur('Impossible de charger le tableau de bord.');
      }

      // Le NAS est facultatif : une erreur ici ne bloque pas le reste
      try {
        const resNas = await axiosClient.get('/nas');
        const premier = (resNas.data.data ?? [])[0];
        if (premier) {
          const resEtat = await axiosClient.get(`/nas/${premier.id}/status`);
          setNas({ ...premier, ...resEtat.data.data });
        }
      } catch {
        /* pas de droit ou pas de NAS */
      }

      setChargement(false);
    }
    charger();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-500">Vue d'ensemble de votre gestion documentaire.</p>
      </div>

      {erreur && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <FileWarning size={18} /> {erreur}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CarteStat icone={FileText} libelle="Documents" valeur={stats?.documents} couleur="bg-brand-50 text-brand-600" />
        <CarteStat icone={Users} libelle="Clients" valeur={stats?.clients} couleur="bg-emerald-50 text-emerald-600" />
        <CarteStat icone={FolderTree} libelle="Dossiers" valeur={stats?.folders} couleur="bg-amber-50 text-amber-600" />
        <CarteStat icone={UserCog} libelle="Utilisateurs" valeur={stats?.users} couleur="bg-violet-50 text-violet-600" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CarteNas nas={nas} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Documents récents</h2>
            <Link to="/documents" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Tout voir →
            </Link>
          </div>

          {chargement ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Chargement…</p>
          ) : recents.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun document pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Nom</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">Taille</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">Ajouté le</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recents.map((doc) => {
                    const statut = STATUTS[doc.status] ?? STATUTS.draft;
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            <FileText size={16} className="shrink-0 text-red-500" />
                            <span className="truncate">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{doc.client?.name ?? '—'}</td>
                        <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 md:table-cell">{tailleLisible(doc.file_size)}</td>
                        <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 md:table-cell">{dateLisible(doc.created_at)}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statut.classe}`}>
                            {statut.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <DashboardCharts />
    </div>
  );
}