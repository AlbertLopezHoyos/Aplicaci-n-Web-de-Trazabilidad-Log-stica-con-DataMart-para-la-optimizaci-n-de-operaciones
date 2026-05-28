import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

const tipos = [
  { id: 'envios_estado', label: 'Envíos por estado' },
  { id: 'tiempos', label: 'Tiempos promedio de entrega' },
  { id: 'incidencias', label: 'Incidencias operativas' },
  { id: 'productividad', label: 'Productividad por operador' },
];

const ReportesPage = () => {
  const [tipo, setTipo] = useState('envios_estado');
  const [formato, setFormato] = useState('pdf');
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
      const { data } = await api.post('/reportes/generar', { tipo, formato });
      toastSuccess('Reporte generado');
      if (data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank');
      }
      loadHistorial();
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
        subtitle="Exportación PDF y Excel para toma de decisiones"
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
                  <input
                    type="radio"
                    name="tipo"
                    value={t.id}
                    checked={tipo === t.id}
                    onChange={() => setTipo(t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Formato</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormato('pdf')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 ${
                  formato === 'pdf' ? 'border-salazar-500 bg-salazar-50' : ''
                }`}
              >
                <FileText className="h-5 w-5" /> PDF
              </button>
              <button
                type="button"
                onClick={() => setFormato('excel')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 ${
                  formato === 'excel' ? 'border-salazar-500 bg-salazar-50' : ''
                }`}
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
              <li
                key={r.id_reporte}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{r.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {r.tipo_reporte} · {r.formato?.toUpperCase()}
                  </p>
                </div>
                {r.ruta_archivo && (
                  <a href={r.ruta_archivo} target="_blank" rel="noreferrer" className="text-salazar-600">
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportesPage;
