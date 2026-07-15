import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import KpiCard from '../components/KpiCard';
import { ClipboardList, Download, Timer, AlertTriangle, MapPin, FileBarChart } from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';

const DIMENSIONES = [
  { id: 1, titulo: 'Eficiencia operativa', indicador: 'TPRE', icon: Timer, color: 'blue' },
  { id: 2, titulo: 'Calidad información', indicador: 'PER', icon: AlertTriangle, color: 'red' },
  { id: 3, titulo: 'Control y seguimiento', indicador: 'PEEA', icon: MapPin, color: 'green' },
  { id: 4, titulo: 'Toma de decisiones', indicador: 'TPGRO', icon: FileBarChart, color: 'amber' },
];

const ObservacionPage = () => {
  const [indicadores, setIndicadores] = useState(null);
  const [dimensionActiva, setDimensionActiva] = useState(1);
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadIndicadores = () => {
    api.get('/observacion/indicadores').then((r) => setIndicadores(r.data.data));
  };

  const loadDimension = (dim) => {
    setLoading(true);
    api
      .get(`/observacion/ficha/${dim}`)
      .then((r) => setDatos(r.data.data?.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadIndicadores();
    loadDimension(1);
  }, []);

  useEffect(() => {
    loadDimension(dimensionActiva);
  }, [dimensionActiva]);

  const exportar = async (dim) => {
    try {
      const { data } = await api.get(`/observacion/ficha/${dim}/export`);
      if (data.data?.downloadUrl) {
        window.open(data.data.downloadUrl, '_blank');
        toastSuccess('Ficha exportada', `Dimensión ${dim} — Excel listo para observación`);
      }
    } catch {
      toastError('Error al exportar ficha');
    }
  };

  const columnas = datos.length ? Object.keys(datos[0]) : [];

  return (
    <div>
      <PageHeader
        title="Fichas de observación"
        subtitle="Evidencia cuantitativa para preprueba y posprueba — Tesis 2026"
        action={
          <button type="button" className="btn-primary" onClick={() => exportar(dimensionActiva)}>
            <Download className="h-4 w-4" /> Exportar dimensión {dimensionActiva}
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          title="TPGRO (min)"
          value={indicadores?.tpgro ?? '—'}
          subtitle="Tiempo generación reportes"
          icon={FileBarChart}
          color="amber"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {DIMENSIONES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDimensionActiva(d.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              dimensionActiva === d.id
                ? 'border-salazar-500 bg-salazar-800 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ClipboardList className="mr-1 inline h-4 w-4" />
            Dim. {d.id}: {d.indicador}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">
            {DIMENSIONES.find((d) => d.id === dimensionActiva)?.titulo} — Vista previa
          </h3>
          <p className="text-xs text-slate-500">{datos.length} registros · Máx. 50 para muestra</p>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">N°</th>
                  {columnas.map((c) => (
                    <th key={c} className="px-3 py-2 whitespace-nowrap">{c.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 && (
                  <tr>
                    <td colSpan={columnas.length + 1} className="px-4 py-8 text-center text-slate-500">
                      Sin registros. Cree envíos o reportes para poblar la ficha.
                    </td>
                  </tr>
                )}
                {datos.map((row, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2">{i + 1}</td>
                    {columnas.map((c) => (
                      <td key={c} className="px-3 py-2 whitespace-nowrap">{String(row[c] ?? '—')}</td>
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
