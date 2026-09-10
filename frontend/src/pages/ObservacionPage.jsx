import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import {
  ClipboardList,
  Download,
  Timer,
  AlertTriangle,
  MapPin,
  ClipboardCheck,
  Loader2,
  Info,
  ChevronLeft,
} from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';
import { exportFichaExcel } from '../utils/fichaExport';

const DIMENSIONES = [
  {
    id: 1,
    titulo: 'Eficiencia operativa',
    indicador: 'TPRE',
    unidad: 'min',
    icon: Timer,
    color: 'border-blue-200 bg-blue-50 text-blue-800',
    activo: 'border-blue-500 bg-blue-600 text-white',
  },
  {
    id: 2,
    titulo: 'Calidad de la información',
    indicador: 'PER',
    unidad: '%',
    icon: AlertTriangle,
    color: 'border-red-200 bg-red-50 text-red-800',
    activo: 'border-red-500 bg-red-600 text-white',
  },
  {
    id: 3,
    titulo: 'Control y seguimiento',
    indicador: 'PEEA',
    unidad: '%',
    icon: MapPin,
    color: 'border-green-200 bg-green-50 text-green-800',
    activo: 'border-green-500 bg-green-600 text-white',
  },
  {
    id: 4,
    titulo: 'Gestión info. operativa',
    indicador: 'PIOIC',
    unidad: '%',
    icon: ClipboardCheck,
    color: 'border-amber-200 bg-amber-50 text-amber-800',
    activo: 'border-amber-500 bg-amber-600 text-white',
  },
];

const CLAVE_INDICADOR = { 1: 'tpre', 2: 'per', 3: 'peea', 4: 'pioic' };
const ALCANCE_FICHA = 'MUESTRA';
const GRUPO_FICHA = 'POSPRUEBA';
const VENTANA_FICHA = { desde: '2026-09-01', hasta: '2026-09-20' };

const ObservacionPage = () => {
  const [indicadores, setIndicadores] = useState(null);
  const [dimensionActiva, setDimensionActiva] = useState(1);
  const [datos, setDatos] = useState([]);
  const [columnas, setColumnas] = useState([]);
  const [labels, setLabels] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [tituloDim, setTituloDim] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const paramsFicha = { alcance: ALCANCE_FICHA, grupo: GRUPO_FICHA };

  const loadIndicadores = () => {
    api
      .get('/observacion/indicadores', { params: paramsFicha })
      .then((r) => setIndicadores(r.data.data))
      .catch(() => {});
  };

  const loadDimension = (dim) => {
    setLoading(true);
    api
      .get(`/observacion/ficha/${dim}`, { params: paramsFicha })
      .then((r) => {
        const payload = r.data.data || {};
        setDatos(payload.data || []);
        setColumnas(payload.columnas || (payload.data?.[0] ? Object.keys(payload.data[0]) : []));
        setLabels(payload.labels || []);
        setTotalRegistros(payload.total ?? payload.data?.length ?? 0);
        setTituloDim(payload.titulo || DIMENSIONES.find((d) => d.id === dim)?.titulo || '');
      })
      .catch(() => toastError('Error', 'No se pudo cargar la ficha'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIndicadores();
  }, []);

  useEffect(() => {
    loadDimension(dimensionActiva);
  }, [dimensionActiva]);

  const exportar = async (dim) => {
    setExporting(true);
    try {
      const { data } = await api.get(`/observacion/ficha/${dim}/export`, { params: paramsFicha });
      const payload = data.data || {};
      await exportFichaExcel({
        titulo: payload.titulo,
        indicador: payload.indicador,
        dimension: payload.dimension ?? dim,
        headers: payload.headers || [],
        filas: payload.filas || [],
        indicadores: payload.indicadores || indicadores || {},
      });
      toastSuccess(
        'Ficha exportada',
        `Dimensión ${dim} (${payload.indicador}) · ${payload.filas?.length ?? 0} registros`
      );
    } catch {
      toastError('Error', 'No se pudo exportar la ficha');
    } finally {
      setExporting(false);
    }
  };

  const dimActual = DIMENSIONES.find((d) => d.id === dimensionActiva);
  const claveInd = CLAVE_INDICADOR[dimensionActiva];
  const valorIndicador = indicadores?.[claveInd];
  const labelCol = (key, idx) => labels[idx] || key.replace(/_/g, ' ');

  return (
    <div className="page-shell">
      <Link
        to="/investigacion"
        className="inline-flex items-center gap-1 text-sm font-medium text-salazar-700 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a Investigación
      </Link>
      <PageHeader
        title="Fichas de observación"
        subtitle="Postest — 50 envíos de posprueba · 1 al 20 de septiembre de 2026"
        compact
        action={
          <button
            type="button"
            className="btn-primary"
            disabled={exporting}
            onClick={() => exportar(dimensionActiva)}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar Excel
          </button>
        }
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
          <span>
            Estas fichas solo extraen los 50 registros del <strong>postest</strong> (posprueba,
            1–20 set 2026). No forman parte del funcionamiento operativo: no crean envíos ni
            cambian estados. Envíos, seguimiento e incidencias siguen siendo la operación diaria.
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-salazar-50 px-3 py-1.5 text-xs font-medium text-salazar-800 ring-1 ring-salazar-200">
          Posprueba · {VENTANA_FICHA.desde} a {VENTANA_FICHA.hasta} · máx. 50 registros
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {DIMENSIONES.map((d) => {
          const Icon = d.icon;
          const activa = dimensionActiva === d.id;
          const valor = indicadores?.[CLAVE_INDICADOR[d.id]];
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDimensionActiva(d.id)}
              className={`rounded-xl border p-3 text-left transition ${
                activa ? d.activo + ' shadow-sm' : d.color + ' hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span className="text-xs font-semibold uppercase tracking-wide opacity-90">
                  Dim. {d.id} · {d.indicador}
                </span>
              </div>
              <p className={`mt-1 text-sm font-medium ${activa ? 'text-white/95' : ''}`}>{d.titulo}</p>
              <p className={`mt-2 text-2xl font-bold tabular-nums ${activa ? 'text-white' : ''}`}>
                {valor ?? '—'}
                <span className="ml-0.5 text-sm font-normal opacity-80">{d.unidad}</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="table-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="font-semibold text-salazar-900">
              {tituloDim || dimActual?.titulo}
            </h3>
            <p className="text-xs text-slate-500">
              Vista previa · {datos.length} de {totalRegistros} en posprueba (1–20 set 2026) · Indicador {dimActual?.indicador}:{' '}
              <strong>{valorIndicador ?? '—'}{dimActual?.unidad === '%' ? '%' : ' min'}</strong>
            </p>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
            <ClipboardList className="mr-1 inline h-3 w-3" />
            50 envíos · 1–20 set 2026
          </span>
        </div>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : (
          <div className="table-panel-body overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 font-semibold">N°</th>
                  {columnas.map((c, i) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                      {labelCol(c, i)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 && (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-10 text-center text-slate-500">
                      Sin registros de posprueba en la ventana 1–20 set 2026.
                    </td>
                  </tr>
                )}
                {datos.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    {columnas.map((c) => (
                      <td key={c} className="max-w-[220px] truncate px-3 py-2" title={String(row[c] ?? '')}>
                        {String(row[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObservacionPage;
