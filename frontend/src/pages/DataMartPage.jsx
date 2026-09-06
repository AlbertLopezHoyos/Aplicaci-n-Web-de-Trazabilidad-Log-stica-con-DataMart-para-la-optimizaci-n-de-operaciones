import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { Database, Play, Layers, TrendingUp, Clock, AlertTriangle, Package } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

const DataMartPage = () => {
  const [design, setDesign] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPreview = async () => {
    const [prev, anal] = await Promise.all([
      api.get('/datamart/preview'),
      api.get('/datamart/analytics').catch(() => ({ data: { data: null } })),
    ]);
    setPreview(prev.data.data);
    setAnalytics(anal.data.data);
  };

  useEffect(() => {
    api.get('/datamart/design').then((r) => setDesign(r.data.data));
    loadPreview().catch(() => {});
  }, []);

  const runEtl = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/datamart/etl/run');
      toastSuccess('ETL ejecutado', `${data.data?.filasCargadas ?? 0} filas cargadas`);
      await loadPreview();
    } catch {
      toastError('Error al ejecutar ETL');
    } finally {
      setLoading(false);
    }
  };

  const hechos = preview?.totalHechos ?? 0;
  const listoSustentacion = hechos >= 5000;

  return (
    <div>
      <PageHeader
        title="DataMart — Business Intelligence"
        subtitle="Arquitectura analítica para optimización operacional · Lima 2026"
      />

      {listoSustentacion && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          DataMart listo para sustentación: <strong>{hechos.toLocaleString()}</strong> registros en tabla de hechos (objetivo ≥ 5,000).
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4">
          <Database className="h-10 w-10 text-salazar-600" />
          <div>
            <p className="text-2xl font-bold">{hechos.toLocaleString()}</p>
            <p className="text-xs text-slate-500">Registros en tabla de hechos</p>
          </div>
        </div>
        {analytics && hechos > 0 && (
          <>
            <div className="card flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{analytics.otif_pct ?? '—'}%</p>
                <p className="text-xs text-slate-500">OTIF (entregas a tiempo)</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <Clock className="h-8 w-8 text-salazar-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.lead_time_promedio ?? '—'}</p>
                <p className="text-xs text-slate-500">Días promedio de tránsito</p>
              </div>
            </div>
            <div className="card flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{analytics.tasa_incidencias ?? '—'}%</p>
                <p className="text-xs text-slate-500">Tasa de incidencias / envío</p>
              </div>
            </div>
          </>
        )}
      </div>

      {preview?.dimensiones && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {preview.dimensiones.map((d) => (
            <div key={d.tabla} className="card flex items-center gap-4">
              <Layers className="h-8 w-8 text-salazar-400" />
              <div>
                <p className="text-xl font-bold">{Number(d.registros).toLocaleString()}</p>
                <p className="text-xs text-slate-500">{d.tabla}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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
          <h3 className="mb-3 font-semibold text-salazar-900">ETL y KPIs analíticos</h3>
          <ul className="space-y-2 text-sm">
            {(design?.dashboardsBI || ['Panel OTIF', 'Volumen por cliente', 'Lead time por ruta']).map((d) => (
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
            Carga envíos operacionales hacia <code className="text-salazar-700">fact_operaciones_logisticas</code>.
            Para ≥5,000 hechos: <code className="text-salazar-700">npm run db:seed-bulk</code> y luego ETL.
          </p>
          {analytics && hechos > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Package className="h-4 w-4" />
              Peso promedio: {analytics.peso_promedio_kg} kg · Retrasos: {analytics.envios_con_retraso}
            </div>
          )}
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
