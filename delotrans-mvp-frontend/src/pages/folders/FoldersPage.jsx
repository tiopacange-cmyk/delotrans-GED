import { useEffect, useState } from 'react';
import { foldersApi } from '../../api/foldersApi';

export default function FoldersPage() {
  const [folders, setFolders] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [newFolderName, setNewFolderName] = useState('');

  const load = () => {
    foldersApi.list(currentId).then(({ data }) => setFolders(data.data));
    if (currentId) {
      foldersApi.breadcrumb(currentId).then(({ data }) => setBreadcrumb(data.data));
    } else {
      setBreadcrumb([]);
    }
  };

  useEffect(load, [currentId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await foldersApi.create({ name: newFolderName, parent_id: currentId });
    setNewFolderName('');
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Dossiers</h1>

      <div style={{ marginBottom: '1rem', fontSize: 13 }}>
        <span onClick={() => setCurrentId(null)} style={{ cursor: 'pointer', color: '#0366d6' }}>
          Racine
        </span>
        {breadcrumb.map((f) => (
          <span key={f.id}>
            {' / '}
            <span onClick={() => setCurrentId(f.id)} style={{ cursor: 'pointer', color: '#0366d6' }}>
              {f.name}
            </span>
          </span>
        ))}
      </div>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <input
          placeholder="Nom du nouveau dossier"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button type="submit">Créer</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {folders.map((folder) => (
          <li
            key={folder.id}
            onClick={() => setCurrentId(folder.id)}
            style={{ padding: '8px 0', borderTop: '1px solid #eee', cursor: 'pointer' }}
          >
            {folder.name} ({folder.documents_count} documents)
          </li>
        ))}
      </ul>
    </div>
  );
}
