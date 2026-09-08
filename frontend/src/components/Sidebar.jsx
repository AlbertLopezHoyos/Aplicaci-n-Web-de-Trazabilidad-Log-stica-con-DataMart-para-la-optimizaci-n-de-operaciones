import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  MapPin,
  AlertTriangle,
  FileBarChart,
  Database,
  Truck,
  X,
  ClipboardList,
  Users,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/envios', icon: Package, label: 'Envíos' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/seguimiento', icon: MapPin, label: 'Seguimiento' },
  { to: '/incidencias', icon: AlertTriangle, label: 'Incidencias' },
  { to: '/reportes', icon: FileBarChart, label: 'Reportes' },
  { to: '/observacion', icon: ClipboardList, label: 'Fichas observación' },
  { to: '/medicion', icon: FlaskConical, label: 'Medición investigación', adminOnly: true },
  { to: '/datamart', icon: Database, label: 'DataMart', adminOnly: true },
];

const Sidebar = ({ open, onClose }) => {
  const { isAdmin } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-salazar-900 text-white shadow-nav transition-transform duration-300 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
            <Truck className="h-6 w-6 text-accent-orange" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Salazar Logística</p>
            <p className="text-[10px] text-salazar-200">Trazabilidad 2026</p>
          </div>
        </div>
        <button type="button" className="lg:hidden" onClick={onClose} aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-salazar-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs text-salazar-200">
        <p>Grupo Logístico Salazar S.A.C.</p>
        <p>Lima, Perú · Tesis 2026</p>
      </div>
    </aside>
  );
};

export default Sidebar;
