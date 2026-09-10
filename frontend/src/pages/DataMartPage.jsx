import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import {
  Database,
  RefreshCw,
  Layers,
  TrendingUp,
  Clock,
  AlertTriangle,
  Package,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

const CATALOGO = {
  dim_fecha: { nombre: 'Calendario', detalle: 'Para ver la operación por día, mes o año' },
  dim_cliente: { nombre: 'Clientes', detalle: 'Quién contrata el servicio' },
  dim_estado: { nombre: 'Estados', detalle: 'En tránsito, entregado, cancelado…' },
  dim_operador: { nombre: 'Operadores', detalle: 'Quién registró el envío' },
};

const METRICA_NOMBRE = {
  peso_kg: 'Peso transportado',
  dias_transito: 'Días de tránsito',
  cantidad_incidencias: 'Incidencias por envío',
  tuvo_retraso: 'Envíos con retraso',
  entregado_a_tiempo: 'Entregas a tiempo',
};

const estadoHumano = (estado) => {
  if (estado === 'EXITOSO') return { texto: 'Actualizado', clase: 'bg-emerald-50 text-emerald-700' };
  if (estado === 'FALLIDO') return { texto: 'No se pudo actualizar', clase: 'bg-red-50 text-red-700' };
  return { texto: estado || 'En curso', clase: 'bg-slate-100 text-slate-600' };
};

const DataMartPage = () => {
  const [design, setDesign] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verTecnico, setVerTecnico] = useState(false);

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
      const n = data.data?.filasCargadas ?? 0;
      const act = data.data?.filasActualizadas ?? 0;
      toastSuccess(
        'Indicadores actualizados',
        n ? `${n} envíos nuevos en el análisis` : `${act} envíos ya consolidados se refrescaron`
      );
      await loadPreview();
    } catch {
      toastError('Error', 'No se pudieron actualizar los indicadores');
    } finally {
      setLoading(false);
    }
  };

  const hechos = preview?.totalHechos ?? 0;
  const ejecuciones = preview?.ultimasEjecuciones ?? [];
  const ultima = ejecuciones[0];
  const metricasDefinidas = design?.tablas?.hechos?.fact_operaciones_logisticas?.metricas;
  const metricas = Array.isArray(metricasDefinidas)
    ? metricasDefinidas.map((m) => [m, null])
    : Object.entries(metricasDefinidas || {});

  return (
    <div className="page-shell">
      <PageHeader
        title="Análisis de operaciones"
        subtitle="Entregas a tiempo, tránsito e incidencias — consolidados para decidir"
        compact
        action={
          <button type="button" onClick={runEtl} disabled={loading} className="btn-primary">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando…' : 'Actualizar indicadores'}
          </button>
        }
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
          <span>
            Pulse <strong>Actualizar indicadores</strong> cuando quiera ver los datos más recientes.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiCard
          title="Envíos en el análisis"
          value={hechos.toLocaleString()}
          icon={Database}
          hint={ultima ? `Última actualización: ${new Date(ultima.fecha_inicio).toLocaleString()}` : 'Aún no se ha actualizado'}
        />
        {analytics && hechos > 0 ? (
          <>
            <KpiCard
              title="Entregas a tiempo"
              value={`${analytics.otif_pct ?? '—'}%`}
              icon={TrendingUp}
              color="green"
              subtitle="OTIF — de los envíos ya entregados"
            />
            <KpiCard
              title="Tiempo de tránsito"
              value={analytics.lead_time_promedio ?? '—'}
              icon={Clock}
              color="blue"
              subtitle="Días promedio hasta la entrega"
            />
            <KpiCard
              title="Con incidencia"
              value={`${analytics.tasa_incidencias ?? '—'}%`}
              icon={AlertTriangle}
              color="amber"
              subtitle="Porcentaje de envíos con incidencia"
            />
          </>
        ) : (
          <>
            <KpiCard title="Entregas a tiempo" value="—" icon={TrendingUp} color="green" subtitle="Pulse actualizar" />
            <KpiCard title="Tiempo de tránsito" value="—" icon={Clock} color="blue" subtitle="Pulse actualizar" />
            <KpiCard title="Con incidencia" value="—" icon={AlertTriangle} color="amber" subtitle="Pulse actualizar" />
          </>
        )}
      </div>

      {analytics && hechos > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
            <Package className="h-3.5 w-3.5" />
            Peso promedio {analytics.peso_promedio_kg} kg · Retrasos {analytics.envios_con_retraso}
          </span>
        </div>
      )}

      {preview?.dimensiones && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {preview.dimensiones.map((d) => {
            const meta = CATALOGO[d.tabla] || { nombre: d.tabla, detalle: '' };
            return (
              <div key={d.tabla} className="card-compact flex items-center gap-3">
                <Layers className="h-7 w-7 shrink-0 text-salazar-500" />
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums">
                    {Number(d.vigentes ?? d.registros).toLocaleString()}
                  </p>
                  <p className="truncate text-xs font-medium text-slate-700">{meta.nombre}</p>
                  <p className="truncate text-[11px] text-slate-400">{meta.detalle}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card-panel min-h-[240px]">
          <h3 className="panel-title">Qué puede consultar</h3>
          <p className="mb-3 text-xs text-slate-500">
            Estos paneles se explotan aquí y en Power BI, conectado al mismo análisis.
          </p>
          <ul className="grid flex-1 gap-2">
            {(design?.dashboardsBI || [
              'Entregas a tiempo y días de tránsito',
              'Volumen por cliente',
              'Incidencias por periodo',
            ]).map((d) => (
              <li key={d} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-salazar-600" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="table-panel min-h-[240px]">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="font-semibold text-salazar-900">Últimas actualizaciones</h3>
            <p className="text-xs text-slate-500">
              Cada clic en Actualizar lee los envíos e incidencias y refresca los indicadores. No duplica registros.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Resultado</th>
                  <th className="px-3 py-2.5 text-right">Leídos</th>
                  <th className="px-3 py-2.5 text-right">Guardados</th>
                </tr>
              </thead>
              <tbody>
                {ejecuciones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Todavía no hay actualizaciones. Pulse Actualizar indicadores.
                    </td>
                  </tr>
                )}
                {ejecuciones.map((e) => {
                  const badge = estadoHumano(e.estado);
                  return (
                    <tr key={e.id_ejecucion} className="border-t border-slate-50">
                      <td className="px-3 py-2">{new Date(e.fecha_inicio).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 font-medium ${badge.clase}`}>{badge.texto}</span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.registros_extraidos}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{e.registros_cargados}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-0">
        <button
          type="button"
          onClick={() => setVerTecnico((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="font-semibold text-salazar-900">Vista técnica (tesis / Power BI)</span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              Esquema estrella, DataMart y proceso ETL — no lo usa el personal operativo
            </span>
          </span>
          {verTecnico ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {verTecnico && (
          <div className="space-y-4 border-t border-slate-100 px-4 py-4">
            <pre className="overflow-x-auto rounded-lg bg-salazar-950 p-4 text-xs leading-relaxed text-salazar-100">
{`        dim_fecha
            │
dim_cliente ──► fact_operaciones_logisticas ◄── dim_estado
            │
        dim_operador`}
            </pre>
            {design && (
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <strong>{design.nombre}</strong> v{design.version} · esquema {design.esquema}
                </p>
                <p className="text-xs">{design.etl?.extraccion}</p>
                <p className="text-xs">
                  Grano: {design?.tablas?.hechos?.fact_operaciones_logisticas?.grain}
                </p>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {metricas.map(([nombre, info]) => (
                <div key={nombre} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-700">{METRICA_NOMBRE[nombre] || nombre}</p>
                  <p className="font-mono text-[11px] text-slate-400">{nombre}</p>
                  {info?.aditividad && <p className="text-xs text-slate-500">{info.aditividad}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMartPage;
