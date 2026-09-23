import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  History,
  Share2,
  Upload,
  Download,
  RotateCcw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  Copy,
  Lock,
  Unlock,
  CalendarClock,
  Ban,
  Plus,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

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

function dateHeure(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

function etatPartage(p) {
  if (p.revoked_at) return { label: 'Révoqué', classe: 'bg-slate-100 text-slate-500', actif: false };
  if (p.expires_at && new Date(p.expires_at) < new Date())
    return { label: 'Expiré', classe: 'bg-amber-50 text-amber-700', actif: false };
  if (p.max_downloads && p.download_count >= p.max_downloads)
    return { label: 'Épuisé', classe: 'bg-amber-50 text-amber-700', actif: false };
  return { label: 'Actif', classe: 'bg-emerald-50 text-emerald-700', actif: true };
}

const lienPublic = (token) => `${window.location.origin}/partage/${token}`;

export default function DocumentPanel({ document: doc, onClose, onChange }) {
  const [onglet, setOnglet] = useState('versions');
  const [courante, setCourante] = useState(doc.current_version_id);
  const [versions, setVersions] = useState([]);
  const [partages, setPartages] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [notification, setNotification] = useState(null);

  // Nouvelle version
  const [fichier, setFichier] = useState(null);
  const [commentaire, setCommentaire] = useState('');
  const inputFichier = useRef(null);

  // Nouveau partage
  const [formPartage, setFormPartage] = useState(null); // { password, expires_at, max_downloads }
  const [copie, setCopie] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 4000);
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [resDoc, resVersions, resPartages] = await Promise.all([
        axiosClient.get(`/documents/${doc.id}`),
        axiosClient.get(`/documents/${doc.id}/versions`),
        axiosClient.get(`/documents/${doc.id}/shares`),
      ]);
      setCourante(resDoc.data.data?.current_version_id ?? null);
      setVersions(resVersions.data.data ?? []);
      setPartages(resPartages.data.data ?? []);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Impossible de charger la fiche du document.'));
    } finally {
      setChargement(false);
    }
  }, [doc.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // ----- Versions -----
  const envoyerVersion = async () => {
    if (!fichier) return;
    setOccupe(true);
    const donnees = new FormData();
    donnees.append('file', fichier);
    if (commentaire.trim()) donnees.append('comment', commentaire.trim());
    try {
      await axiosClient.post(`/documents/${doc.id}/versions`, donnees, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      notifier('succes', 'Nouvelle version ajoutée.');
      setFichier(null);
      setCommentaire('');
      await charger();
      onChange?.();
    } catch (err) {
      notifier('erreur', messageErreur(err, "L'envoi de la version a échoué."));
    } finally {
      setOccupe(false);
    }
  };

  const telechargerVersion = async (v) => {
    try {
      const res = await axiosClient.get(`/documents/${doc.id}/versions/${v.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const lien = window.document.createElement('a');
      lien.href = url;
      lien.download = `v${v.version_number}_${doc.name}`;
      window.document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notifier('erreur', 'Téléchargement impossible.');
    }
  };

  const restaurer = async (v) => {
    if (!window.confirm(`Revenir à la version ${v.version_number} ? Elle deviendra la version courante.`)) return;
    setOccupe(true);
    try {
      await axiosClient.post(`/documents/${doc.id}/versions/${v.id}/restore`);
      notifier('succes', `La version ${v.version_number} est maintenant la version courante.`);
      await charger();
      onChange?.();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Restauration impossible.'));
    } finally {
      setOccupe(false);
    }
  };

  const supprimerVersion = async (v) => {
    if (!window.confirm(`Supprimer définitivement la version ${v.version_number} ?`)) return;
    setOccupe(true);
    try {
      await axiosClient.delete(`/documents/${doc.id}/versions/${v.id}`);
      notifier('succes', 'Version supprimée.');
      await charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    } finally {
      setOccupe(false);
    }
  };

  // ----- Partages -----
  const creerPartage = async () => {
    setOccupe(true);
    const donnees = {};
    if (formPartage.password) donnees.password = formPartage.password;
    if (formPartage.expires_at) donnees.expires_at = `${formPartage.expires_at} 23:59:59`;
    if (formPartage.max_downloads) donnees.max_downloads = Number(formPartage.max_downloads);
    try {
      const res = await axiosClient.post(`/documents/${doc.id}/shares`, donnees);
      setFormPartage(null);
      await charger();
      const token = res.data.data?.token;
      if (token) {
        await copier(token);
        notifier('succes', 'Lien créé et copié dans le presse-papiers.');
      }
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Création du lien impossible.'));
    } finally {
      setOccupe(false);
    }
  };

  const copier = async (token) => {
    try {
      await navigator.clipboard.writeText(lienPublic(token));
      setCopie(token);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      window.prompt('Copiez ce lien :', lienPublic(token));
    }
  };

  const revoquer = async (p) => {
    if (!window.confirm('Révoquer ce lien ? Il ne fonctionnera plus.')) return;
    setOccupe(true);
    try {
      await axiosClient.delete(`/shares/${p.id}`);
      notifier('succes', 'Lien révoqué.');
      await charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Révocation impossible.'));
    } finally {
      setOccupe(false);
    }
  };

  const demain = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const champ =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  const Onglet = ({ id, icone: Icone, libelle, nb }) => (
    <button
      onClick={() => setOnglet(id)}
      className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
        onglet === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icone size={16} /> {libelle}
      {nb != null && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{nb}</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !occupe && onClose()} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Fiche document</p>
            <h2 className="break-words text-lg font-semibold text-slate-800">{doc.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-2">
          <Onglet id="versions" icone={History} libelle="Versions" nb={chargement ? null : versions.length} />
          <Onglet id="partages" icone={Share2} libelle="Partages" nb={chargement ? null : partages.length} />
        </div>

        {notification && (
          <div
            className={`mx-6 mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              notification.type === 'succes'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notification.type === 'succes' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.texte}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {chargement ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 size={18} className="animate-spin" /> Chargement…
            </div>
          ) : onglet === 'versions' ? (
            <div className="space-y-4">
              {/* Ajouter une version */}
              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <p className="text-sm font-medium text-slate-700">Ajouter une nouvelle version</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => inputFichier.current?.click()}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Upload size={16} className="shrink-0" />
                    <span className="truncate">{fichier ? fichier.name : 'Choisir un fichier…'}</span>
                  </button>
                  <input
                    ref={inputFichier}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      setFichier(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </div>
                {fichier && (
                  <>
                    <input
                      type="text"
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                      placeholder="Commentaire (ex. : corrections du client)"
                      className={`${champ} mt-2`}
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setFichier(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={envoyerVersion}
                        disabled={occupe}
                        className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {occupe && <Loader2 size={14} className="animate-spin" />} Envoyer
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Historique */}
              {versions.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Aucune version enregistrée pour ce document (déposé avant l'activation du versionnage).
                </p>
              ) : (
                <ol className="relative space-y-3 border-l-2 border-slate-100 pl-5">
                  {versions.map((v) => {
                    const estCourante = v.id === courante;
                    return (
                      <li key={v.id} className="relative">
                        <span
                          className={`absolute -left-[27px] top-3 h-3 w-3 rounded-full border-2 border-white ${
                            estCourante ? 'bg-brand-600' : 'bg-slate-300'
                          }`}
                        />
                        <div
                          className={`rounded-lg border p-3 ${
                            estCourante ? 'border-brand-200 bg-brand-50/50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-800">Version {v.version_number}</span>
                                {estCourante && (
                                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                                    Courante
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {dateHeure(v.created_at)} · {tailleLisible(v.file_size)}
                              </p>
                              {v.comment && <p className="mt-1 text-sm text-slate-600">« {v.comment} »</p>}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => telechargerVersion(v)}
                                title="Télécharger cette version"
                                className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-brand-600"
                              >
                                <Download size={15} />
                              </button>
                              {!estCourante && (
                                <>
                                  <button
                                    onClick={() => restaurer(v)}
                                    disabled={occupe}
                                    title="Restaurer cette version"
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-brand-600"
                                  >
                                    <RotateCcw size={15} />
                                  </button>
                                  <button
                                    onClick={() => supprimerVersion(v)}
                                    disabled={occupe}
                                    title="Supprimer cette version"
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-red-600"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Créer un partage */}
              {formPartage ? (
                <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
                  <p className="text-sm font-medium text-slate-700">Nouveau lien de partage</p>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Mot de passe (conseillé)</label>
                    <input
                      type="text"
                      value={formPartage.password}
                      onChange={(e) => setFormPartage({ ...formPartage, password: e.target.value })}
                      placeholder="Laisser vide pour un lien sans mot de passe"
                      className={champ}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Expire le</label>
                      <input
                        type="date"
                        min={demain}
                        value={formPartage.expires_at}
                        onChange={(e) => setFormPartage({ ...formPartage, expires_at: e.target.value })}
                        className={champ}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Téléchargements max.</label>
                      <input
                        type="number"
                        min="1"
                        value={formPartage.max_downloads}
                        onChange={(e) => setFormPartage({ ...formPartage, max_downloads: e.target.value })}
                        placeholder="Illimité"
                        className={champ}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setFormPartage(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={creerPartage}
                      disabled={occupe}
                      className="flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {occupe ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Créer le lien
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setFormPartage({ password: '', expires_at: '', max_downloads: '' })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-brand-600 hover:border-brand-500 hover:bg-brand-50"
                >
                  <Plus size={16} /> Créer un lien de partage
                </button>
              )}

              {/* Liste des partages */}
              {partages.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Ce document n'a jamais été partagé.</p>
              ) : (
                <ul className="space-y-3">
                  {partages.map((p) => {
                    const etat = etatPartage(p);
                    return (
                      <li key={p.id} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${etat.classe}`}>
                              {etat.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              {p.has_password ? <Lock size={12} /> : <Unlock size={12} />}
                              {p.has_password ? 'Protégé' : 'Sans mot de passe'}
                            </span>
                          </div>
                          {etat.actif && (
                            <div className="flex shrink-0 gap-1">
                              <button
                                onClick={() => copier(p.token)}
                                title="Copier le lien"
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                              >
                                {copie === p.token ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                {copie === p.token ? 'Copié' : 'Copier'}
                              </button>
                              <button
                                onClick={() => revoquer(p)}
                                disabled={occupe}
                                title="Révoquer"
                                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Ban size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                          <p className="flex items-center gap-1">
                            <CalendarClock size={12} />
                            {p.expires_at ? `Expire le ${dateHeure(p.expires_at)}` : 'Sans date d’expiration'}
                          </p>
                          <p>
                            {p.download_count ?? 0} téléchargement{(p.download_count ?? 0) > 1 ? 's' : ''}
                            {p.max_downloads ? ` sur ${p.max_downloads} autorisés` : ''} · créé le {dateHeure(p.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}