import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tags, X, Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import axiosClient from '../../api/axiosClient';

const PALETTE = ['#2563a8', '#0891b2', '#059669', '#65a30d', '#f59e0b', '#ea580c', '#dc2626', '#7c3aed'];
const VIDE = { name: '', description: '', color: PALETTE[0] };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [formulaire, setFormulaire] = useState(null); // { id?, valeurs }
  const [erreursChamps, setErreursChamps] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [notification, setNotification] = useState(null);

  const notifier = (type, texte) => {
    setNotification({ type, texte });
    setTimeout(() => setNotification(null), 4000);
  };

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await axiosClient.get('/categories');
      const d = res.data;
      setCategories(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
    } catch (err) {
      notifier('erreur', err?.response?.data?.message || 'Impossible de charger les catégories.');
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const ouvrir = (cat) => {
    setErreursChamps({});
    setFormulaire(
      cat
        ? { id: cat.id, valeurs: { name: cat.name ?? '', description: cat.description ?? '', color: cat.color || PALETTE[0] } }
        : { valeurs: { ...VIDE } }
    );
  };

  const changer = (champ, valeur) =>
    setFormulaire((f) => ({ ...f, valeurs: { ...f.valeurs, [champ]: valeur } }));

  const enregistrer = async () => {
    setEnvoi(true);
    setErreursChamps({});
    const v = formulaire.valeurs;
    const donnees = {
      name: v.name.trim(),
      description: v.description.trim() || null,
      color: v.color || null,
    };
    try {
      if (formulaire.id) {
        await axiosClient.put(`/categories/${formulaire.id}`, donnees);
        notifier('succes', 'Catégorie modifiée.');
      } else {
        await axiosClient.post('/categories', donnees);
        notifier('succes', 'Catégorie créée.');
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

  const supprimer = async (cat) => {
    if (!window.confirm(`Supprimer la catégorie « ${cat.name} » ?`)) return;
    try {
      await axiosClient.delete(`/categories/${cat.id}`);
      notifier('succes', 'Catégorie supprimée.');
      charger();
    } catch (err) {
      notifier('erreur', err?.response?.data?.message || 'Suppression impossible.');
    }
  };

  const couleurValide = (c) => /^#[0-9A-Fa-f]{6}$/.test(c || '');

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catégories</h1>
          <p className="mt-1 text-sm text-slate-500">Classez vos documents par type (factures, contrats, devis…).</p>
        </div>
        <button
          onClick={() => ouvrir(null)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={18} /> Nouvelle catégorie
        </button>
      </div>

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
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Tags size={36} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">Aucune catégorie pour l'instant.</p>
          <button onClick={() => ouvrir(null)} className="mt-3 text-sm font-medium text-brand-600 hover:underline">
            Créer la première catégorie
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const couleur = couleurValide(cat.color) ? cat.color : '#94a3b8';
            const nb = cat.documents_count;
            return (
              <div
                key={cat.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pl-6 shadow-sm transition hover:shadow"
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: couleur }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${couleur}1a`, color: couleur }}
                    >
                      <Tags size={20} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold text-slate-800">{cat.name}</h3>
                      {nb != null && (
                        <p className="text-xs text-slate-500">
                          {nb} document{nb > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => ouvrir(cat)}
                      title="Modifier"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => supprimer(cat)}
                      title="Supprimer"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {cat.description || <span className="italic text-slate-400">Pas de description</span>}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulaire */}
      {formulaire && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => !envoi && setFormulaire(null)} />
          <div className="relative w-full rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {formulaire.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button onClick={() => setFormulaire(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={formulaire.valeurs.name}
                  onChange={(e) => changer('name', e.target.value)}
                  placeholder="Ex. : Factures"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                {erreursChamps.name && <p className="mt-1 text-xs text-red-600">{erreursChamps.name}</p>}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formulaire.valeurs.description}
                  onChange={(e) => changer('description', e.target.value)}
                  placeholder="À quoi sert cette catégorie ?"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                {erreursChamps.description && (
                  <p className="mt-1 text-xs text-red-600">{erreursChamps.description}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Couleur</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => changer('color', c)}
                      className="flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition hover:scale-110"
                      style={{
                        backgroundColor: c,
                        boxShadow: formulaire.valeurs.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      }}
                      title={c}
                    >
                      {formulaire.valeurs.color === c && <Check size={16} className="text-white" />}
                    </button>
                  ))}
                  <label
                    className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400"
                    title="Couleur personnalisée"
                  >
                    <Plus size={14} />
                    <input
                      type="color"
                      value={couleurValide(formulaire.valeurs.color) ? formulaire.valeurs.color : '#2563a8'}
                      onChange={(e) => changer('color', e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
                {erreursChamps.color && <p className="mt-1 text-xs text-red-600">{erreursChamps.color}</p>}

                {/* Aperçu */}
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Aperçu :
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${formulaire.valeurs.color}1a`,
                      color: formulaire.valeurs.color,
                    }}
                  >
                    {formulaire.valeurs.name || 'Nom de la catégorie'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
                {formulaire.id ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}