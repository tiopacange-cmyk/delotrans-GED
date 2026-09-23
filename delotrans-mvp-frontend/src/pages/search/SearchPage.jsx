import { useEffect, useState } from 'react';
import {
  Search,
  RotateCcw,
  FileText,
  Eye,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { searchApi, categoriesApi, clientsApi } from '../../api';

const VIDE = { q: '', client_id: '', category_id: '', folder_id: '', date_from: '', date_to: '' };

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

const liste = (res) => res?.data?.data ?? [];

export default function SearchPage() {
  const [filtres, setFiltres] = useState(VIDE);
  const [resultats, setResultats] = useState(null); // null = pas encore cherché
  const [pagination, setPagination] = useState({ page: 1, derniere: 1, total: 0 });
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');

  const [dossiers, setDossiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    axiosClient.get('/folders', { params: { all: 1 } }).then((r) => setDossiers(liste(r))).catch(() => {});
    categoriesApi.list().then((r) => setCategories(liste(r))).catch(() => {});
    clientsApi.list().then((r) => setClients(liste(r))).catch(() => {});
  }, []);

  const changer = (champ, valeur) => setFiltres((f) => ({ ...f, [champ]: valeur }));

  const chercher = async (page = 1) => {
    setChargement(true);
    setErreur('');
    const params = Object.fromEntries(Object.entries(filtres).filter(([, v]) => v !== ''));
    params.page = page;
    try {
      const res = await searchApi.documents(params);
      setResultats(res.data.data ?? []);
      setPagination({
        page: res.data.current_page ?? 1,
        derniere: res.data.last_page ?? 1,
        total: res.data.total ?? 0,
      });
    } catch (err) {
      const data = err?.response?.data;
      setErreur(data?.errors ? Object.values(data.errors).flat().join(' ') : data?.message || 'La recherche a échoué.');
    } finally {
      setChargement(false);
    }
  };

  const reinitialiser = () => {
    setFiltres(VIDE);
    setResultats(null);
    setErreur('');
  };

  const apercu = async (doc) => {
    const fenetre = window.open('', '_blank');
    try {
      const res = await axiosClient.get(`/documents/${doc.id}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: doc.mime_type }));
      if (fenetre) fenetre.location.href = url;
    } catch {
      if (fenetre) fenetre.close();
      setErreur('Aperçu impossible pour ce document.');
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
    } catch {
      setErreur('Téléchargement impossible.');
    }
  };

  // Libellés des filtres actifs
  const nomDe = (tableau, id, cle = 'name') => tableau.find((x) => String(x.id) === String(id))?.[cle];
  const actifs = [
    filtres.q && `« ${filtres.q} »`,
    filtres.client_id && `Client : ${nomDe(clients, filtres.client_id) ?? filtres.client_id}`,
    filtres.category_id && `Catégorie : ${nomDe(categories, filtres.category_id) ?? filtres.category_id}`,
    filtres.folder_id && `Dossier : ${nomDe(dossiers, filtres.folder_id, 'label') ?? filtres.folder_id}`,
    filtres.date_from && `Depuis le ${new Date(filtres.date_from).toLocaleDateString('fr-FR')}`,
    filtres.date_to && `Jusqu'au ${new Date(filtres.date_to).toLocaleDateString('fr-FR')}`,
  ].filter(Boolean);

  const champ =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
  const libelle = 'mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Recherche avancée</h1>
        <p className="mt-1 text-sm text-slate-500">Combinez plusieurs critères pour retrouver un document.</p>
      </div>

      {/* Filtres */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          chercher(1);
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            type="text"
            value={filtres.q}
            onChange={(e) => changer('q', e.target.value)}
            placeholder="Nom du document…"
            className={`${champ} py-2.5 pl-10 text-base`}
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
          <SlidersHorizontal size={16} /> Filtres
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={libelle}>Client</label>
            <select value={filtres.client_id} onChange={(e) => changer('client_id', e.target.value)} className={champ}>
              <option value="">Tous</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={libelle}>Catégorie</label>
            <select value={filtres.category_id} onChange={(e) => changer('category_id', e.target.value)} className={champ}>
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={libelle}>Dossier</label>
            <select value={filtres.folder_id} onChange={(e) => changer('folder_id', e.target.value)} className={champ}>
              <option value="">Tous</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label ?? d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={libelle}>Ajouté depuis le</label>
            <input type="date" value={filtres.date_from} onChange={(e) => changer('date_from', e.target.value)} className={champ} />
          </div>
          <div>
            <label className={libelle}>Jusqu'au</label>
            <input type="date" value={filtres.date_to} onChange={(e) => changer('date_to', e.target.value)} className={champ} />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={chargement}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {chargement ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Rechercher
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              title="Effacer les filtres"
              className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </form>

      {erreur && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} /> <span>{erreur}</span>
        </div>
      )}

      {/* Résultats */}
      {resultats !== null && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">
              {pagination.total} résultat{pagination.total > 1 ? 's' : ''}
            </h2>
            {actifs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {actifs.map((a) => (
                  <span key={a} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {resultats.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Search size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Aucun document ne correspond à ces critères.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Nom</th>
                    <th className="hidden px-5 py-3 font-medium md:table-cell">Client</th>
                    <th className="hidden px-5 py-3 font-medium lg:table-cell">Catégorie</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">Taille</th>
                    <th className="hidden px-5 py-3 font-medium lg:table-cell">Ajouté le</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultats.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="max-w-xs px-5 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <FileText size={18} className="shrink-0 text-red-500" />
                          <span className="truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                        {doc.client?.name ?? nomDe(clients, doc.client_id) ?? '—'}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">
                        {doc.category?.name ?? nomDe(categories, doc.category_id) ?? '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 sm:table-cell">
                        {tailleLisible(doc.file_size)}
                      </td>
                      <td className="hidden whitespace-nowrap px-5 py-3 text-slate-500 lg:table-cell">
                        {dateLisible(doc.created_at)}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.derniere > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              <span>
                Page {pagination.page} sur {pagination.derniere}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1 || chargement}
                  onClick={() => chercher(pagination.page - 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Précédent
                </button>
                <button
                  disabled={pagination.page >= pagination.derniere || chargement}
                  onClick={() => chercher(pagination.page + 1)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}