import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  Save,
  Lock,
  Users,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const MODULES = {
  documents: 'Documents',
  folders: 'Dossiers',
  clients: 'Clients',
  categories: 'Catégories',
  shares: 'Partages',
  logs: "Journal d'activité",
  nas: 'Stockage NAS',
  backups: 'Sauvegardes',
  users: 'Utilisateurs',
  roles: 'Rôles et droits',
};
const ORDRE = Object.keys(MODULES);

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({}); // { module: [ {id, name, slug} ] }
  const [choisi, setChoisi] = useState(null);
  const [coches, setCoches] = useState(new Set());
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [nouveau, setNouveau] = useState(null); // { name, description, modele }
  const [notification, setNotification] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 5000);
  };

  const charger = useCallback(async (garderId) => {
    setChargement(true);
    try {
      const [resRoles, resPerms] = await Promise.all([axiosClient.get('/roles'), axiosClient.get('/permissions')]);
      const liste = resRoles.data?.data ?? [];
      setRoles(liste);
      setPermissions(resPerms.data?.data ?? {});
      const cible = liste.find((r) => r.id === garderId) ?? liste[0] ?? null;
      setChoisi(cible);
      setCoches(new Set((cible?.permissions ?? []).map((p) => p.id)));
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Impossible de charger les rôles.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const selectionner = (role) => {
    if (modifie && !window.confirm('Des modifications ne sont pas enregistrées. Les abandonner ?')) return;
    setChoisi(role);
    setCoches(new Set((role.permissions ?? []).map((p) => p.id)));
  };

  const estAdmin = choisi?.slug === 'admin';
  const origine = useMemo(() => new Set((choisi?.permissions ?? []).map((p) => p.id)), [choisi]);
  const modifie = !estAdmin && (origine.size !== coches.size || [...coches].some((id) => !origine.has(id)));

  const basculer = (id) => {
    if (estAdmin) return;
    setCoches((c) => {
      const n = new Set(c);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const basculerModule = (liste, toutCoche) => {
    if (estAdmin) return;
    setCoches((c) => {
      const n = new Set(c);
      liste.forEach((p) => (toutCoche ? n.delete(p.id) : n.add(p.id)));
      return n;
    });
  };

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await axiosClient.put(`/roles/${choisi.id}`, { permissions: [...coches] });
      notifier('succes', `Droits du rôle « ${choisi.name} » enregistrés. Les utilisateurs concernés les auront à leur prochaine connexion.`);
      await charger(choisi.id);
    } catch (err) {
      notifier('erreur', messageErreur(err, "L'enregistrement a échoué."));
    } finally {
      setEnvoi(false);
    }
  };

  const creer = async () => {
    setEnvoi(true);
    try {
      const modele = roles.find((r) => String(r.id) === String(nouveau.modele));
      const res = await axiosClient.post('/roles', {
        name: nouveau.name.trim(),
        description: nouveau.description.trim() || null,
        permissions: (modele?.permissions ?? []).map((p) => p.id),
      });
      setNouveau(null);
      notifier('succes', `Rôle « ${res.data.data.name} » créé. Ajustez maintenant ses droits.`);
      await charger(res.data.data.id);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Création impossible.'));
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async () => {
    if (!window.confirm(`Supprimer le rôle « ${choisi.name} » ?`)) return;
    try {
      await axiosClient.delete(`/roles/${choisi.id}`);
      notifier('succes', 'Rôle supprimé.');
      await charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const modules = Object.keys(permissions).sort((a, b) => {
    const ia = ORDRE.indexOf(a);
    const ib = ORDRE.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const deBase = ['admin', 'manager', 'user'].includes(choisi?.slug);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rôles et droits</h1>
          <p className="mt-1 text-sm text-slate-500">Définissez ce que chaque profil peut faire dans l'application.</p>
        </div>
        <button
          onClick={() => setNouveau({ name: '', description: '', modele: roles.find((r) => r.slug === 'user')?.id ?? '' })}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={18} /> Nouveau rôle
        </button>
      </div>

      {notification && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            notification.type === 'succes' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notification.type === 'succes' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.texte}</span>
        </div>
      )}

      {chargement && roles.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Liste des rôles */}
          <ul className="space-y-2">
            {roles.map((r) => {
              const actif = choisi?.id === r.id;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => selectionner(r)}
                    className={`block w-full rounded-xl border p-4 text-left transition ${
                      actif ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.slug === 'admin' ? (
                        <Lock size={16} className="text-violet-600" />
                      ) : (
                        <ShieldCheck size={16} className={actif ? 'text-brand-600' : 'text-slate-400'} />
                      )}
                      <span className="font-semibold text-slate-800">{r.name}</span>
                    </div>
                    {r.description && <p className="mt-1 text-xs text-slate-500">{r.description}</p>}
                    <div className="mt-2 flex gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {r.users_count ?? 0} utilisateur{(r.users_count ?? 0) > 1 ? 's' : ''}
                      </span>
                      <span>
                        {r.permissions?.length ?? 0} droit{(r.permissions?.length ?? 0) > 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Permissions du rôle */}
          {choisi && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">Droits : {choisi.name}</h2>
                  <p className="text-xs text-slate-500">
                    {estAdmin
                      ? "L'administrateur possède toujours tous les droits. Ce rôle est verrouillé."
                      : `${coches.size} droit${coches.size > 1 ? 's' : ''} coché${coches.size > 1 ? 's' : ''}`}
                  </p>
                </div>
                {!estAdmin && (
                  <div className="flex gap-2">
                    {!deBase && (
                      <button
                        onClick={supprimer}
                        title="Supprimer ce rôle"
                        className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {modifie && (
                      <button
                        onClick={() => setCoches(new Set(origine))}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        <RotateCcw size={15} /> Annuler
                      </button>
                    )}
                    <button
                      onClick={enregistrer}
                      disabled={!modifie || envoi}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
                    >
                      {envoi ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
                    </button>
                  </div>
                )}
              </div>

              {modifie && (
                <div className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">
                  Modifications non enregistrées.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                {modules.map((mod) => {
                  const liste = permissions[mod] ?? [];
                  const nb = liste.filter((p) => estAdmin || coches.has(p.id)).length;
                  const toutCoche = nb === liste.length;
                  return (
                    <div key={mod} className="rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        <span className="text-sm font-semibold text-slate-700">{MODULES[mod] ?? mod}</span>
                        {!estAdmin && (
                          <button
                            onClick={() => basculerModule(liste, toutCoche)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            {toutCoche ? 'Tout décocher' : 'Tout cocher'}
                          </button>
                        )}
                      </div>
                      <ul className="divide-y divide-slate-50 px-4 py-1">
                        {liste.map((p) => (
                          <li key={p.id}>
                            <label className={`flex items-center gap-3 py-2 text-sm ${estAdmin ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input
                                type="checkbox"
                                checked={estAdmin || coches.has(p.id)}
                                disabled={estAdmin}
                                onChange={() => basculer(p.id)}
                                className="h-4 w-4 accent-brand-600"
                              />
                              <span className="text-slate-700">{p.name}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nouveau rôle */}
      {nouveau && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setNouveau(null)} />
          <div className="relative w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Nouveau rôle</h2>
              <button onClick={() => setNouveau(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom du rôle <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={nouveau.name}
                  onChange={(e) => setNouveau({ ...nouveau, name: e.target.value })}
                  placeholder="Ex. : Comptable"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <input
                  value={nouveau.description}
                  onChange={(e) => setNouveau({ ...nouveau, description: e.target.value })}
                  placeholder="À quoi sert ce profil ?"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Partir des droits de…</label>
                <select
                  value={nouveau.modele}
                  onChange={(e) => setNouveau({ ...nouveau, modele: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Aucun droit (vide)</option>
                  {roles
                    .filter((r) => r.slug !== 'admin')
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setNouveau(null)}
                disabled={envoi}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={creer}
                disabled={envoi || !nouveau.name.trim()}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {envoi && <Loader2 size={16} className="animate-spin" />} Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
