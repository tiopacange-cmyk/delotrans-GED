import { useEffect, useState } from 'react';
import { categoriesApi } from '../../api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');

  const load = () => categoriesApi.list().then(({ data }) => setCategories(data.data));

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await categoriesApi.create({ name });
    setName('');
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Catégories</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <input placeholder="Nom de la catégorie" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Ajouter</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {categories.map((cat) => (
          <li key={cat.id} style={{ padding: '8px 0', borderTop: '1px solid #eee' }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: cat.color || '#ccc',
                marginRight: 8,
              }}
            />
            {cat.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
