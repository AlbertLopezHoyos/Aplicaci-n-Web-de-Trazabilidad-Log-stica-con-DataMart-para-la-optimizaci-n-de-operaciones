import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { FileText, FileSpreadsheet, Download, Timer } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

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

  const loadHistorial = () => {
    api.get('/reportes/historial').then((r) => setHistorial(r.data.data));
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
      const tiempo = data.data?.reporte?.tiempo_generacion_min;
      toastSuccess(
        'Reporte generado',
        tiempo != null ? `Tiempo de generación: ${tiempo} min (TPGRO)` : ''
      );
      if (data.data?.downloadUrl) window.open(data.data.downloadUrl, '_blank');
      loadHistorial();
      setObservaciones('');
    } catch {
      toastError('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Reportes operativos"
        subtitle="Medición automática del tiempo de generación — ficha dimensión 4 (TPGRO)"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <h3 className="font-semibold text-salazar-900">Generar reporte</h3>
          <div>
            <label className="mb-2 block text-sm font-medium">Tipo de reporte</label>
            <div className="space-y-2">
              {tipos.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
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
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 ${formato === 'pdf' ? 'border-salazar-500 bg-salazar-50' : ''}`}
              >
                <FileText className="h-5 w-5" /> PDF
              </button>
              <button
                type="button"
                onClick={() => setFormato('excel')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 ${formato === 'excel' ? 'border-salazar-500 bg-salazar-50' : ''}`}
              >
                <FileSpreadsheet className="h-5 w-5" /> Excel
              </button>
            </div>
          </div>
          <button type="button" className="btn-primary w-full" onClick={generar} disabled={loading}>
            {loading ? 'Generando...' : 'Generar y descargar'}
          </button>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold text-salazar-900">Historial de reportes</h3>
          <ul className="space-y-3">
            {historial.length === 0 && (
              <p className="text-sm text-slate-500">No hay reportes generados aún.</p>
            )}
            {historial.map((r) => (
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
                  {r.ruta_archivo && (
                    <a href={r.ruta_archivo} target="_blank" rel="noreferrer" className="text-salazar-600">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
