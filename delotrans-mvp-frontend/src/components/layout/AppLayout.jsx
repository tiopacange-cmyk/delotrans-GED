import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/authApi';

export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 200, borderRight: '1px solid #ddd', padding: '1rem' }}>
        <h2 style={{ fontSize: 16, marginBottom: '1.5rem' }}>DELOTRANS</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li><Link to="/">Tableau de bord</Link></li>
          <li><Link to="/documents">Documents</Link></li>
          <li><Link to="/folders">Dossiers</Link></li>
          <li><Link to="/clients">Clients</Link></li>
          <li><Link to="/categories">Catégories</Link></li>
          <li><Link to="/search">Recherche</Link></li>
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <span>{user?.name}</span>
          <button onClick={handleLogout}>Déconnexion</button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
