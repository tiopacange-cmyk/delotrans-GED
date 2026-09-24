import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DatabaseBackup,
  Database,
  Settings2,
  Layers,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarClock,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const TYPES = {
  database: { label: 'Base de données', icone: Database, aide: 'Toutes les données de l’application' },
  config: { label: 'Configuration', icone: Settings2, aide: 'Paramètres du serveur (.env)' },
  full: { label: 'Complète', icone: Layers, aide: 'Base de données et configuration' },
};

const STATUTS = {
  pending: { label: 'En attente', classe: 'bg-slate-100 text-slate-600', icone: Clock },
  running: { label: 'En cours', classe: 'bg-brand-50 text-brand-700', icone: Loader2, tourne: true },
  completed: { label: 'Réussie', classe: 'bg-emerald-50 text-emerald-700', icone: CheckCircle2 },
  failed: { label: 'Échouée', classe: 'bg-red-50 text-red-700', icone: XCircle },
};

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

function duree(debut, fin) {
  if (!debut || !fin) return null;
  const s = Math.max(0, Math.round((new Date(fin) - new Date(debut)) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

export default function BackupsPage() {
  const [sauvegardes, setSauvegardes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [lancement, setLancement] = useState(null); // type en cours de lancement
  const [notification, setNotification] = useState(null);
  const minuteur = useRef(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 5000);
  };

  const charger = useCallback(async (silencieux = false) => {
    if (!silencieux) setChargement(true);
    try {
      const res = await axiosClient.get('/backups');
      const d = res.data;
      setSauvegardes(Array.isArray(d?.data?.data) ? d.data.data : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
    } catch (err) {
      if (!silencieux) notifier('erreur', messageErreur(err, 'Impossible de charger les sauvegardes.'));
    } finally {
      if (!silencieux) setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // Rafraîchissement automatique tant qu'une sauvegarde est en attente ou en cours
  const enCours = sauvegardes.some((b) => b.status === 'pending' || b.status === 'running');
  useEffect(() => {
    clearInterval(minuteur.current);
    if (enCours) minuteur.current = setInterval(() => charger(true), 3000);
    return () => clearInterval(minuteur.current);
  }, [enCours, charger]);

  const lancer = async (type) => {
    setLancement(type);
    try {
      await axiosClient.post('/backups/run', { type });
      notifier('succes', `Sauvegarde « ${TYPES[type].label} » lancée.`);
      charger(true);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Impossible de lancer la sauvegarde.'));
    } finally {
      setLancement(null);
    }
  };

  const telecharger = async (b) => {
    try {
      const res = await axiosClient.get(`/backups/${b.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = (b.file_path || `sauvegarde-${b.id}`).split('/').pop();
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      notifier('erreur', 'Téléchargement impossible (fichier absent ?).');
    }
  };

  const supprimer = async (b) => {
    if (!window.confirm('Supprimer cette sauvegarde ? Le fichier sera effacé.')) return;
    try {
      await axiosClient.delete(`/backups/${b.id}`);
      notifier('succes', 'Sauvegarde supprimée.');
      charger(true);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const derniereReussie = sauvegardes.find((b) => b.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sauvegardes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {derniereReussie
              ? `Dernière sauvegarde réussie : ${dateHeure(derniereReussie.completed_at || derniereReussie.created_at)}`
              : 'Aucune sauvegarde réussie pour le moment.'}
          </p>
        </div>
        <button
          onClick={() => charger()}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} /> Actualiser
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

      {/* Lancement manuel */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Object.entries(TYPES).map(([type, { label, icone: Icone, aide }]) => (
          <button
            key={type}
            onClick={() => lancer(type)}
            disabled={lancement !== null}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow disabled:opacity-60"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {lancement === type ? <Loader2 size={20} className="animate-spin" /> : <Icone size={20} />}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-800">Sauvegarder : {label}</span>
              <span className="block text-xs text-slate-500">{aide}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Planning automatique */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
        <CalendarClock size={18} className="mt-0.5 shrink-0" />
        <p>
          <span className="font-semibold">Sauvegardes automatiques :</span> base de données chaque nuit à 2 h,
          configuration chaque dimanche à 3 h (heure de Douala).
        </p>
      </div>

      {/* Historique */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Historique</h2>
        </div>
        {chargement ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" /> Chargement…
          </div>
        ) : sauvegardes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <DatabaseBackup size={36} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Aucune sauvegarde pour l'instant.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sauvegardes.map((b) => {
              const type = TYPES[b.type] ?? { label: b.type, icone: DatabaseBackup };
              const statut = STATUTS[b.status] ?? STATUTS.pending;
              const IconeType = type.icone;
              const IconeStatut = statut.icone;
              const d = duree(b.started_at, b.completed_at);
              return (
                <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <IconeType size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-800">{type.label}</span>
                        <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statut.classe}`}>
                          <IconeStatut size={12} className={statut.tourne ? 'animate-spin' : ''} />
                          {statut.label}
                        </span>
                        {!b.created_by && (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">Automatique</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {dateHeure(b.created_at)}
                        {d && ` · durée ${d}`}
                      </p>
                      {b.status === 'failed' && b.error_message && (
                        <p className="mt-1 break-words text-xs text-red-600">{b.error_message}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 self-end sm:self-auto">
                    {b.status === 'completed' && (
                      <button
                        onClick={() => telecharger(b)}
                        title="Télécharger"
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-600"
                      >
                        <Download size={15} /> Télécharger
                      </button>
                    )}
                    <button
                      onClick={() => supprimer(b)}
                      title="Supprimer"
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}