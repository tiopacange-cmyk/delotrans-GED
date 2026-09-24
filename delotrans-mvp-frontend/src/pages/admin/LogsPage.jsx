import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  ScrollText,
  Search,
  RotateCcw,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PlusCircle,
  PencilLine,
  Trash2,
  Activity,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const MODULES = {
  document: 'Document',
  documentversion: 'Version de document',
  documentshare: 'Partage',
  folder: 'Dossier',
  client: 'Client',
  category: 'Catégorie',
  nasconfig: 'NAS',
  user: 'Utilisateur',
};

const ACTIONS = {
  created: { label: 'Création', classe: 'bg-emerald-50 text-emerald-700', icone: PlusCircle },
  updated: { label: 'Modification', classe: 'bg-brand-50 text-brand-700', icone: PencilLine },
  deleted: { label: 'Suppression', classe: 'bg-red-50 text-red-700', icone: Trash2 },
};

const VIDE = { q: '', module: '', action: '', date_from: '', date_to: '' };

function initiales(nom) {
  if (!nom) return '?';
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');
}

function dateHeure(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    heure: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function navigateur(ua) {
  if (!ua) return '—';
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Autre';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${nav} sur ${os}` : nav;
}

export default function LogsPage() {
  const [filtres, setFiltres] = useState(VIDE);
  const [appliques, setAppliques] = useState(VIDE);
  const [entrees, setEntrees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [ouverte, setOuverte] = useState(null);

  const charger = useCallback(
    async (page = 1) => {
      setChargement(true);
      setErreur('');
      const params = Object.fromEntries(Object.entries(appliques).filter(([, v]) => v !== ''));
      params.page = page;
      try {
        const res = await axiosClient.get('/logs', { params });
        const p = res.data?.data ?? {};
        setEntrees(p.data ?? []);
        setPagination({ page: p.current_page ?? 1, derniere: p.last_page ?? 1, total: p.total ?? 0 });
      } catch (err) {
        setErreur(err?.response?.data?.message || 'Impossible de charger le journal.');
      } finally {
        setChargement(false);
      }
    },
    [appliques]
  );

  useEffect(() => {
    charger(1);
  }, [charger]);

  const changer = (champ, valeur) => setFiltres((f) => ({ ...f, [champ]: valeur }));
  const appliquer = (e) => {
    e?.preventDefault();
    setAppliques(filtres);
  };
  const reinitialiser = () => {
    setFiltres(VIDE);
    setAppliques(VIDE);
  };

  const champ =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const libelle = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Journal d'activité</h1>
        <p className="mt-1 text-sm text-slate-500">
          Traçabilité des actions effectuées dans l'application · {pagination.total} entrée{pagination.total > 1 ? 's' : ''}
        </p>
      </div>

      {/* Filtres */}
      <form onSubmit={appliquer} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className={libelle}>Recherche</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filtres.q}
                onChange={(e) => changer('q', e.target.value)}
                placeholder="Utilisateur ou description…"
                className={`${champ} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className={libelle}>Module</label>
            <select value={filtres.module} onChange={(e) => changer('module', e.target.value)} className={champ}>
              <option value="">Tous</option>
              {Object.entries(MODULES).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={libelle}>Action</label>
            <select value={filtres.action} onChange={(e) => changer('action', e.target.value)} className={champ}>
              <option value="">Toutes</option>
              {Object.entries(ACTIONS).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Search size={16} /> Filtrer
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              title="Effacer les filtres"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          <div>
            <label className={libelle}>Du</label>
            <input type="date" value={filtres.date_from} onChange={(e) => changer('date_from', e.target.value)} className={champ} />
          </div>
          <div>
            <label className={libelle}>Au</label>
            <input type="date" value={filtres.date_to} onChange={(e) => changer('date_to', e.target.value)} className={champ} />
          </div>
        </div>
      </form>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} /> <span>{erreur}</span>
        </div>
      )}

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : entrees.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <ScrollText size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Aucune activité ne correspond à ces critères.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Utilisateur</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Élément</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Adresse IP</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entrees.map((e) => {
                  const typeAction = e.action?.split('.').pop();
                  const action = ACTIONS[typeAction] ?? { label: typeAction ?? '—', classe: 'bg-slate-100 text-slate-600', icone: Activity };
                  const IconeAction = action.icone;
                  const quand = dateHeure(e.created_at);
                  const estOuverte = ouverte === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr onClick={() => setOuverte(estOuverte ? null : e.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="font-medium text-slate-700">{quand.date}</div>
                          <div className="text-xs text-slate-500">{quand.heure}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                              {initiales(e.user?.name)}
                            </span>
                            <span className="hidden text-slate-700 sm:inline">{e.user?.name ?? 'Système'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${action.classe}`}>
                            <IconeAction size={12} /> {action.label}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3 text-slate-600 md:table-cell">
                          {MODULES[e.module] ?? e.module} <span className="text-slate-400">n° {e.subject_id}</span>
                        </td>
                        <td className="hidden whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500 lg:table-cell">
                          {e.ip_address ?? '—'}
                        </td>
                        <td className="px-2 py-3 text-slate-400">
                          <ChevronDown size={16} className={`transition ${estOuverte ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {estOuverte && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="px-5 py-4">
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-400">Description</dt>
                                <dd className="text-slate-700">{e.description ?? '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-400">Élément</dt>
                                <dd className="text-slate-700">
                                  {MODULES[e.module] ?? e.module} n° {e.subject_id}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-400">Utilisateur</dt>
                                <dd className="text-slate-700">
                                  {e.user?.name ?? 'Système'} {e.user?.email && <span className="text-slate-500">({e.user.email})</span>}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-slate-400">Poste</dt>
                                <dd className="text-slate-700">
                                  {navigateur(e.user_agent)} · <span className="font-mono text-xs">{e.ip_address ?? '—'}</span>
                                </dd>
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.derniere > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              Page {pagination.page} sur {pagination.derniere}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || chargement}
                onClick={() => charger(pagination.page - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button
                disabled={pagination.page >= pagination.derniere || chargement}
                onClick={() => charger(pagination.page + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}