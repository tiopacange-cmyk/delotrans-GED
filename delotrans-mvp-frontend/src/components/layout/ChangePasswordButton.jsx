import { useState } from 'react';
import { KeyRound, X, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const VIDE = { current_password: '', password: '', password_confirmation: '' };

export default function ChangePasswordButton() {
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState(VIDE);
  const [voir, setVoir] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [message, setMessage] = useState(null);

  const fermer = () => {
    if (envoi) return;
    setOuvert(false);
    setValeurs(VIDE);
    setErreurs({});
    setMessage(null);
  };

  const changer = (champ, v) => setValeurs((x) => ({ ...x, [champ]: v }));

  const force = (() => {
    const p = valeurs.password;
    let n = 0;
    if (p.length >= 8) n++;
    if (p.length >= 12) n++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
    if (/\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;
    return n;
  })();
  const niveaux = [
    { label: 'Trop court', couleur: 'bg-red-500' },
    { label: 'Faible', couleur: 'bg-red-500' },
    { label: 'Moyen', couleur: 'bg-amber-500' },
    { label: 'Bon', couleur: 'bg-amber-500' },
    { label: 'Fort', couleur: 'bg-emerald-500' },
    { label: 'Très fort', couleur: 'bg-emerald-500' },
  ];

  const valider = async (e) => {
    e.preventDefault();
    setErreurs({});
    setMessage(null);
    if (valeurs.password !== valeurs.password_confirmation) {
      setErreurs({ password_confirmation: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }
    setEnvoi(true);
    try {
      await axiosClient.put('/auth/password', valeurs);
      setMessage({ type: 'succes', texte: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.' });
      setValeurs(VIDE);
      setTimeout(fermer, 2500);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.errors) setErreurs(Object.fromEntries(Object.entries(data.errors).map(([k, v]) => [k, v[0]])));
      else setMessage({ type: 'erreur', texte: data?.message || 'Modification impossible.' });
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (erreur) =>
    `w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 ${
      erreur ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'
    }`;

  const Champ = ({ nom, libelle, auto }) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{libelle}</label>
      <div className="relative">
        <input
          type={voir ? 'text' : 'password'}
          autoComplete={auto}
          value={valeurs[nom]}
          onChange={(e) => changer(nom, e.target.value)}
          required
          className={champ(erreurs[nom])}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVoir(!voir)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
        >
          {voir ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {erreurs[nom] && <p className="mt-1 text-xs text-red-600">{erreurs[nom]}</p>}
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOuvert(true)}
        title="Changer mon mot de passe"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <KeyRound size={19} />
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={fermer} />
          <form onSubmit={valider} className="relative w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                <KeyRound size={18} /> Changer mon mot de passe
              </h2>
              <button type="button" onClick={fermer} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {message && (
                <div
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    message.type === 'succes' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {message.type === 'succes' ? <CheckCircle2 size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{message.texte}</span>
                </div>
              )}

              {Champ({ nom: 'current_password', libelle: 'Mot de passe actuel', auto: 'current-password' })}
              {Champ({ nom: 'password', libelle: 'Nouveau mot de passe', auto: 'new-password' })}

              {valeurs.password && (
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= force ? niveaux[force].couleur : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Solidité : {niveaux[force].label}
                    {valeurs.password.length < 8 && ' (8 caractères minimum)'}
                  </p>
                </div>
              )}

              {Champ({ nom: 'password_confirmation', libelle: 'Confirmer le nouveau mot de passe', auto: 'new-password' })}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={fermer}
                disabled={envoi}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={envoi || valeurs.password.length < 8}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {envoi && <Loader2 size={16} className="animate-spin" />} Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}