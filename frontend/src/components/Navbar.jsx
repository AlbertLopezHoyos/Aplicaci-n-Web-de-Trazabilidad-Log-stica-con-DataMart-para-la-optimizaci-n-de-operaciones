import { Menu, Bell, LogOut, User, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { confirmAction } from '../utils/alerts';

const Navbar = ({ onMenuClick }) => {
  const { user, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await confirmAction('¿Cerrar sesión?', 'Saldrá del sistema de trazabilidad');
    if (ok) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-salazar-800 hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="hidden flex-1 lg:block">
        <h1 className="text-lg font-semibold text-salazar-900">
          Sistema de Trazabilidad Logística
        </h1>
        <p className="text-xs text-slate-500">Optimización operativa · Lima 2026</p>
        {isDemoMode && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
            <FlaskConical className="h-3.5 w-3.5" />
            Modo demo — sin base de datos (datos simulados)
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-orange" />
        </button>

        <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-salazar-100 text-salazar-800">
            <User className="h-4 w-4" />
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">
              {user?.nombres} {user?.apellidos}
            </p>
            <p className="text-xs text-slate-500">{user?.rol?.nombre}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
