import { useEffect, useState } from 'react';
import { Package, CheckCircle, Clock, AlertTriangle, Timer } from 'lucide-react';
import api from '../services/api';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import {
  EnviosPorEstadoChart,
  TendenciaMensualChart,
  IncidenciasChart,
} from '../dashboards/ChartsDashboard';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => {
        setData(res.data.data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard operativo" subtitle="Indicadores clave de desempeño logístico" />
        <div className="card py-12 text-center text-slate-600">
          <p className="font-medium text-salazar-900">No se pudo cargar el dashboard</p>
          <p className="mt-2 text-sm">Verifique que el backend esté activo e intente recargar la página.</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div>
      <PageHeader
        title="Dashboard operativo"
        subtitle="Indicadores clave de desempeño logístico en tiempo real"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total envíos" value={kpis.totalEnvios} icon={Package} />
        <KpiCard title="Entregados" value={kpis.enviosEntregados} icon={CheckCircle} color="green" />
        <KpiCard title="Pendientes" value={kpis.enviosPendientes} icon={Clock} color="amber" />
        <KpiCard title="Incidencias abiertas" value={kpis.incidenciasAbiertas} icon={AlertTriangle} color="red" />
        <KpiCard
          title="Días promedio entrega"
          value={kpis.diasPromedioEntrega ?? '—'}
          icon={Timer}
          subtitle="Lead time operativo"
          color="blue"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold text-salazar-900">Envíos por estado</h3>
          <EnviosPorEstadoChart data={data?.porEstado || []} />
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold text-salazar-900">Tendencia mensual</h3>
          <TendenciaMensualChart data={data?.tendencia || []} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-4 font-semibold text-salazar-900">Incidencias por tipo</h3>
          <IncidenciasChart
            data={(data?.incidencias || []).map((i) => ({
              tipo: i.tipo,
              cantidad: Number(i.cantidad),
            }))}
          />
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold text-salazar-900">Accesos rápidos</h3>
          <div className="space-y-2">
            {[
              { to: '/envios/nuevo', label: 'Registrar envío' },
              { to: '/seguimiento', label: 'Seguimiento logístico' },
              { to: '/incidencias', label: 'Gestionar incidencias' },
              { to: '/reportes', label: 'Generar reportes' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="block rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-salazar-800 transition hover:border-salazar-300 hover:bg-salazar-50"
              >
                → {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
