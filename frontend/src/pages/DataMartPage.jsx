import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { Database, Play, Layers } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

const DataMartPage = () => {
  const [design, setDesign] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/datamart/design').then((r) => setDesign(r.data.data));
    api.get('/datamart/preview').then((r) => setPreview(r.data.data)).catch(() => {});
  }, []);

  const runEtl = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/datamart/etl/run');
      toastSuccess('ETL ejecutado', data.message);
      const prev = await api.get('/datamart/preview');
      setPreview(prev.data.data);
    } catch {
      toastError('Error al ejecutar ETL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="DataMart — Business Intelligence"
        subtitle="Arquitectura analítica preparada para dashboards BI"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <Database className="h-10 w-10 text-salazar-600" />
          <div>
            <p className="text-2xl font-bold">{preview?.totalHechos ?? 0}</p>
            <p className="text-xs text-slate-500">Registros en tabla de hechos</p>
          </div>
        </div>
        {preview?.dimensiones?.map((d) => (
          <div key={d.tabla} className="card flex items-center gap-4">
            <Layers className="h-8 w-8 text-salazar-400" />
            <div>
              <p className="text-xl font-bold">{d.registros}</p>
              <p className="text-xs text-slate-500">{d.tabla}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 font-semibold text-salazar-900">Esquema estrella</h3>
          <pre className="overflow-x-auto rounded-lg bg-salazar-950 p-4 text-xs text-salazar-100">
{`        dim_fecha
            │
dim_cliente ──► fact_operaciones_logisticas ◄── dim_estado
            │
        dim_operador`}
          </pre>
          {design && (
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p><strong>{design.nombre}</strong> v{design.version}</p>
              <p>Esquema: {design.esquema}</p>
              <p className="text-xs">{design.etl?.extraccion}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="mb-3 font-semibold text-salazar-900">KPIs analíticos futuros</h3>
          <ul className="space-y-2 text-sm">
            {(design?.dashboardsBI || []).map((d) => (
              <li key={d} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-accent-orange" />
                {d}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={runEtl}
            disabled={loading}
            className="btn-primary mt-6 w-full"
          >
            <Play className="h-4 w-4" />
            {loading ? 'Ejecutando ETL...' : 'Ejecutar ETL de staging'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Carga datos operacionales hacia fact_operaciones_logisticas y dimensiones SCD.
          </p>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="mb-3 font-semibold">Métricas definidas (analytics)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {design?.tablas?.hechos?.fact_operaciones_logisticas?.metricas?.map((m) => (
            <span key={m} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataMartPage;
