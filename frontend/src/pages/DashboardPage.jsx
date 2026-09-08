import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Timer,
  RefreshCw,
  ArrowRight,
  Truck,
  FileBarChart,
} from 'lucide-react';
import api from '../services/api';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import StatChip from '../components/StatChip';
import {
  EnviosPorEstadoChart,
  TendenciaMensualChart,
  IncidenciasChart,
} from '../dashboards/ChartsDashboard';
import { Link } from 'react-router-dom';

const QUICK_LINKS = [
  { to: '/envios/nuevo', label: 'Registrar envío', icon: Package, desc: 'Nuevo registro operativo' },
  { to: '/seguimiento', label: 'Seguimiento', icon: Truck, desc: 'Estados y evidencias' },
  { to: '/incidencias', label: 'Incidencias', icon: AlertTriangle, desc: 'Gestión PIOIC' },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart, desc: 'PDF y Excel' },
];

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/dashboard')
      .then((res) => {
        setData(res.data.data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};

  const derived = useMemo(() => {
    const total = Number(kpis.totalEnvios) || 0;
    const entregados = Number(kpis.enviosEntregados) || 0;
    const pendientes = Number(kpis.enviosPendientes) || 0;
    const tasaEntrega = total ? Math.round((entregados / total) * 100) : 0;
    const tasaPendiente = total ? Math.round((pendientes / total) * 100) : 0;
    return { total, entregados, pendientes, tasaEntrega, tasaPendiente };
  }, [kpis]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <PageHeader title="Dashboard operativo" subtitle="Indicadores clave de desempeño logístico" compact />
        <div className="card py-10 text-center text-slate-600">
          <p className="font-medium text-salazar-900">No se pudo cargar el dashboard</p>
          <p className="mt-2 text-sm">Verifique que el backend esté activo.</p>
          <button type="button" className="btn-primary mt-4" onClick={load}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Dashboard operativo"
        subtitle="Indicadores clave de desempeño logístico en tiempo real"
        compact
        action={
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title="Total envíos"
          value={kpis.totalEnvios}
          icon={Package}
          to="/envios"
          hint={derived.total ? `${derived.total} activos en sistema` : undefined}
        />
        <KpiCard
          title="Entregados"
          value={kpis.enviosEntregados}
          icon={CheckCircle}
          color="green"
          to="/envios"
          hint={derived.tasaEntrega ? `${derived.tasaEntrega}% del total` : undefined}
          trend="up"
        />
        <KpiCard
          title="Pendientes"
          value={kpis.enviosPendientes}
          icon={Clock}
          color="amber"
          to="/envios"
          hint={derived.tasaPendiente ? `${derived.tasaPendiente}% en tránsito` : undefined}
        />
        <KpiCard
          title="Incidencias abiertas"
          value={kpis.incidenciasAbiertas}
          icon={AlertTriangle}
          color="red"
          to="/incidencias"
          hint={kpis.incidenciasAbiertas ? 'Requieren atención' : 'Sin alertas activas'}
          trend={kpis.incidenciasAbiertas ? 'down' : undefined}
        />
        <KpiCard
          title="Días promedio entrega"
          value={kpis.diasPromedioEntrega ?? '—'}
          icon={Timer}
          subtitle="Lead time operativo"
          color="blue"
          hint="Tiempo registro → entrega"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatChip label="Tasa de entrega" value={`${derived.tasaEntrega}%`} accent="green" />
        <StatChip label="En tránsito / pendientes" value={derived.pendientes} accent="amber" />
        <StatChip label="Incidencias abiertas" value={kpis.incidenciasAbiertas ?? 0} accent="red" />
        <StatChip
          label="Estados registrados"
          value={(data?.porEstado || []).filter((e) => Number(e.cantidad) > 0).length}
          accent="salazar"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="card-panel lg:col-span-5">
          <h3 className="panel-title">Envíos por estado</h3>
          <div className="min-h-0 flex-1">
            <EnviosPorEstadoChart data={data?.porEstado || []} />
          </div>
        </div>
        <div className="card-panel lg:col-span-7">
          <h3 className="panel-title">Tendencia mensual</h3>
          <div className="min-h-0 flex-1">
            <TendenciaMensualChart data={data?.tendencia || []} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="card-panel lg:col-span-8">
          <h3 className="panel-title">Incidencias por tipo</h3>
          <div className="min-h-0 flex-1">
            <IncidenciasChart
              data={(data?.incidencias || []).map((i) => ({
                tipo: i.tipo,
                cantidad: Number(i.cantidad),
              }))}
            />
          </div>
        </div>
        <div className="card-panel lg:col-span-4">
          <h3 className="panel-title">Accesos rápidos</h3>
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3 transition hover:border-salazar-300 hover:bg-salazar-50"
              >
                <div className="rounded-lg bg-white p-2 text-salazar-700 shadow-sm ring-1 ring-slate-100 group-hover:text-salazar-800">
                  <link.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-salazar-900">{link.label}</p>
                  <p className="truncate text-[11px] text-slate-500">{link.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-salazar-600" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
