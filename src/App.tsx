import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useDB } from './data/store';

import Home from './pages/Home';
import ServicesPage from './pages/ServicesPage';
import ProductsPage from './pages/ProductsPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import BookingPage from './pages/BookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ContactPage from './pages/ContactPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Agenda from './pages/admin/Agenda';
import AdminServices from './pages/admin/AdminServices';
import AdminProducts from './pages/admin/AdminProducts';
import AdminProfessionals from './pages/admin/AdminProfessionals';
import AdminClients from './pages/admin/AdminClients';
import AdminBanners from './pages/admin/AdminBanners';
import AdminSettings from './pages/admin/AdminSettings';

function Protected({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useDB();
  if (!isAdmin) return <Navigate to="/adm" replace />;
  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="empty">
      <div className="empty-icon">💈</div>
      <h2>Página não encontrada</h2>
      <p className="muted mt-8">O link que você abriu não existe neste SaaS.</p>
      <a className="btn btn-portal mt-16" href="/">Voltar para o início</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/servicos" element={<ServicesPage />} />
        <Route path="/produtos" element={<ProductsPage />} />
        <Route path="/profissionais" element={<ProfessionalsPage />} />
        <Route path="/agendar" element={<BookingPage />} />
        <Route path="/meus-agendamentos" element={<MyBookingsPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/adm" element={<AdminLogin />} />

        <Route
          path="/adm"
          element={
            <Protected>
              <AdminLayout />
            </Protected>
          }
        >
          <Route path="painel" element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="servicos" element={<AdminServices />} />
          <Route path="produtos" element={<AdminProducts />} />
          <Route path="profissionais" element={<AdminProfessionals />} />
          <Route path="clientes" element={<AdminClients />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="config" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
