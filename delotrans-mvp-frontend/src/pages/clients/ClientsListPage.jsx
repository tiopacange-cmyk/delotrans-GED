import { useEffect, useState } from 'react';
import { clientsApi } from '../../api';

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ code: '', name: '' });

  const load = () => clientsApi.list().then(({ data }) => setClients(data.data));

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await clientsApi.create(form);
    setForm({ code: '', name: '' });
    load();
  };

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: '1rem' }}>Clients</h1>

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        <input
          placeholder="Code"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          placeholder="Nom"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <button type="submit">Ajouter</button>
      </form>

      <table style={{ width: '100%', fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#666' }}>
            <th>Code</th>
            <th>Nom</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: '6px 0' }}>{client.code}</td>
              <td>{client.name}</td>
              <td>{client.is_active ? 'Actif' : 'Inactif'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
