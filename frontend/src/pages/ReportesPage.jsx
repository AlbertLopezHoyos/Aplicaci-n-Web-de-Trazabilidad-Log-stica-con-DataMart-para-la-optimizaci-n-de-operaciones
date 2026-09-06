import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { FileText, FileSpreadsheet, Download, Timer } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';
import { exportReportePdf, exportReporteExcel } from '../utils/reportesExport';

const tipos = [
  { id: 'envios_estado', label: 'Envíos por estado' },
  { id: 'tiempos', label: 'Tiempos promedio de entrega' },
  { id: 'incidencias', label: 'Incidencias operativas' },
  { id: 'productividad', label: 'Productividad por operador' },
];

const AREAS = ['Operaciones', 'Logística', 'Administración', 'Gerencia', 'Almacén'];

const ReportesPage = () => {
  const [tipo, setTipo] = useState('envios_estado');
  const [formato, setFormato] = useState('pdf');
  const [areaSolicitante, setAreaSolicitante] = useState('Operaciones');
  const [observaciones, setObservaciones] = useState('');
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(true);
  const [ultimoGenerado, setUltimoGenerado] = useState(null);

  const loadHistorial = () => {
    setHistorialLoading(true);
    api
      .get('/reportes/historial')
      .then((r) => setHistorial(r.data.data))
      .catch(() => toastError('Error', 'No se pudo cargar el historial'))
      .finally(() => setHistorialLoading(false));
  };

  useEffect(() => {
    loadHistorial();
  }, []);

  const generar = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/reportes/generar', {
        tipo,
        formato,
        area_solicitante: areaSolicitante,
        observaciones,
      });

      const { reporte, datos } = data.data || {};
      const payload = {
        titulo: datos?.titulo || `Reporte ${tipo}`,
        headers: datos?.headers || [],
        filas: datos?.filas || [],
        meta: { area: areaSolicitante, observaciones },
      };

      if (formato === 'pdf') {
        await exportReportePdf(payload);
      } else {
        await exportReporteExcel(payload);
      }

      const tiempo = reporte?.tiempo_generacion_min;
      toastSuccess(
        'Reporte generado',
        tiempo != null ? `Descarga iniciada · ${tiempo} min de procesamiento` : 'Descarga iniciada'
      );
      setUltimoGenerado({ ...payload, reporte, formato });
      loadHistorial();
      setObservaciones('');
    } catch (err) {
      toastError('Error', err.response?.data?.message || 'Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const redescargar = async (item) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reportes/datos/${item.tipo_reporte}`);
      const payload = {
        titulo: data.data.titulo,
        headers: data.data.headers,
        filas: data.data.filas,
        meta: { area: item.area_solicitante, observaciones: item.observaciones },
      };
      if (item.formato === 'excel') {
        await exportReporteExcel(payload);
      } else {
        await exportReportePdf(payload);
      }
      toastSuccess('Descarga iniciada');
    } catch {
      toastError('Error', 'No se pudo volver a generar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Reportes operativos"
        subtitle="Exportación PDF y Excel con formato institucional Salazar Perú"
        compact
      />

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="card space-y-3 xl:col-span-5">
          <h3 className="font-semibold text-salazar-900">Generar reporte</h3>
          <div>
            <label className="mb-2 block text-sm font-medium">Tipo de reporte</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {tipos.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition ${
                    tipo === t.id ? 'border-salazar-500 bg-salazar-50' : 'border-slate-200'
                  }`}
                >
                  <input type="radio" name="tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Área solicitante</label>
            <select className="input-field" value={areaSolicitante} onChange={(e) => setAreaSolicitante(e.target.value)}>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Observaciones</label>
            <textarea
              className="input-field"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas sobre la generación del reporte"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Formato</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormato('pdf')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition ${
                  formato === 'pdf' ? 'border-salazar-500 bg-salazar-50 text-salazar-900' : 'border-slate-200'
                }`}
              >
                <FileText className="h-5 w-5" /> PDF
              </button>
              <button
                type="button"
                onClick={() => setFormato('excel')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition ${
                  formato === 'excel' ? 'border-salazar-500 bg-salazar-50 text-salazar-900' : 'border-slate-200'
                }`}
              >
                <FileSpreadsheet className="h-5 w-5" /> Excel
              </button>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={generar} disabled={loading}>
            {loading ? 'Generando...' : 'Generar y descargar'}
          </button>
          <p className="text-xs text-slate-500">
            Incluye logo Salazar Perú, encabezado institucional y tabla formateada (como el comprobante de envío).
          </p>
        </div>

        <div className="flex flex-col gap-3 xl:col-span-7">
          {ultimoGenerado && (
            <div className="card-compact border-emerald-200 bg-emerald-50/50">
              <p className="text-sm font-medium text-emerald-900">Último reporte generado</p>
              <p className="mt-1 text-xs text-emerald-800">
                {ultimoGenerado.titulo} · {ultimoGenerado.filas.length} registros · {ultimoGenerado.formato?.toUpperCase()}
              </p>
              <button
                type="button"
                className="btn-secondary mt-3 text-xs"
                disabled={loading}
                onClick={() =>
                  ultimoGenerado.formato === 'excel'
                    ? exportReporteExcel(ultimoGenerado)
                    : exportReportePdf(ultimoGenerado)
                }
              >
                <Download className="h-3.5 w-3.5" /> Volver a descargar
              </button>
            </div>
          )}

          <div className="card flex min-h-[420px] flex-1 flex-col lg:min-h-[calc(100vh-14rem)]">
            <h3 className="panel-title">Historial de reportes</h3>
            <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
              {historialLoading && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-salazar-200 border-t-salazar-800" />
                </div>
              )}
              {!historialLoading && historial.length === 0 && (
                <p className="text-sm text-slate-500">No hay reportes generados aún.</p>
              )}
              {!historialLoading && historial.map((r) => (
                <li key={r.id_reporte} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{r.titulo}</p>
                      <p className="text-xs text-slate-500">
                        {r.tipo_reporte} · {r.formato?.toUpperCase()} · {r.area_solicitante || 'Operaciones'}
                      </p>
                      {r.tiempo_generacion_min != null && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-salazar-700">
                          <Timer className="h-3 w-3" />
                          {r.tiempo_generacion_min} min · {r.cantidad_registros ?? 0} registros
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded p-2 text-salazar-600 hover:bg-salazar-50"
                      title="Descargar de nuevo"
                      disabled={loading}
                      onClick={() => redescargar(r)}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
