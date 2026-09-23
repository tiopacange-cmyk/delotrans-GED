import { useCallback, useEffect, useState } from 'react';
import {
  HardDrive,
  Plus,
  Pencil,
  Trash2,
  PlugZap,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
  FolderOpen,
  User,
  RefreshCw,
  Info,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const MARQUES = { synology: 'Synology', qnap: 'QNAP', truenas: 'TrueNAS' };
const PROTOCOLES = {
  smb: { label: 'SMB (partage Windows)', port: 445 },
  nfs: { label: 'NFS (partage Linux)', port: 2049 },
  ftp: { label: 'FTP', port: 21 },
};
const VIDE = {
  name: '',
  driver: 'synology',
  host: '',
  port: 445,
  protocol: 'smb',
  username: '',
  password: '',
  base_path: '/mnt/nas-delotrans',
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

function messageErreur(err, defaut) {
  const data = err?.response?.data;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  return data?.message || defaut;
}

function CarteNas({ nas, onModifier, onSupprimer, notifier }) {
  const [etat, setEtat] = useState(null);
  const [test, setTest] = useState(null); // { enCours } | { success, message }

  const actualiser = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/nas/${nas.id}/status`);
      setEtat(res.data.data);
    } catch {
      setEtat({ status: 'offline' });
    }
  }, [nas.id]);

  useEffect(() => {
    actualiser();
  }, [actualiser]);

  const tester = async () => {
    setTest({ enCours: true });
    try {
      const res = await axiosClient.post(`/nas/${nas.id}/test`);
      setTest(res.data.data);
      actualiser();
    } catch (err) {
      setTest({ success: false, message: messageErreur(err, 'Le test a échoué.') });
    }
  };

  const enLigne = etat?.status === 'online';
  const total = etat?.total_bytes || 0;
  const utilise = etat?.used_bytes || 0;
  const pct = total ? Math.round((utilise / total) * 100) : 0;
  const couleur = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <HardDrive size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-slate-800">{nas.name}</h3>
            <p className="text-xs text-slate-500">
              {MARQUES[nas.driver] ?? nas.driver} · {PROTOCOLES[nas.protocol]?.label ?? nas.protocol}
            </p>
          </div>
        </div>
        {etat ? (
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              enLigne ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${enLigne ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {enLigne ? 'En ligne' : 'Hors ligne'}
          </span>
        ) : (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        )}
      </div>

      {/* Espace disque */}
      <div className="mt-5">
        <div className="flex items-end justify-between text-sm">
          <span className="font-semibold text-slate-800">{total ? `${pct} % utilisé` : 'Espace inconnu'}</span>
          {total > 0 && (
            <span className="text-slate-500">
              {tailleLisible(utilise)} / {tailleLisible(total)}
            </span>
          )}
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${couleur}`} style={{ width: `${pct}%` }} />
        </div>
        {etat?.free_bytes != null && (
          <p className="mt-1 text-xs text-slate-500">{tailleLisible(etat.free_bytes)} libres</p>
        )}
      </div>

      {/* Informations */}
      <dl className="mt-4 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Server size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">
            {nas.host}:{nas.port}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="shrink-0 text-slate-400" />
          <span className="truncate font-mono text-xs">{nas.base_path}</span>
        </div>
        <div className="flex items-center gap-2">
          <User size={14} className="shrink-0 text-slate-400" />
          <span className="truncate">{nas.username}</span>
        </div>
      </dl>

      {/* Résultat du test */}
      {test && !test.enCours && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            test.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {test.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span className="break-words">{test.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button
          onClick={tester}
          disabled={test?.enCours}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {test?.enCours ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
          Tester la connexion
        </button>
        <button
          onClick={actualiser}
          title="Actualiser l'état"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onModifier(nas)}
          title="Modifier"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-600"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => onSupprimer(nas)}
          title="Supprimer"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default function NasPage() {
  const [liste, setListe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formulaire, setFormulaire] = useState(null); // { id?, valeurs }
  const [erreursChamps, setErreursChamps] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [notification, setNotification] = useState(null);
  const [cle, setCle] = useState(0); // force le rafraîchissement des cartes

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 5000);
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await axiosClient.get('/nas');
      const d = res.data;
      setListe(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      setCle((c) => c + 1);
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Impossible de charger les NAS.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const ouvrir = (nas) => {
    setErreursChamps({});
    setFormulaire(
      nas
        ? {
            id: nas.id,
            valeurs: {
              name: nas.name ?? '',
              driver: nas.driver ?? 'synology',
              host: nas.host ?? '',
              port: nas.port ?? 445,
              protocol: nas.protocol ?? 'smb',
              username: nas.username ?? '',
              password: '',
              base_path: nas.base_path ?? '',
            },
          }
        : { valeurs: { ...VIDE } }
    );
  };

  const changer = (champ, valeur) =>
    setFormulaire((f) => {
      const valeurs = { ...f.valeurs, [champ]: valeur };
      if (champ === 'protocol') valeurs.port = PROTOCOLES[valeur]?.port ?? valeurs.port;
      return { ...f, valeurs };
    });

  const enregistrer = async () => {
    setEnvoi(true);
    setErreursChamps({});
    const v = formulaire.valeurs;
    const donnees = { ...v, port: Number(v.port) };
    if (formulaire.id && !v.password) delete donnees.password; // garder l'ancien mot de passe
    try {
      if (formulaire.id) {
        await axiosClient.put(`/nas/${formulaire.id}`, donnees);
        notifier('succes', 'NAS modifié.');
      } else {
        await axiosClient.post('/nas', donnees);
        notifier('succes', 'NAS ajouté. Pensez à tester la connexion.');
      }
      setFormulaire(null);
      charger();
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

  const supprimer = async (nas) => {
    if (!window.confirm(`Supprimer la configuration du NAS « ${nas.name} » ?\nLes fichiers présents sur le NAS ne sont pas effacés.`)) return;
    try {
      await axiosClient.delete(`/nas/${nas.id}`);
      notifier('succes', 'Configuration supprimée.');
      charger();
    } catch (err) {
      notifier('erreur', messageErreur(err, 'Suppression impossible.'));
    }
  };

  const champ = (erreur) =>
    `w-full rounded-lg border px-3 py-2 text-sm text-slate-700 outline-none transition focus:ring-2 ${
      erreur ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
    }`;
  const Erreur = ({ c }) => (erreursChamps[c] ? <p className="mt-1 text-xs text-red-600">{erreursChamps[c]}</p> : null);
  const Libelle = ({ children, requis }) => (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children} {requis && <span className="text-red-500">*</span>}
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stockage NAS</h1>
          <p className="mt-1 text-sm text-slate-500">Connexion, surveillance et espace disque de vos NAS.</p>
        </div>
        <button
          onClick={() => ouvrir(null)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={18} /> Ajouter un NAS
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

      {chargement ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
          <Loader2 size={18} className="animate-spin" /> Chargement…
        </div>
      ) : liste.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <HardDrive size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aucun NAS configuré.</p>
          <button onClick={() => ouvrir(null)} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
            Ajouter votre premier NAS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {liste.map((nas) => (
            <CarteNas key={`${nas.id}-${cle}`} nas={nas} onModifier={ouvrir} onSupprimer={supprimer} notifier={notifier} />
          ))}
        </div>
      )}

      {/* Formulaire */}
      {formulaire && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setFormulaire(null)} />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">{formulaire.id ? 'Modifier le NAS' : 'Ajouter un NAS'}</h2>
              <button onClick={() => setFormulaire(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <Libelle requis>Nom</Libelle>
                <input
                  value={formulaire.valeurs.name}
                  onChange={(e) => changer('name', e.target.value)}
                  placeholder="Ex. : NAS principal bureau Douala"
                  className={champ(erreursChamps.name)}
                />
                <Erreur c="name" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Libelle requis>Marque</Libelle>
                  <select value={formulaire.valeurs.driver} onChange={(e) => changer('driver', e.target.value)} className={champ(erreursChamps.driver)}>
                    {Object.entries(MARQUES).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Erreur c="driver" />
                </div>
                <div>
                  <Libelle requis>Protocole</Libelle>
                  <select value={formulaire.valeurs.protocol} onChange={(e) => changer('protocol', e.target.value)} className={champ(erreursChamps.protocol)}>
                    {Object.entries(PROTOCOLES).map(([k, p]) => (
                      <option key={k} value={k}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <Erreur c="protocol" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Libelle requis>Adresse du NAS</Libelle>
                  <input
                    value={formulaire.valeurs.host}
                    onChange={(e) => changer('host', e.target.value)}
                    placeholder="192.168.1.50"
                    className={champ(erreursChamps.host)}
                  />
                  <Erreur c="host" />
                </div>
                <div>
                  <Libelle requis>Port</Libelle>
                  <input
                    type="number"
                    value={formulaire.valeurs.port}
                    onChange={(e) => changer('port', e.target.value)}
                    className={champ(erreursChamps.port)}
                  />
                  <Erreur c="port" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Libelle requis>Utilisateur</Libelle>
                  <input
                    value={formulaire.valeurs.username}
                    onChange={(e) => changer('username', e.target.value)}
                    autoComplete="off"
                    className={champ(erreursChamps.username)}
                  />
                  <Erreur c="username" />
                </div>
                <div>
                  <Libelle requis={!formulaire.id}>Mot de passe</Libelle>
                  <input
                    type="password"
                    value={formulaire.valeurs.password}
                    onChange={(e) => changer('password', e.target.value)}
                    autoComplete="new-password"
                    placeholder={formulaire.id ? 'Inchangé' : ''}
                    className={champ(erreursChamps.password)}
                  />
                  <Erreur c="password" />
                </div>
              </div>

              <div>
                <Libelle requis>{formulaire.valeurs.protocol === 'ftp' ? 'Dossier sur le NAS' : 'Chemin de montage sur le serveur'}</Libelle>
                <input
                  value={formulaire.valeurs.base_path}
                  onChange={(e) => changer('base_path', e.target.value)}
                  className={`${champ(erreursChamps.base_path)} font-mono`}
                />
                <Erreur c="base_path" />
                {formulaire.valeurs.protocol !== 'ftp' && (
                  <p className="mt-2 flex gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
                    <Info size={14} className="mt-0.5 shrink-0" />
                    Le partage du NAS doit être monté sur le serveur Ubuntu à cet emplacement (voir le manuel
                    d'installation). L'application y range les documents comme dans un dossier local.
                  </p>
                )}
              </div>
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
                {formulaire.id ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}