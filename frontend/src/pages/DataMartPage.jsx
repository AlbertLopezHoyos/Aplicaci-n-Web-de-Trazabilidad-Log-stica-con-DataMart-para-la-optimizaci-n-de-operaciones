import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
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
    <div className="page-shell">
      <PageHeader
        title="DataMart — Business Intelligence"
        subtitle="Arquitectura analítica para optimización operacional · Lima 2026"
        compact
      />

      {listoSustentacion && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          DataMart listo para sustentación: <strong>{hechos.toLocaleString()}</strong> registros en tabla de hechos (objetivo ≥ 5,000).
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiCard
          title="Hechos analíticos"
          value={hechos.toLocaleString()}
          icon={Database}
          hint="fact_operaciones_logisticas"
        />
        {analytics && hechos > 0 ? (
          <>
            <KpiCard
              title="OTIF"
              value={`${analytics.otif_pct ?? '—'}%`}
              icon={TrendingUp}
              color="green"
              subtitle="Entregas a tiempo"
            />
            <KpiCard
              title="Lead time"
              value={analytics.lead_time_promedio ?? '—'}
              icon={Clock}
              color="blue"
              subtitle="Días promedio de tránsito"
            />
            <KpiCard
              title="Tasa incidencias"
              value={`${analytics.tasa_incidencias ?? '—'}%`}
              icon={AlertTriangle}
              color="amber"
              subtitle="Por envío gestionado"
            />
          </>
        ) : (
          <>
            <KpiCard title="OTIF" value="—" icon={TrendingUp} color="green" subtitle="Ejecute ETL" />
            <KpiCard title="Lead time" value="—" icon={Clock} color="blue" subtitle="Ejecute ETL" />
            <KpiCard title="Tasa incidencias" value="—" icon={AlertTriangle} color="amber" subtitle="Ejecute ETL" />
          </>
        )}
      </div>

      {preview?.dimensiones && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {preview.dimensiones.map((d) => (
            <div key={d.tabla} className="card-compact flex items-center gap-3">
              <Layers className="h-7 w-7 shrink-0 text-salazar-500" />
              <div className="min-w-0">
                <p className="text-lg font-bold tabular-nums">{Number(d.registros).toLocaleString()}</p>
                <p className="truncate text-xs text-slate-500">{d.tabla}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card-panel min-h-[280px]">
          <h3 className="panel-title">Esquema estrella</h3>
          <pre className="overflow-x-auto rounded-lg bg-salazar-950 p-4 text-xs leading-relaxed text-salazar-100">
{`        dim_fecha
            │
dim_cliente ──► fact_operaciones_logisticas ◄── dim_estado
            │
        dim_operador`}
          </pre>
          {design && (
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p><strong>{design.nombre}</strong> v{design.version}</p>
              <p>Esquema: {design.esquema}</p>
              <p className="text-xs">{design.etl?.extraccion}</p>
            </div>
          )}
        </div>

        <div className="card-panel min-h-[280px]">
          <h3 className="panel-title">ETL y KPIs analíticos</h3>
          <ul className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {(design?.dashboardsBI || ['Panel OTIF', 'Volumen por cliente', 'Lead time por ruta']).map((d) => (
              <li key={d} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent-orange" />
                {d}
              </li>
            ))}
          </ul>
          <button type="button" onClick={runEtl} disabled={loading} className="btn-primary mt-3 w-full">
            <Play className="h-4 w-4" />
            {loading ? 'Ejecutando ETL...' : 'Ejecutar ETL de staging'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Carga envíos hacia <code className="text-salazar-700">fact_operaciones_logisticas</code>.
            Para ≥5,000 hechos: <code className="text-salazar-700">npm run db:seed-bulk</code> y luego ETL.
          </p>
          {analytics && hechos > 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <Package className="h-4 w-4 shrink-0" />
              Peso promedio: {analytics.peso_promedio_kg} kg · Retrasos: {analytics.envios_con_retraso}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="panel-title">Métricas definidas (analytics)</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {design?.tablas?.hechos?.fact_operaciones_logisticas?.metricas?.map((m) => (
            <span key={m} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataMartPage;
