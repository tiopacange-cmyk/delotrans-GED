import { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  FolderOpen,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { clientsApi } from '../../api';

const VIDE = { code: '', name: '', email: '', phone: '', address: '' };

function initiales(nom) {
  if (!nom) return '?';
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join('');
}

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

const tableau = (res) =>
  Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');

  // Formulaire : null = fermé ; sinon { id?, valeurs }
  const [formulaire, setFormulaire] = useState(null);
  const [erreursChamps, setErreursChamps] = useState({});
  const [envoi, setEnvoi] = useState(false);

  // Panneau des documents d'un client
  const [panneau, setPanneau] = useState(null); // { client, documents, chargement }

  const [notification, setNotification] = useState(null);
  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 4000);
  };

  const charger = useCallback(async (page = 1) => {
    setChargement(true);
    try {
      const res = await clientsApi.list({ page });
      setClients(res.data.data ?? []);
      setPagination({
        page: res.data.current_page ?? 1,
        derniere: res.data.last_page ?? 1,
        total: res.data.total ?? (res.data.data ?? []).length,
      });
    } catch (err) {
      notifier('erreur', err?.response?.data?.message || 'Impossible de charger les clients.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger(1);
  }, [charger]);

  const ouvrirCreation = () => {
    setErreursChamps({});
    setFormulaire({ valeurs: { ...VIDE } });
  };

  const ouvrirModification = (c) => {
    setErreursChamps({});
    setFormulaire({
      id: c.id,
      valeurs: {
        code: c.code ?? '',
        name: c.name ?? '',
        email: c.email ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
      },
    });
  };

  const changer = (champ, valeur) =>
    setFormulaire((f) => ({ ...f, valeurs: { ...f.valeurs, [champ]: valeur } }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreursChamps({});
    const donnees = Object.fromEntries(
      Object.entries(formulaire.valeurs).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()])
    );
    try {
      if (formulaire.id) {
        await clientsApi.update(formulaire.id, donnees);
        notifier('succes', 'Client modifié.');
      } else {
        await clientsApi.create(donnees);
        notifier('succes', 'Client créé.');
      }
      setFormulaire(null);
      charger(formulaire.id ? pagination.page : 1);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) {
        setErreursChamps(Object.fromEntries(Object.entries(data.errors).map(([k, v]) => [k, v[0]])));
      } else {
        notifier('erreur', data?.message || "L'enregistrement a échoué.");
      }
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (c) => {
    if (!window.confirm(`Supprimer le client « ${c.name} » ?`)) return;
    try {
      await clientsApi.delete(c.id);
      notifier('succes', 'Client supprimé.');
      charger(pagination.page);
    } catch (err) {
      notifier('erreur', err?.response?.data?.message || 'Suppression impossible.');
    }
  };

  const voirDocuments = async (c) => {
    setPanneau({ client: c, documents: [], chargement: true });
    try {
      const res = await axiosClient.get(`/clients/${c.id}/documents`);
      setPanneau({ client: c, documents: tableau(res), chargement: false });
    } catch {
      setPanneau({ client: c, documents: [], chargement: false });
      notifier('erreur', 'Impossible de charger les documents du client.');
    }
  };

  const filtre = recherche.toLowerCase();
  const clientsAffiches = filtre
    ? clients.filter((c) =>
        [c.name, c.code, c.email, c.phone].some((v) => v?.toLowerCase().includes(filtre))
      )
    : clients;

  const champ = (erreur) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-700 outline-none transition focus:ring-2 ${
      erreur
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
        : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
    }`;

  const CHAMPS = [
    { cle: 'code', libelle: 'Code client', requis: true, placeholder: 'Ex. : CLI-001' },
    { cle: 'name', libelle: 'Nom / Raison sociale', requis: true, placeholder: 'Ex. : Société ABC SARL' },
    { cle: 'email', libelle: 'E-mail', type: 'email', placeholder: 'contact@exemple.cm' },
    { cle: 'phone', libelle: 'Téléphone', placeholder: '+237 6XX XX XX XX' },
    { cle: 'address', libelle: 'Adresse', placeholder: 'Ex. : Akwa, Douala' },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total} client{pagination.total > 1 ? 's' : ''} enregistré{pagination.total > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={ouvrirCreation}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <UserPlus size={18} /> Nouveau client
        </button>
      </div>

      {notification && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            notification.type === 'succes'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notification.type === 'succes' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.texte}</span>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, code, e-mail ou téléphone…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Liste */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : clientsAffiches.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              {recherche ? 'Aucun client ne correspond à la recherche.' : 'Aucun client pour l’instant.'}
            </p>
            {!recherche && (
              <button onClick={ouvrirCreation} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
                Créer le premier client
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Contact</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Adresse</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clientsAffiches.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
                          {initiales(c.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 md:table-cell">
                      <div className="space-y-1 text-slate-600">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 hover:text-brand-600">
                            <Mail size={14} className="text-slate-400" /> {c.email}
                          </a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 whitespace-nowrap hover:text-brand-600">
                            <Phone size={14} className="text-slate-400" /> {c.phone}
                          </a>
                        )}
                        {!c.email && !c.phone && <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 text-slate-600 lg:table-cell">
                      {c.address ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="shrink-0 text-slate-400" /> {c.address}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => voirDocuments(c)}
                          title="Voir ses documents"
                          className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button
                          onClick={() => ouvrirModification(c)}
                          title="Modifier"
                          className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => supprimer(c)}
                          title="Supprimer"
                          className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button
                disabled={pagination.page >= pagination.derniere}
                onClick={() => charger(pagination.page + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulaire création / modification */}
      {formulaire && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setFormulaire(null)} />
          <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formulaire.id ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button onClick={() => setFormulaire(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {CHAMPS.map(({ cle, libelle, requis, type, placeholder }) => (
                <div key={cle}>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {libelle} {requis && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={type ?? 'text'}
                    value={formulaire.valeurs[cle]}
                    onChange={(e) => changer(cle, e.target.value)}
                    placeholder={placeholder}
                    className={champ(erreursChamps[cle])}
                  />
                  {erreursChamps[cle] && <p className="mt-1 text-xs text-red-600">{erreursChamps[cle]}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
                {formulaire.id ? 'Enregistrer' : 'Créer le client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panneau latéral : documents du client */}
      {panneau && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setPanneau(null)} />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-800">{panneau.client.name}</h2>
                <p className="text-xs text-slate-500">Documents associés</p>
              </div>
              <button onClick={() => setPanneau(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {panneau.chargement ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                  <Loader2 size={18} className="animate-spin" /> Chargement…
                </div>
              ) : panneau.documents.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText size={36} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">Aucun document associé à ce client.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {panneau.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={18} className="shrink-0 text-red-500" />
                        <span className="truncate font-medium text-slate-700">{doc.name}</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-slate-500">{tailleLisible(doc.file_size)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}