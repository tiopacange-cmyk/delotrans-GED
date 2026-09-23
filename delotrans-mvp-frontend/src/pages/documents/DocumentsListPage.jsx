import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File as FileIcon,
  Upload,
  X,
  Eye,
  Download,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { documentsApi } from '../../api/documentsApi';
import { foldersApi } from '../../api/foldersApi';
import { categoriesApi, clientsApi } from '../../api';

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

function IconeFichier({ mime }) {
  if (mime?.startsWith('image/')) return <FileImage size={18} className="shrink-0 text-violet-500" />;
  if (mime?.includes('pdf')) return <FileText size={18} className="shrink-0 text-red-500" />;
  if (mime?.includes('sheet') || mime?.includes('excel') || mime?.includes('csv'))
    return <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />;
  if (mime?.includes('word') || mime?.includes('document'))
    return <FileText size={18} className="shrink-0 text-brand-500" />;
  return <FileIcon size={18} className="shrink-0 text-slate-400" />;
}

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

const liste = (res) => res?.data?.data ?? [];

export default function DocumentsListPage() {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(true);

  const [dossiers, setDossiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);

  const [recherche, setRecherche] = useState('');
  const [filtreDossier, setFiltreDossier] = useState('');

  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [fichiers, setFichiers] = useState([]);
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState({ enCours: false, fait: 0 });
  const [form, setForm] = useState({ folder_id: '', category_id: '', client_id: '' });
  const inputFichier = useRef(null);

  const [notification, setNotification] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 4000);
  };

  const chargerDocuments = useCallback(
    async (page = 1) => {
      setChargement(true);
      try {
        const params = { page };
        if (filtreDossier) params.folder_id = filtreDossier;
        const res = await documentsApi.list(params);
        setDocuments(res.data.data ?? []);
        setPagination({
          page: res.data.current_page ?? 1,
          derniere: res.data.last_page ?? 1,
          total: res.data.total ?? 0,
        });
      } catch (err) {
        notifier('erreur', messageErreur(err, 'Impossible de charger les documents.'));
      } finally {
        setChargement(false);
      }
    },
    [filtreDossier]
  );

  useEffect(() => {
    chargerDocuments(1);
  }, [chargerDocuments]);

  useEffect(() => {
    foldersApi.list().then((r) => setDossiers(liste(r))).catch(() => {});
    categoriesApi.list().then((r) => setCategories(liste(r))).catch(() => {});
    clientsApi.list().then((r) => setClients(liste(r))).catch(() => {});
  }, []);

  // ----- Dépôt -----
  const ajouterFichiers = (liste) => {
    const nouveaux = Array.from(liste || []);
    setFichiers((actuels) => [...actuels, ...nouveaux]);
  };

  const retirerFichier = (index) => {
    setFichiers((actuels) => actuels.filter((_, i) => i !== index));
  };

  const fermerPanneau = () => {
    if (envoi.enCours) return;
    setPanneauOuvert(false);
    setFichiers([]);
  };

  const deposer = async () => {
    if (!form.folder_id) {
      notifier('erreur', 'Choisissez un dossier de destination.');
      return;
    }
    if (fichiers.length === 0) {
      notifier('erreur', 'Ajoutez au moins un fichier.');
      return;
    }

    setEnvoi({ enCours: true, fait: 0 });
    let reussis = 0;
    const erreurs = [];

    for (const fichier of fichiers) {
      const donnees = new FormData();
      donnees.append('file', fichier);
      donnees.append('folder_id', form.folder_id);
      if (form.category_id) donnees.append('category_id', form.category_id);
      if (form.client_id) donnees.append('client_id', form.client_id);

      try {
        await documentsApi.upload(donnees);
        reussis++;
      } catch (err) {
        erreurs.push(`${fichier.name} : ${messageErreur(err, 'échec')}`);
      }
      setEnvoi((e) => ({ ...e, fait: e.fait + 1 }));
    }

    setEnvoi({ enCours: false, fait: 0 });

    if (erreurs.length === 0) {
      notifier('succes', `${reussis} document(s) déposé(s) avec succès.`);
      setFichiers([]);
      setPanneauOuvert(false);
    } else {
      notifier('erreur', erreurs.join(' | '));
      setFichiers((actuels) => actuels.filter((f) => erreurs.some((e) => e.startsWith(f.name))));
    }
    chargerDocuments(1);
  };

  // ----- Actions -----
  const apercu = async (doc) => {
    const fenetre = window.open('', '_blank');
    try {
      const res = await axiosClient.get(`/documents/${doc.id}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }));
      if (fenetre) fenetre.location.href = url;
    } catch (err) {
      if (fenetre) fenetre.close();
      notifier('erreur', "Aperçu impossible pour ce document.");
    }
  };

  const telecharger = async (doc) => {
    try {
      const res = await axiosClient.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = doc.name;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      notifier('erreur', 'Téléchargement impossible.');
    }
  };

  const supprimer = async (doc) => {
    if (!window.confirm(`Supprimer le document « ${doc.name} » ?`)) return;
    try {
      await documentsApi.delete(doc.id);
      notifier('succes', 'Document supprimé.');
      chargerDocuments(pagination.page);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const nomDossier = (id) => dossiers.find((d) => d.id === id)?.name ?? '—';

  const documentsAffiches = recherche
    ? documents.filter((d) => d.name?.toLowerCase().includes(recherche.toLowerCase()))
    : documents;

  const champ =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination.total} document{pagination.total > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => setPanneauOuvert(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Upload size={18} /> Déposer des documents
        </button>
      </div>

      {/* Notification */}
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

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un document par nom…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className={`${champ} pl-9`}
          />
        </div>
        <select value={filtreDossier} onChange={(e) => setFiltreDossier(e.target.value)} className={`${champ} sm:w-64`}>
          <option value="">Tous les dossiers</option>
          {dossiers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {chargement ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : documentsAffiches.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Aucun document trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">Nom</th>
                  <th className="hidden px-5 py-3 font-medium md:table-cell">Dossier</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Catégorie</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Taille</th>
                  <th className="hidden px-5 py-3 font-medium lg:table-cell">Ajouté le</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documentsAffiches.map((doc) => {
                  const statut = STATUTS[doc.status] ?? STATUTS.draft;
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="max-w-xs px-5 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <IconeFichier mime={doc.mime_type} />
                          <span className="truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                        {doc.folder?.name ?? nomDossier(doc.folder_id)}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">{doc.category?.name ?? '—'}</td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 sm:table-cell">{tailleLisible(doc.file_size)}</td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 lg:table-cell">{dateLisible(doc.created_at)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statut.classe}`}>
                          {statut.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => apercu(doc)}
                            title="Aperçu"
                            className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => telecharger(doc)}
                            title="Télécharger"
                            className="rounded-md p-2 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={() => supprimer(doc)}
                            title="Supprimer"
                            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.derniere > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
            <span>
              Page {pagination.page} sur {pagination.derniere}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => chargerDocuments(pagination.page - 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button
                disabled={pagination.page >= pagination.derniere}
                onClick={() => chargerDocuments(pagination.page + 1)}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panneau de dépôt */}
      {panneauOuvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={fermerPanneau} />
          <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">Déposer des documents</h2>
              <button onClick={fermerPanneau} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* Zone de glisser-déposer */}
              <div
                onClick={() => inputFichier.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setSurvol(true);
                }}
                onDragLeave={() => setSurvol(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setSurvol(false);
                  ajouterFichiers(e.dataTransfer.files);
                }}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                  survol ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50'
                }`}
              >
                <Upload size={28} className="mx-auto text-brand-500" />
                <p className="mt-2 text-sm font-medium text-slate-700">Glissez vos fichiers ici</p>
                <p className="text-xs text-slate-500">ou cliquez pour parcourir</p>
                <input
                  ref={inputFichier}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    ajouterFichiers(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {fichiers.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {fichiers.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <IconeFichier mime={f.type} />
                        <span className="truncate text-slate-700">{f.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{tailleLisible(f.size)}</span>
                      </div>
                      {!envoi.enCours && (
                        <button onClick={() => retirerFichier(i)} className="rounded p-1 text-slate-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Dossier de destination <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.folder_id}
                  onChange={(e) => setForm({ ...form, folder_id: e.target.value })}
                  className={champ}
                >
                  <option value="">— Choisir un dossier —</option>
                  {dossiers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Catégorie</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className={champ}
                  >
                    <option value="">Aucune</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Client</label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className={champ}
                  >
                    <option value="">Aucun</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={fermerPanneau}
                disabled={envoi.enCours}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={deposer}
                disabled={envoi.enCours}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {envoi.enCours ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Envoi {envoi.fait}/{fichiers.length}…
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Déposer {fichiers.length > 0 ? `(${fichiers.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}