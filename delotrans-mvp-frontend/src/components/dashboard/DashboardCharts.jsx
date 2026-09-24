import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp, PieChart as IconePie, Users, Activity, Loader2 } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const BLEU = '#2563a8';
const PALETTE = ['#2563a8', '#059669', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#ea580c', '#65a30d'];

function Carte({ titre, icone: Icone, children, vide, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
        <Icone size={18} className="text-brand-600" /> {titre}
      </h2>
      {vide ? <p className="flex h-56 items-center justify-center text-sm text-slate-400">Pas encore de données.</p> : children}
    </div>
  );
}

const infobulle = {
  contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  labelStyle: { fontWeight: 600, color: '#1e293b' },
};

export default function DashboardCharts() {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    axiosClient
      .get('/dashboard/charts')
      .then((r) => setDonnees(r.data.data))
      .catch(() => setErreur(true));
  }, []);

  if (erreur) return null; // le reste du tableau de bord reste utilisable

  if (!donnees) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
        <Loader2 size={18} className="animate-spin" /> Chargement des graphiques…
      </div>
    );
  }

  const { documents_par_mois: parMois, par_categorie: parCategorie, top_clients: topClients, activite_7_jours: activite } = donnees;
  const totalCategories = parCategorie.reduce((t, c) => t + c.valeur, 0);
  const couleurCategorie = (c, i) => (/^#[0-9a-f]{6}$/i.test(c.couleur || '') ? c.couleur : PALETTE[i % PALETTE.length]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* 1. Dépôts sur 12 mois */}
      <Carte titre="Dépôts de documents (12 mois)" icone={TrendingUp} vide={parMois.every((m) => m.documents === 0)}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={parMois} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="degradeDepots" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLEU} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={BLEU} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} formatter={(v) => [v, 'Documents']} />
              <Area type="monotone" dataKey="documents" stroke={BLEU} strokeWidth={2.5} fill="url(#degradeDepots)" dot={{ r: 3, fill: BLEU }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Carte>

      {/* 2. Répartition par catégorie */}
      <Carte titre="Répartition par catégorie" icone={IconePie} vide={totalCategories === 0}>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={parCategorie} dataKey="valeur" nameKey="nom" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
                  {parCategorie.map((c, i) => (
                    <Cell key={c.nom} fill={couleurCategorie(c, i)} />
                  ))}
                </Pie>
                <Tooltip {...infobulle} formatter={(v, n) => [`${v} document${v > 1 ? 's' : ''}`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-800">{totalCategories}</span>
              <span className="text-xs text-slate-500">documents</span>
            </div>
          </div>
          <ul className="w-full space-y-2">
            {parCategorie.map((c, i) => (
              <li key={c.nom} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: couleurCategorie(c, i) }} />
                  <span className="truncate text-slate-700">{c.nom}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-slate-500">
                  {c.valeur} · {Math.round((c.valeur / totalCategories) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Carte>

      {/* 3. Top clients */}
      <Carte titre="Clients ayant le plus de documents" icone={Users} vide={topClients.length === 0}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topClients} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nom" width={110} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} cursor={{ fill: '#f8fafc' }} formatter={(v) => [v, 'Documents']} />
              <Bar dataKey="documents" fill="#059669" radius={[0, 6, 6, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Carte>

      {/* 4. Activité des 7 derniers jours */}
      <Carte
        titre="Activité des 7 derniers jours"
        icone={Activity}
        vide={activite.every((j) => j.connexions + j.consultations + j.modifications === 0)}
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activite} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip {...infobulle} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="connexions" name="Connexions" stackId="a" fill="#059669" />
              <Bar dataKey="consultations" name="Consultations et téléchargements" stackId="a" fill={BLEU} />
              <Bar dataKey="modifications" name="Modifications" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Carte>
    </div>
  );
}