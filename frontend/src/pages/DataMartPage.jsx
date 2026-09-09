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
      toastSuccess('ETL ejecutado', data.data?.mensaje || `${data.data?.filasCargadas ?? 0} filas cargadas`);
      await loadPreview();
    } catch {
      toastError('Error al ejecutar ETL');
    } finally {
      setLoading(false);
    }
  };

  const hechos = preview?.totalHechos ?? 0;
  const ejecuciones = preview?.ultimasEjecuciones ?? [];
  const metricasDefinidas = design?.tablas?.hechos?.fact_operaciones_logisticas?.metricas;
  const metricas = Array.isArray(metricasDefinidas)
    ? metricasDefinidas.map((m) => [m, null])
    : Object.entries(metricasDefinidas || {});

  return (
    <div className="page-shell">
      <PageHeader
        title="DataMart — Business Intelligence"
        subtitle="Indicadores analíticos de la operación logística"
        compact
      />

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
                <p className="text-lg font-bold tabular-nums">{Number(d.vigentes ?? d.registros).toLocaleString()}</p>
                <p className="truncate text-xs text-slate-500">{d.tabla}</p>
                {Number(d.registros) !== Number(d.vigentes ?? d.registros) && (
                  <p className="truncate text-[11px] text-slate-400">
                    {Number(d.registros) - Number(d.vigentes)} histórica(s)
                  </p>
                )}
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
                <span className="h-2 w-2 shrink-0 rounded-full bg-salazar-600" />
                {d}
              </li>
            ))}
          </ul>
          <button type="button" onClick={runEtl} disabled={loading} className="btn-primary mt-3 w-full">
            <Play className="h-4 w-4" />
            {loading ? 'Ejecutando ETL...' : 'Ejecutar ETL de staging'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Actualiza el DataMart con los envíos, estados e incidencias de la operación.
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
        <h3 className="panel-title">Métricas de la tabla de hechos</h3>
        <p className="mb-2 text-xs text-slate-500">
          Grano: {design?.tablas?.hechos?.fact_operaciones_logisticas?.grain || 'una fila por operación de envío'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metricas.map(([nombre, info]) => (
            <div key={nombre} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-700">{nombre}</p>
              {info?.aditividad && <p className="text-xs text-slate-500">{info.aditividad}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="table-panel">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">Bitácora de ejecuciones ETL</h3>
          <p className="text-xs text-slate-500">
            El proceso es idempotente: reejecutarlo actualiza métricas pero no duplica hechos.
          </p>
        </div>
        <div className="table-panel-body">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Inicio</th>
                <th className="px-3 py-2.5">Fin</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Extraídos</th>
                <th className="px-3 py-2.5 text-right">Transformados</th>
                <th className="px-3 py-2.5 text-right">Cargados</th>
              </tr>
            </thead>
            <tbody>
              {ejecuciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Sin ejecuciones registradas. Ejecute el ETL para generar la primera entrada.
                  </td>
                </tr>
              )}
              {ejecuciones.map((e) => (
                <tr key={e.id_ejecucion} className="border-t border-slate-50">
                  <td className="px-3 py-2">{new Date(e.fecha_inicio).toLocaleString()}</td>
                  <td className="px-3 py-2">{e.fecha_fin ? new Date(e.fecha_fin).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-medium ${
                        e.estado === 'EXITOSO'
                          ? 'bg-emerald-50 text-emerald-700'
                          : e.estado === 'FALLIDO'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.registros_extraidos}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.registros_transformados}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{e.registros_cargados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataMartPage;
