import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FileStack, FileText, Lock, Download, Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// Client sans jeton : cette page est publique
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
});
const origineApi = new URL(import.meta.env.VITE_API_URL).origin;

const ERREURS = {
  404: { titre: 'Lien introuvable', texte: "Ce lien de partage n'existe pas ou a été supprimé." },
  410: { titre: 'Lien expiré', texte: "Ce lien de partage n'est plus valide. Demandez un nouveau lien à l'expéditeur." },
  403: { titre: 'Lien révoqué', texte: "L'accès à ce document a été retiré par l'expéditeur." },
};

// Téléchargement en arrière-plan : on reste sur la page et le fichier garde son nom
async function lancerTelechargement(url, nom) {
  const res = await api.get(url, { responseType: "blob" });
  const lienFichier = URL.createObjectURL(res.data);
  const lien = document.createElement("a");
  lien.href = lienFichier;
  lien.download = nom || "document";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lienFichier), 1000);
}

export default function SharePage() {
  const { token } = useParams();
  const [etat, setEtat] = useState('chargement'); // chargement | pret | erreur | termine
  const [infos, setInfos] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [messageMdp, setMessageMdp] = useState('');

  useEffect(() => {
    api
      .get(`/public/shares/${token}`)
      .then((res) => {
        setInfos(res.data.data);
        setEtat('pret');
      })
      .catch((err) => {
        const code = err?.response?.status;
        setErreur(
          ERREURS[code] ?? { titre: 'Erreur', texte: err?.response?.data?.message || 'Impossible de charger ce lien.' }
        );
        setEtat('erreur');
      });
  }, [token]);

  const telecharger = async (e) => {
    e?.preventDefault();
    setMessageMdp('');

    if (!infos.requires_password) {
      setEnvoi(true);
      try {
        await lancerTelechargement(`${import.meta.env.VITE_API_URL}/public/shares/${token}/download`, infos.document_name);
        setEtat("termine");
      } catch {
        setMessageMdp("Le téléchargement a échoué. Réessayez.");
      } finally {
        setEnvoi(false);
      }
      return;
      setEtat('termine');
      return;
    }

    if (!motDePasse) {
      setMessageMdp('Veuillez saisir le mot de passe.');
      return;
    }

    setEnvoi(true);
    try {
      const res = await api.post(`/public/shares/${token}/unlock`, { password: motDePasse });
      const url = res.data.download_url;
      await lancerTelechargement(url.startsWith('http') ? url : `${origineApi}${url}`, infos.document_name);
      setEtat('termine');
    } catch (err) {
      const code = err?.response?.status;
      if (code === 429) setMessageMdp('Trop de tentatives. Patientez une minute avant de réessayer.');
      else if (code === 410) {
        setErreur(ERREURS[410]);
        setEtat('erreur');
      } else setMessageMdp(err?.response?.data?.message || 'Mot de passe incorrect.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4 py-10">
      {/* Marque */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-brand-900 shadow-lg">
          <FileStack size={24} strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="text-lg font-bold tracking-wide text-white">DELOTRANS</div>
          <div className="text-xs text-brand-200">Partage sécurisé de documents</div>
        </div>
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        {etat === 'chargement' && (
          <div className="flex flex-col items-center gap-3 py-8 text-sm text-slate-500">
            <Loader2 size={28} className="animate-spin text-brand-500" />
            Vérification du lien…
          </div>
        )}

        {etat === 'erreur' && (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <AlertTriangle size={28} />
            </div>
            <h1 className="mt-4 text-xl font-bold text-slate-800">{erreur?.titre}</h1>
            <p className="mt-2 text-sm text-slate-500">{erreur?.texte}</p>
          </div>
        )}

        {(etat === 'pret' || etat === 'termine') && infos && (
          <>
            <p className="text-center text-sm text-slate-500">Un document a été partagé avec vous</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <FileText size={24} />
              </span>
              <span className="min-w-0 break-words font-semibold text-slate-800">{infos.document_name}</span>
            </div>

            {etat === 'termine' ? (
              <div className="mt-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={26} />
                </div>
                <p className="mt-3 font-medium text-slate-800">Téléchargement lancé</p>
                <p className="mt-1 text-sm text-slate-500">
                  Vérifiez vos téléchargements. Rien ne s'est passé ?{' '}
                  <button onClick={() => setEtat('pret')} className="font-medium text-brand-600 hover:underline">
                    Réessayer
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={telecharger} className="mt-6 space-y-4">
                {infos.requires_password && (
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Lock size={14} /> Ce document est protégé par un mot de passe
                    </label>
                    <div className="relative">
                      <input
                        autoFocus
                        type={voir ? 'text' : 'password'}
                        value={motDePasse}
                        onChange={(e) => setMotDePasse(e.target.value)}
                        placeholder="Mot de passe"
                        className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 ${
                          messageMdp
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                            : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setVoir(!voir)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                        title={voir ? 'Masquer' : 'Afficher'}
                      >
                        {voir ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {messageMdp && <p className="mt-1 text-xs text-red-600">{messageMdp}</p>}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={envoi}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
                >
                  {envoi ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  Télécharger le document
                </button>
              </form>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-brand-200">Lien sécurisé · DELOTRANS GED</p>
    </div>
  );
}