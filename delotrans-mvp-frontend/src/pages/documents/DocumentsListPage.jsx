import { useEffect, useState } from 'react';
import { documentsApi } from '../../api/documentsApi';

export default function DocumentsListPage() {
  const [documents, setDocuments] = useState([]);
  const [folderId, setFolderId] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    documentsApi.list({ folder_id: folderId || undefined }).then(({ data }) => setDocuments(data.data));
  };

  useEffect(() => {
    load();
  }, [folderId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !folderId) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder_id', folderId);
    setUploading(true);
    try {
      await documentsApi.upload(formData);
      setFile(null);
      load();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Documents</h1>

      <form onSubmit={handleUpload} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', alignItems: 'center' }}>
        <input
          type="number"
          placeholder="ID du dossier"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={{ width: 140 }}
        />
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button type="submit" disabled={uploading || !file || !folderId}>
          {uploading ? 'Envoi...' : 'Déposer'}
        </button>
      </form>

      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666' }}>
            <th>Nom</th>
            <th>Taille</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '6px 0' }}>{doc.name}</td>
              <td>{Math.round(doc.file_size / 1024)} Ko</td>
              <td>{doc.status}</td>
              <td>
                <a href={documentsApi.downloadUrl(doc.id)} target="_blank" rel="noreferrer">
                  Télécharger
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
