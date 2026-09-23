import NasPage from '../pages/admin/NasPage';
import BackupsPage from '../pages/admin/BackupsPage';
import LogsPage from '../pages/admin/LogsPage';
import SharePage from '../pages/public/SharePage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';

import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import DocumentsListPage from '../pages/documents/DocumentsListPage';
import FoldersPage from '../pages/folders/FoldersPage';
import ClientsListPage from '../pages/clients/ClientsListPage';
import CategoriesPage from '../pages/categories/CategoriesPage';
import SearchPage from '../pages/search/SearchPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/partage/:token" element={<SharePage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsListPage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/admin/nas" element={<NasPage />} />
            <Route path="/admin/sauvegardes" element={<BackupsPage />} />
            <Route path="/admin/journal" element={<LogsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
