import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePresentacion } from '../context/PresentacionContext';
import { useNavigate, Link } from 'react-router-dom';
import { confirmAction } from '../utils/alerts';
import api from '../services/api';
import UserAccountMenu from './UserAccountMenu';
import BrandLogo from './BrandLogo';

const Navbar = ({ onMenuClick }) => {
  const { logout } = useAuth();
  const { presentacionActiva, togglePresentacion, puedeActivar } = usePresentacion();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const [incAb, incRev, estRes] = await Promise.all([
          api.get('/incidencias', { params: { estado: 'abierta', limit: 4 } }),
          api.get('/incidencias', { params: { estado: 'en_revision', limit: 2 } }),
          api.get('/catalogos/estados'),
        ]);
        const items = [];
        (incAb.data.data?.data || []).forEach((inc) => {
          items.push({
            id: `inc-${inc.id_incidencia}`,
            title: 'Incidencia abierta',
            message: `${inc.codigo_incidencia || 'INC'} — ${inc.titulo}`,
            link: '/incidencias',
            time: 'Reciente',
            unread: true,
          });
        });
        (incRev.data.data?.data || []).forEach((inc) => {
          items.push({
            id: `inc-rev-${inc.id_incidencia}`,
            title: 'En revisión',
            message: `${inc.codigo_incidencia || 'INC'} — ${inc.tipo}`,
            link: '/incidencias',
            time: 'Pendiente',
            unread: true,
          });
        });
        const retrasado = (estRes.data.data || []).find((e) => e.codigo === 'retrasado');
        if (retrasado) {
          const { data: envRes } = await api.get('/envios', {
            params: { estado: retrasado.id_estado, limit: 3 },
          });
          (envRes.data?.data?.data || []).forEach((e) => {
            items.push({
              id: `env-${e.id_envio}`,
              title: 'Envío retrasado',
              message: `${e.codigo_envio} — ${e.destino}`,
              link: `/seguimiento/${e.id_envio}`,
              time: 'Operativo',
              unread: true,
            });
          });
        }
        setNotifications(items.length ? items.slice(0, 8) : []);
      } catch {
        setNotifications([]);
      }
    };
    loadAlerts();
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

      <div className="flex flex-1 items-center justify-between lg:justify-end">
        <BrandLogo variant="full" className="h-7 w-auto lg:hidden" />
        <div className="hidden flex-1 lg:block">
        <h1 className="text-lg font-semibold text-salazar-900">
          Sistema de Trazabilidad Logística
        </h1>
        <p className="text-xs text-slate-500">Optimización operativa · Lima</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {puedeActivar && (
          <button
            type="button"
            onClick={togglePresentacion}
            className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition sm:flex ${
              presentacionActiva
                ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            title="Ocultar datos personales de clientes"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {presentacionActiva ? 'Datos protegidos' : 'Proteger datos'}
          </button>
        )}
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
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-salazar-700 px-1 text-[10px] font-bold text-white">
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
                {notifications.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-slate-500">Sin alertas operativas</li>
                )}
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
                        {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-salazar-600" />}
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
                Incidencias y envíos retrasados
              </p>
            </div>
          )}
        </div>

        <UserAccountMenu />

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
