import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isDemoMode } from '../services/demoMode';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import EnviosPage from '../pages/EnviosPage';
import EnvioFormPage from '../pages/EnvioFormPage';
import SeguimientoPage from '../pages/SeguimientoPage';
import IncidenciasPage from '../pages/IncidenciasPage';
import ReportesPage from '../pages/ReportesPage';
import ObservacionPage from '../pages/ObservacionPage';
import DataMartPage from '../pages/DataMartPage';
import ClientesPage from '../pages/ClientesPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
      </div>
    );
  }
  if (isDemoMode || user) return children;
  return <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/login"
      element={isDemoMode ? <Navigate to="/dashboard" replace /> : <LoginPage />}
    />
    <Route
      path="/"
      element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="envios" element={<EnviosPage />} />
      <Route path="envios/nuevo" element={<EnvioFormPage />} />
      <Route path="envios/:id/editar" element={<EnvioFormPage />} />
      <Route path="clientes" element={<ClientesPage />} />
      <Route path="seguimiento" element={<SeguimientoPage />} />
      <Route path="seguimiento/:id" element={<SeguimientoPage />} />
      <Route path="incidencias" element={<IncidenciasPage />} />
      <Route path="reportes" element={<ReportesPage />} />
      <Route path="observacion" element={<ObservacionPage />} />
      <Route path="datamart" element={<AdminRoute><DataMartPage /></AdminRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default AppRoutes;
