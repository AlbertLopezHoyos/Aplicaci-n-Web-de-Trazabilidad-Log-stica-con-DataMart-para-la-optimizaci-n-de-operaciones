import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  AlertTriangle,
  FileBarChart,
  Database,
  X,
  Users,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/envios', icon: Package, label: 'Envíos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/seguimiento', icon: MapPin, label: 'Seguimiento' },
  { to: '/incidencias', icon: AlertTriangle, label: 'Incidencias' },
  { to: '/reportes', icon: FileBarChart, label: 'Reportes' },
  { to: '/datamart', icon: Database, label: 'Análisis', adminOnly: true },
  {
    to: '/investigacion',
    icon: FlaskConical,
    label: 'Investigación',
    adminOnly: true,
    section: 'tesis',
    matchPaths: ['/investigacion', '/observacion', '/medicion'],
  },
];

const Sidebar = ({ open, onClose }) => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-graphite-900 text-white shadow-nav transition-transform duration-300 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white p-1.5">
            <BrandLogo className="h-full w-auto" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Grupo Logístico</p>
            <p className="text-sm font-bold leading-tight text-salazar-300">Salazar S.A.C.</p>
          </div>
        </div>
        <button type="button" className="lg:hidden" onClick={onClose} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ to, icon: Icon, label, section, matchPaths }) => {
            const activo =
              location.pathname === to
              || matchPaths?.some((p) => location.pathname.startsWith(p));
            return (
            <div key={to}>
              {section === 'tesis' && (
                <p className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-graphite-400">
                  Tesis
                </p>
              )}
              <NavLink
                to={to}
                onClick={onClose}
                className={() =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    activo
                      ? 'bg-salazar-700 text-white shadow-sm'
                      : 'text-graphite-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            </div>
            );
          })}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs text-graphite-300">
        <p>Experiencia y calidad a su disposición</p>
        <p className="mt-0.5">Jr. San Diego 615, Surquillo · Lima</p>
      </div>
    </aside>
  );
};

export default Sidebar;
