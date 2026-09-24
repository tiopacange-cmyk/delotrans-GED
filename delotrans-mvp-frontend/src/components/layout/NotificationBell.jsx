import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, HardDrive, DatabaseBackup, Share2, Info, X, CheckCheck, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

function icone(type = '') {
  if (type.startsWith('nas')) return HardDrive;
  if (type.startsWith('backup')) return DatabaseBackup;
  if (type.startsWith('share')) return Share2;
  return Info;
}

function couleur(type = '') {
  if (type.endsWith('failed') || type.endsWith('offline') || type.endsWith('full')) return 'bg-red-50 text-red-600';
  if (type.endsWith('completed') || type.endsWith('online')) return 'bg-emerald-50 text-emerald-600';
  return 'bg-brand-50 text-brand-600';
}

function ilYa(iso) {
  if (!iso) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j < 7) return `il y a ${j} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export default function NotificationBell() {
  const [ouvert, setOuvert] = useState(false);
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(false);
  const zone = useRef(null);

  const charger = useCallback(async () => {
    try {
      const res = await axiosClient.get('/notifications');
      const d = res.data;
      const items = Array.isArray(d?.data?.data) ? d.data.data : Array.isArray(d?.data) ? d.data : [];
      setListe([...items].sort((a, b) => b.id - a.id));
    } catch {
      /* silencieux : la cloche ne doit jamais gêner */
    }
  }, []);

  // Chargement initial puis toutes les 60 secondes
  useEffect(() => {
    charger();
    const t = setInterval(charger, 60000);
    return () => clearInterval(t);
  }, [charger]);

  // Fermer en cliquant à l'extérieur
  useEffect(() => {
    const fermer = (e) => {
      if (zone.current && !zone.current.contains(e.target)) setOuvert(false);
    };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);

  const basculer = async () => {
    const suivant = !ouvert;
    setOuvert(suivant);
    if (suivant) {
      setChargement(true);
      await charger();
      setChargement(false);
    }
  };

  const marquerLue = async (n) => {
    if (n.read_at) return;
    setListe((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    try {
      await axiosClient.put(`/notifications/${n.id}/read`);
    } catch {
      charger();
    }
  };

  const toutLire = async () => {
    const maintenant = new Date().toISOString();
    setListe((l) => l.map((x) => ({ ...x, read_at: x.read_at ?? maintenant })));
    try {
      await axiosClient.put('/notifications/read-all');
    } catch {
      charger();
    }
  };

  const supprimer = async (e, n) => {
    e.stopPropagation();
    setListe((l) => l.filter((x) => x.id !== n.id));
    try {
      await axiosClient.delete(`/notifications/${n.id}`);
    } catch {
      charger();
    }
  };

  const nonLues = liste.filter((n) => !n.read_at).length;

  return (
    <div className="relative" ref={zone}>
      <button
        onClick={basculer}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {nonLues > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="font-semibold text-slate-800">Notifications</h3>
              <p className="text-xs text-slate-500">
                {nonLues > 0 ? `${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Tout est lu'}
              </p>
            </div>
            {nonLues > 0 && (
              <button
                onClick={toutLire}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
              >
                <CheckCheck size={14} /> Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {chargement && liste.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Chargement…
              </div>
            ) : liste.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={32} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">Aucune notification.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {liste.map((n) => {
                  const Icone = icone(n.type);
                  return (
                    <li
                      key={n.id}
                      onClick={() => marquerLue(n)}
                      className={`group flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-slate-50 ${
                        n.read_at ? '' : 'bg-brand-50/40'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${couleur(n.type)}`}>
                        <Icone size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${n.read_at ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>{n.title}</p>
                          {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        </div>
                        {n.message && <p className="mt-0.5 break-words text-xs text-slate-500">{n.message}</p>}
                        <p className="mt-1 text-[11px] text-slate-400">{ilYa(n.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => supprimer(e, n)}
                        title="Supprimer"
                        className="self-start rounded p-1 text-slate-300 opacity-100 hover:bg-slate-100 hover:text-slate-500 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}