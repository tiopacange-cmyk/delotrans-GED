import NotificationBell from './NotificationBell';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderTree,
  Users,
  Tags,
  Search,
  LogOut,
  Menu,
  X,
  FileStack,
  HardDrive,
  DatabaseBackup,
  ScrollText,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/authApi';

const navigation = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/folders', label: 'Dossiers', icon: FolderTree },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/categories', label: 'Catégories', icon: Tags },
  { to: '/search', label: 'Recherche', icon: Search },
];

const administration = [
  { to: '/admin/nas', label: 'Stockage NAS', icon: HardDrive },
  { to: '/admin/sauvegardes', label: 'Sauvegardes', icon: DatabaseBackup },
  { to: '/admin/journal', label: 'Journal d\'activité', icon: ScrollText },
];

function initiales(nom) {
  if (!nom) return '?';
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0].toUpperCase())
    .join('');
}

export default function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      logout();
      navigate('/login');
    }
  };

  const menu = (
    <nav className="flex h-full flex-col bg-brand-900 text-brand-100">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 text-brand-900">
          <FileStack size={20} strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-wide text-white">DELOTRANS</div>
          <div className="text-xs text-brand-200">Gestion des documents</div>
        </div>
      </div>

      {/* Liens */}
      <ul className="space-y-1 px-3 py-4">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={() => setMenuOuvert(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--color-accent-500)]'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      <p className="px-6 pt-2 text-xs font-semibold uppercase tracking-wider text-brand-200/60">Administration</p>
      <ul className="space-y-1 px-3 py-2">
        {administration.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={() => setMenuOuvert(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--color-accent-500)]'
                    : 'text-brand-200 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="flex-1" />

      <div className="border-t border-white/10 px-5 py-4 text-xs text-brand-200">
        DELOTRANS GED
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Menu fixe sur ordinateur */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">{menu}</div>
      </aside>

      {/* Menu coulissant sur mobile */}
      {menuOuvert && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMenuOuvert(false)}
          />
          <div className="relative h-full w-64">
            {menu}
            <button
              onClick={() => setMenuOuvert(false)}
              className="absolute right-3 top-4 rounded-md p-1 text-brand-100 hover:bg-white/10"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button
            onClick={() => setMenuOuvert(true)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-slate-800">{user?.name}</div>
              <div className="text-xs text-slate-500">{user?.role?.name ?? 'Utilisateur'}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initiales(user?.name)}
            </div>
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="Déconnexion"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}