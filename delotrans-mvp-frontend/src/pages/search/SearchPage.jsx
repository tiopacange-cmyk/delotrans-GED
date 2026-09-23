import { useState } from 'react';
import { searchApi } from '../../api';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    const { data } = await searchApi.documents({ q });
    setResults(data.data);
    setSearched(true);
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Recherche avancée</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <input
          placeholder="Nom du document..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit">Rechercher</button>
      </form>

      {searched && results.length === 0 && <p style={{ fontSize: 13, color: '#666' }}>Aucun résultat.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results.map((doc) => (
          <li key={doc.id} style={{ padding: '8px 0', borderTop: '1px solid #eee', fontSize: 13 }}>
            {doc.name} — {doc.client?.name ?? 'Sans client'} — {doc.category?.name ?? 'Sans catégorie'}
          </li>
        ))}
      </ul>
    </div>
  );
}
