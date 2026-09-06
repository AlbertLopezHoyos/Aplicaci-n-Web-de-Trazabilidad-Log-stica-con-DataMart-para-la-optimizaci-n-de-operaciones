import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, User, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { confirmAction } from '../utils/alerts';

const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Incidencia abierta',
    message: 'INC-2026-00001 — Retraso por obras viales',
    link: '/incidencias',
    time: 'Hace 2 h',
    unread: true,
  },
  {
    id: 2,
    title: 'Envío con retraso',
    message: 'GLS-2026-00003 — Lima Ate → Piura',
    link: '/seguimiento/3',
    time: 'Hace 5 h',
    unread: true,
  },
  {
    id: 3,
    title: 'Reporte disponible',
    message: 'Reporte de envíos por estado (PDF)',
    link: '/reportes',
    time: 'Ayer',
    unread: false,
  },
];

const Navbar = ({ onMenuClick }) => {
  const { user, logout, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const ok = await confirmAction('¿Cerrar sesión?', 'Saldrá del sistema de trazabilidad');
    if (ok) {
      await logout();
      navigate('/login');
    }
  };

  const handleNotifClick = (id) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    setNotifOpen(false);
  };

  const markAllRead = () => {
    setNotifications((list) => list.map((n) => ({ ...n, unread: false })));
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
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notificaciones"
            aria-expanded={notifOpen}
            onClick={() => setNotifOpen((o) => !o)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-orange px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-800">Notificaciones</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-salazar-600 hover:underline"
                    onClick={markAllRead}
                  >
                    Marcar todas leídas
                  </button>
                )}
              </div>
              <ul className="max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={n.link}
                      onClick={() => handleNotifClick(n.id)}
                      className={`block border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 ${
                        n.unread ? 'bg-salazar-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-orange" />}
                        <div className={n.unread ? '' : 'pl-4'}>
                          <p className="text-sm font-medium text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.message}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{n.time}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-4 py-2 text-center text-[10px] text-slate-400">
                Alertas operativas simuladas
              </p>
            </div>
          )}
        </div>

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
