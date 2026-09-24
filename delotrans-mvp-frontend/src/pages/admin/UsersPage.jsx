import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Power,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  KeyRound,
  Wand2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  UserCog,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { useAuthStore } from '../../stores/authStore';

const COULEURS_ROLES = {
  admin: 'bg-violet-50 text-violet-700',
  manager: 'bg-brand-50 text-brand-700',
  user: 'bg-slate-100 text-slate-600',
};

function initiales(nom) {
  if (!nom) return '?';
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');
}

function derniereConnexion(iso) {
  if (!iso) return 'Jamais connecté';
  return `Vu le ${new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

function genererMotDePasse() {
  const car = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const tab = new Uint32Array(12);
  crypto.getRandomValues(tab);
  return Array.from(tab, (n) => car[n % car.length]).join('');
}

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

export default function UsersPage() {
  const moi = useAuthStore((s) => s.user);
  const can = useAuthStore((s) => s.can);
  const peutGerer = can('users.manage');

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');

  const [formulaire, setFormulaire] = useState(null); // { id?, valeurs }
  const [erreursChamps, setErreursChamps] = useState({});
  const [voirMdp, setVoirMdp] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [notification, setNotification] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 5000);
  };

  const charger = useCallback(
    async (page = 1) => {
      setChargement(true);
      try {
        const params = { page };
        if (recherche) params.q = recherche;
        if (filtreRole) params.role_id = filtreRole;
        const res = await axiosClient.get('/users', { params });
        const p = res.data?.data ?? {};
        setUtilisateurs(p.data ?? []);
        setPagination({ page: p.current_page ?? 1, derniere: p.last_page ?? 1, total: p.total ?? 0 });
      } catch (err) {
        notifier('erreur', messageErreur(err, 'Impossible de charger les utilisateurs.'));
      } finally {
        setChargement(false);
      }
    },
    [recherche, filtreRole]
  );

  useEffect(() => {
    const t = setTimeout(() => charger(1), 300); // petite attente pendant la frappe
    return () => clearTimeout(t);
  }, [charger]);

  useEffect(() => {
    axiosClient
      .get('/roles')
      .then((r) => setRoles(r.data?.data ?? []))
      .catch(() => {});
  }, []);

  const ouvrir = (u) => {
    setErreursChamps({});
    setVoirMdp(!u);
    setFormulaire(
      u
        ? {
            id: u.id,
            valeurs: { name: u.name ?? '', email: u.email ?? '', phone: u.phone ?? '', role_id: u.role_id ?? '', password: '', is_active: !!u.is_active },
          }
        : {
            valeurs: {
              name: '',
              email: '',
              phone: '',
              role_id: roles.find((r) => r.slug === 'user')?.id ?? '',
              password: genererMotDePasse(),
              is_active: true,
            },
          }
    );
  };

  const changer = (champ, valeur) => setFormulaire((f) => ({ ...f, valeurs: { ...f.valeurs, [champ]: valeur } }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreursChamps({});
    const v = formulaire.valeurs;
    const donnees = {
      name: v.name.trim(),
      email: v.email.trim(),
      phone: v.phone.trim() || null,
      role_id: v.role_id ? Number(v.role_id) : null,
      is_active: v.is_active,
    };
    if (v.password) donnees.password = v.password;
    try {
      if (formulaire.id) {
        await axiosClient.put(`/users/${formulaire.id}`, donnees);
        notifier('succes', 'Utilisateur modifié.');
      } else {
        await axiosClient.post('/users', donnees);
        notifier('succes', `Compte créé pour ${donnees.name}. Communiquez-lui son mot de passe de façon sécurisée.`);
      }
      setFormulaire(null);
      charger(formulaire.id ? pagination.page : 1);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        setErreursChamps(Object.fromEntries(Object.entries(data.errors).map(([k, val]) => [k, val[0]])));
      } else {
        notifier('erreur', data?.message || "L'enregistrement a échoué.");
      }
    } finally {
      setEnvoi(false);
    }
  };

  const basculerActif = async (u) => {
    const action = u.is_active ? 'désactiver' : 'réactiver';
    if (!window.confirm(`Voulez-vous ${action} le compte de ${u.name} ?${u.is_active ? '\nIl sera déconnecté immédiatement.' : ''}`)) return;
    try {
      await axiosClient.put(`/users/${u.id}`, { is_active: !u.is_active });
      notifier('succes', `Compte ${u.is_active ? 'désactivé' : 'réactivé'}.`);
      charger(pagination.page);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Opération impossible.'));
    }
  };

  const supprimer = async (u) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.name} ?\nPréférez la désactivation si vous voulez garder son historique.`)) return;
    try {
      await axiosClient.delete(`/users/${u.id}`);
      notifier('succes', 'Utilisateur supprimé.');
      charger(pagination.page);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const champ = (erreur) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-700 outline-none transition focus:ring-2 ${
      erreur ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
    }`;
  const Erreur = ({ c }) => (erreursChamps[c] ? <p className="mt-1 text-xs text-red-600">{erreursChamps[c]}</p> : null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total} compte{pagination.total > 1 ? 's' : ''} · gérez les accès à l'application
          </p>
        </div>
        {peutGerer && (
          <button
            onClick={() => ouvrir(null)}
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <UserPlus size={18} /> Nouvel utilisateur
          </button>
        )}
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

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom ou e-mail…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={filtreRole}
          onChange={(e) => setFiltreRole(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-56"
        >
          <option value="">Tous les rôles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : utilisateurs.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <UserCog size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Utilisateur</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Téléphone</th>
                  <th className="px-5 py-3 font-medium">Rôle</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Statut</th>
                  {peutGerer && <th className="px-5 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {utilisateurs.map((u) => {
                  const estMoi = u.id === moi?.id;
                  return (
                    <tr key={u.id} className={`hover:bg-slate-50 ${u.is_active ? '' : 'opacity-60'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                            {initiales(u.name)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800">
                              {u.name} {estMoi && <span className="text-xs font-normal text-slate-400">(vous)</span>}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Mail size={12} /> {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-slate-600 lg:table-cell">
                        {u.phone ? (
                          <span className="flex items-center gap-1.5">
                            <Phone size={14} className="text-slate-400" /> {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${COULEURS_ROLES[u.role?.slug] ?? 'bg-amber-50 text-amber-700'}`}>
                          {u.role?.name ?? 'Aucun rôle'}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3 md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-slate-700">{u.is_active ? 'Actif' : 'Désactivé'}</span>
                        </div>
                        <div className="text-xs text-slate-400">{derniereConnexion(u.last_login_at)}</div>
                      </td>
                      {peutGerer && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => ouvrir(u)}
                              title="Modifier"
                              className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                            >
                              <Pencil size={16} />
                            </button>
                            {!estMoi && (
                              <>
                                <button
                                  onClick={() => basculerActif(u)}
                                  title={u.is_active ? 'Désactiver' : 'Réactiver'}
                                  className={`rounded-md p-2 ${u.is_active ? 'text-slate-500 hover:bg-amber-50 hover:text-amber-600' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                >
                                  <Power size={16} />
                                </button>
                                <button
                                  onClick={() => supprimer(u)}
                                  title="Supprimer"
                                  className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
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
                disabled={pagination.page <= 1}
                onClick={() => charger(pagination.page - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button
                disabled={pagination.page >= pagination.derniere}
                onClick={() => charger(pagination.page + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire */}
      {formulaire && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setFormulaire(null)} />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{formulaire.id ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h2>
              <button onClick={() => setFormulaire(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input value={formulaire.valeurs.name} onChange={(e) => changer('name', e.target.value)} className={champ(erreursChamps.name)} />
                <Erreur c="name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  E-mail (identifiant de connexion) <span className="text-red-500">*</span>
                </label>
                <input type="email" value={formulaire.valeurs.email} onChange={(e) => changer('email', e.target.value)} className={champ(erreursChamps.email)} />
                <Erreur c="email" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
                  <input value={formulaire.valeurs.phone} onChange={(e) => changer('phone', e.target.value)} placeholder="+237 6XX XX XX XX" className={champ(erreursChamps.phone)} />
                  <Erreur c="phone" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formulaire.valeurs.role_id}
                    onChange={(e) => changer('role_id', e.target.value)}
                    disabled={formulaire.id === moi?.id}
                    className={`${champ(erreursChamps.role_id)} disabled:bg-slate-50`}
                  >
                    <option value="">— Choisir —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <Erreur c="role_id" />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                  <KeyRound size={14} /> {formulaire.id ? 'Nouveau mot de passe' : 'Mot de passe'}{' '}
                  {!formulaire.id && <span className="text-red-500">*</span>}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={voirMdp ? 'text' : 'password'}
                      value={formulaire.valeurs.password}
                      onChange={(e) => changer('password', e.target.value)}
                      placeholder={formulaire.id ? 'Laisser vide pour ne pas changer' : ''}
                      autoComplete="new-password"
                      className={`${champ(erreursChamps.password)} pr-10 font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setVoirMdp(!voirMdp)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                    >
                      {voirMdp ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      changer('password', genererMotDePasse());
                      setVoirMdp(true);
                    }}
                    title="Générer un mot de passe"
                    className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Wand2 size={15} /> Générer
                  </button>
                </div>
                <Erreur c="password" />
                <p className="mt-1 text-xs text-slate-500">8 caractères minimum. Notez-le avant d'enregistrer : il ne sera plus affiché.</p>
              </div>

              {formulaire.id !== moi?.id && (
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <span className="text-sm text-slate-700">Compte actif (peut se connecter)</span>
                  <input
                    type="checkbox"
                    checked={formulaire.valeurs.is_active}
                    onChange={(e) => changer('is_active', e.target.checked)}
                    className="h-5 w-5 accent-brand-600"
                  />
                </label>
              )}
            </div>

            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
              <button
                onClick={() => setFormulaire(null)}
                disabled={envoi}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={enregistrer}
                disabled={envoi}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {envoi && <Loader2 size={16} className="animate-spin" />}
                {formulaire.id ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
