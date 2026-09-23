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

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsListPage />} />
            <Route path="/folders" element={<FoldersPage />} />
            <Route path="/clients" element={<ClientsListPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
