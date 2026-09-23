import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  Home,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { foldersApi } from '../../api/foldersApi';
import { documentsApi } from '../../api/documentsApi';

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
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

export default function FoldersPage() {
  const [params, setParams] = useSearchParams();
  const dossierId = params.get('dossier') ? Number(params.get('dossier')) : null;

  const [sousDossiers, setSousDossiers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [ariane, setAriane] = useState([]);
  const [chargement, setChargement] = useState(true);

  // Fenêtre de création / renommage : { mode: 'creer' | 'renommer', dossier?, nom }
  const [fenetre, setFenetre] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [notification, setNotification] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 4000);
  };

  const ouvrir = (id) => {
    if (id) setParams({ dossier: String(id) });
    else setParams({});
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const resDossiers = await foldersApi.list(dossierId ?? undefined);
      setSousDossiers(resDossiers.data.data ?? []);

      if (dossierId) {
        const [resAriane, resDocs] = await Promise.all([
          foldersApi.breadcrumb(dossierId),
          documentsApi.list({ folder_id: dossierId }),
        ]);
        setAriane(resAriane.data.data ?? []);
        setDocuments((resDocs.data.data ?? []).filter((d) => d.folder_id === dossierId));
      } else {
        setAriane([]);
        setDocuments([]);
      }
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Impossible de charger les dossiers.'));
    } finally {
      setChargement(false);
    }
  }, [dossierId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const valider = async () => {
    const nom = fenetre?.nom?.trim();
    if (!nom) {
      notifier('erreur', 'Le nom du dossier est obligatoire.');
      return;
    }
    setEnvoi(true);
    try {
      if (fenetre.mode === 'creer') {
        await foldersApi.create({ name: nom, ...(dossierId ? { parent_id: dossierId } : {}) });
        notifier('succes', `Dossier « ${nom} » créé.`);
      } else {
        await foldersApi.update(fenetre.dossier.id, { name: nom });
        notifier('succes', 'Dossier renommé.');
      }
      setFenetre(null);
      charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, "L'opération a échoué."));
    } finally {
      setEnvoi(false);
    }
  };

  const supprimer = async (dossier) => {
    if (!window.confirm(`Supprimer le dossier « ${dossier.name} » ?`)) return;
    try {
      await foldersApi.delete(dossier.id);
      notifier('succes', 'Dossier supprimé.');
      charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const dossierCourant = ariane[ariane.length - 1];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-800">
            {dossierCourant ? dossierCourant.name : 'Dossiers'}
          </h1>

          {/* Fil d'Ariane */}
          <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm text-slate-500">
            <button
              onClick={() => ouvrir(null)}
              className="flex items-center gap-1 rounded px-1 hover:bg-slate-100 hover:text-brand-600"
            >
              <Home size={14} /> Racine
            </button>
            {ariane.map((d, i) => (
              <span key={d.id} className="flex items-center gap-1">
                <ChevronRight size={14} className="text-slate-300" />
                {i === ariane.length - 1 ? (
                  <span className="px-1 font-medium text-slate-700">{d.name}</span>
                ) : (
                  <button onClick={() => ouvrir(d.id)} className="rounded px-1 hover:bg-slate-100 hover:text-brand-600">
                    {d.name}
                  </button>
                )}
              </span>
            ))}
          </nav>
        </div>

        <button
          onClick={() => setFenetre({ mode: 'creer', nom: '' })}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <FolderPlus size={18} /> Nouveau dossier
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

      {chargement ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <>
          {/* Sous-dossiers */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {dossierId ? 'Sous-dossiers' : 'Dossiers'}
            </h2>
            {sousDossiers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <Folder size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">Aucun dossier ici.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sousDossiers.map((d) => (
                  <div
                    key={d.id}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow"
                  >
                    <button onClick={() => ouvrir(d.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
                        <Folder size={22} fill="currentColor" fillOpacity={0.15} />
                      </span>
                      <span className="block min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{d.name}</span>
                        <span className="block whitespace-nowrap text-xs text-slate-500">
                          {d.documents_count ?? 0} document{(d.documents_count ?? 0) > 1 ? 's' : ''}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        onClick={() => setFenetre({ mode: 'renommer', dossier: d, nom: d.name })}
                        title="Renommer"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => supprimer(d)}
                        title="Supprimer"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Documents du dossier */}
          {dossierId && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Documents de ce dossier
              </h2>
              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
                  Aucun document dans ce dossier.{' '}
                  <Link to="/documents" className="font-medium text-brand-600 hover:underline">
                    Déposer un document
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText size={18} className="shrink-0 text-red-500" />
                        <span className="truncate font-medium text-slate-700">{doc.name}</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-slate-500">{tailleLisible(doc.file_size)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {/* Fenêtre création / renommage */}
      {fenetre && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setFenetre(null)} />
          <div className="relative w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {fenetre.mode === 'creer' ? 'Nouveau dossier' : 'Renommer le dossier'}
              </h2>
              <button onClick={() => setFenetre(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-5">
              {fenetre.mode === 'creer' && (
                <p className="mb-3 text-sm text-slate-500">
                  Emplacement : <span className="font-medium text-slate-700">{dossierCourant ? dossierCourant.name : 'Racine'}</span>
                </p>
              )}
              <label className="mb-1 block text-sm font-medium text-slate-700">Nom du dossier</label>
              <input
                autoFocus
                type="text"
                value={fenetre.nom}
                onChange={(e) => setFenetre({ ...fenetre, nom: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && valider()}
                placeholder="Ex. : Factures 2026"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setFenetre(null)}
                disabled={envoi}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={valider}
                disabled={envoi}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {envoi && <Loader2 size={16} className="animate-spin" />}
                {fenetre.mode === 'creer' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}