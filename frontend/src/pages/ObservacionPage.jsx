import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import StatChip from '../components/StatChip';
import { ClipboardList, Download, Timer, AlertTriangle, MapPin, ClipboardCheck, Loader2 } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';
import { exportFichaExcel } from '../utils/fichaExport';

const DIMENSIONES = [
  { id: 1, titulo: 'Eficiencia operativa', indicador: 'TPRE', icon: Timer, color: 'blue' },
  { id: 2, titulo: 'Calidad información', indicador: 'PER', icon: AlertTriangle, color: 'red' },
  { id: 3, titulo: 'Control y seguimiento', indicador: 'PEEA', icon: MapPin, color: 'green' },
  { id: 4, titulo: 'Gestión información operativa', indicador: 'PIOIC', icon: ClipboardCheck, color: 'amber' },
];

const ALCANCES = [
  { valor: 'MUESTRA', etiqueta: 'Muestra de investigación', ayuda: 'Solo registros reales de preprueba y posprueba' },
  { valor: 'TODOS', etiqueta: 'Toda la operación', ayuda: 'Incluye los datos sintéticos del DataMart' },
];

const ObservacionPage = () => {
  const [indicadores, setIndicadores] = useState(null);
  const [dimensionActiva, setDimensionActiva] = useState(1);
  const [alcance, setAlcance] = useState('MUESTRA');
  const [datos, setDatos] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [tituloDim, setTituloDim] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadIndicadores = (modo) => {
    api
      .get('/observacion/indicadores', { params: { alcance: modo } })
      .then((r) => setIndicadores(r.data.data));
  };

  const loadDimension = (dim, modo) => {
    setLoading(true);
    api
      .get(`/observacion/ficha/${dim}`, { params: { alcance: modo } })
      .then((r) => {
        const payload = r.data.data || {};
        setDatos(payload.data || []);
        setTotalRegistros(payload.total ?? payload.data?.length ?? 0);
        setTituloDim(payload.titulo || DIMENSIONES.find((d) => d.id === dim)?.titulo || '');
      })
      .catch(() => toastError('Error', 'No se pudo cargar la ficha'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIndicadores(alcance);
  }, [alcance]);

  useEffect(() => {
    loadDimension(dimensionActiva, alcance);
  }, [dimensionActiva, alcance]);

  const exportar = async (dim) => {
    setExporting(true);
    try {
      const { data } = await api.get(`/observacion/ficha/${dim}/export`, { params: { alcance } });
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
        `Dimensión ${dim} (${payload.indicador}) · últimos ${payload.filas?.length ?? 0} registros`
      );
    } catch {
      toastError('Error', 'No se pudo exportar la ficha');
    } finally {
      setExporting(false);
    }
  };

  const dimActual = DIMENSIONES.find((d) => d.id === dimensionActiva);
  const columnas = datos.length ? Object.keys(datos[0]) : [];
  const labelCol = (key) => key.replace(/_/g, ' ');

  return (
    <div className="page-shell">
      <PageHeader
        title="Fichas de observación"
        subtitle="Evidencia cuantitativa para preprueba y posprueba — Tesis 2026"
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
            Exportar dimensión {dimensionActiva} (Excel)
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <KpiCard
          title="TPRE (min)"
          value={indicadores?.tpre ?? '—'}
          subtitle="Tiempo promedio registro"
          icon={Timer}
          color="blue"
        />
        <KpiCard
          title="PER (%)"
          value={indicadores?.per ?? '—'}
          subtitle="Errores en registros"
          icon={AlertTriangle}
          color="red"
        />
        <KpiCard
          title="PEEA (%)"
          value={indicadores?.peea ?? '—'}
          subtitle="Envíos con estado actualizado"
          icon={MapPin}
          color="green"
        />
        <KpiCard
          title="PIOIC (%)"
          value={indicadores?.pioic ?? '—'}
          subtitle="Incidencias con información completa"
          icon={ClipboardCheck}
          color="amber"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ALCANCES.map(({ valor, etiqueta, ayuda }) => (
          <button
            key={valor}
            type="button"
            title={ayuda}
            onClick={() => setAlcance(valor)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              alcance === valor
                ? 'border-salazar-500 bg-salazar-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {alcance === 'TODOS' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          Vista operativa: incluye los datos sintéticos generados para las pruebas técnicas del
          DataMart. <strong>No usar estos valores para el contraste de hipótesis.</strong>
        </div>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
          Muestra de investigación: solo registros reales marcados como preprueba o posprueba
          (50 + 50). El desglose por grupo está en <strong>Medición de investigación</strong>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <StatChip label="Dimensión activa" value={`${dimensionActiva} · ${dimActual?.indicador}`} />
        <StatChip label="Vista previa" value={`${datos.length} filas`} accent="salazar" />
        <StatChip label="En BD" value={totalRegistros} accent="slate" />
        <StatChip
          label="Alcance"
          value={alcance === 'TODOS' ? 'Con sintéticos' : 'Solo muestra'}
          accent={alcance === 'TODOS' ? 'amber' : 'green'}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {DIMENSIONES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDimensionActiva(d.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              dimensionActiva === d.id
                ? 'border-salazar-500 bg-salazar-800 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="mr-1 inline h-4 w-4" />
            Dim. {d.id}: {d.indicador}
          </button>
        ))}
      </div>

      <div className="table-panel">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">
            {tituloDim || dimActual?.titulo} — Vista previa
          </h3>
          <p className="text-xs text-slate-500">
            Últimos {datos.length} registros (máx. 50) · Total en BD: {totalRegistros} · La exportación incluye los mismos {datos.length} registros mostrados
          </p>
        </div>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : (
          <div className="table-panel-body">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">N°</th>
                  {columnas.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2.5">
                      {labelCol(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 && (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-10 text-center text-slate-500">
                      {alcance === 'MUESTRA'
                        ? 'Sin registros en la muestra. Marque envíos reales como preprueba o posprueba (npm run db:muestra) o cambie el alcance a "Toda la operación".'
                        : 'Sin registros. Cree envíos e incidencias con área y fuente de información para poblar la ficha.'}
                    </td>
                  </tr>
                )}
                {datos.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    {columnas.map((c) => (
                      <td key={c} className="max-w-[200px] truncate px-3 py-2" title={String(row[c] ?? '')}>
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
