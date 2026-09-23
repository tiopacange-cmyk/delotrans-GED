import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    dashboardApi.stats().then(({ data }) => setStats(data.data));
    dashboardApi.recentDocuments().then(({ data }) => setRecent(data.data));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Tableau de bord</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '2rem' }}>
        {stats && [
          ['Documents', stats.documents],
          ['Clients', stats.clients],
          ['Dossiers', stats.folders],
          ['Utilisateurs', stats.users],
        ].map(([label, value]) => (
          <div key={label} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 15, marginBottom: '0.75rem' }}>Documents récents</h2>
      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666' }}>
            <th>Nom</th>
            <th>Client</th>
            <th>Catégorie</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((doc) => (
            <tr key={doc.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '6px 0' }}>{doc.name}</td>
              <td>{doc.client?.name ?? '—'}</td>
              <td>{doc.category?.name ?? '—'}</td>
              <td>{doc.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
