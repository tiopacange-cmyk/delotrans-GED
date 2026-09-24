import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileStack, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, HardDrive, Share2, History } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';

const ATOUTS = [
  { icone: HardDrive, texte: 'Documents stockés en sécurité sur vos NAS' },
  { icone: History, texte: 'Historique complet des versions' },
  { icone: Share2, texte: 'Partage sécurisé par lien et mot de passe' },
  { icone: ShieldCheck, texte: 'Droits d’accès et traçabilité de chaque action' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voir, setVoir] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      setSession(data.data.user, data.data.token);
      navigate('/');
    } catch (err) {
      const code = err.response?.status;
      if (code === 429) setError('Trop de tentatives. Patientez une minute avant de réessayer.');
      else if (!err.response) setError('Serveur injoignable. Vérifiez votre connexion.');
      else setError(err.response?.data?.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Panneau de marque (ordinateur) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-500/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-brand-900 shadow-lg">
            <FileStack size={24} strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-wide">DELOTRANS</div>
            <div className="text-xs text-brand-200">Gestion électronique des documents</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl font-bold leading-tight">
            Tous vos documents, <span className="text-accent-500">organisés et sécurisés.</span>
          </h1>
          <ul className="mt-10 space-y-4">
            {ATOUTS.map(({ icone: Icone, texte }) => (
              <li key={texte} className="flex items-center gap-3 text-brand-100">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icone size={18} />
                </span>
                {texte}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} DELOTRANS · Accès réservé au personnel autorisé</p>
      </div>

      {/* Formulaire */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Logo (mobile) */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500 text-brand-900">
              <FileStack size={24} strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-wide text-brand-900">DELOTRANS</div>
              <div className="text-xs text-slate-500">Gestion des documents</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Connexion</h2>
          <p className="mt-1 text-sm text-slate-500">Entrez vos identifiants pour accéder à votre espace.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Adresse e-mail</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="vous@delotrans.cm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mot de passe</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={voir ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setVoir(!voir)}
                  title={voir ? 'Masquer' : 'Afficher'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  {voir ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Mot de passe oublié ? Contactez votre administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}