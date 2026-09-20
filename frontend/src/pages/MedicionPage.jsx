import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import StatChip from '../components/StatChip';
import {
  Timer,
  AlertTriangle,
  MapPin,
  ClipboardCheck,
  Download,
  Loader2,
  Info,
  CalendarClock,
  ChevronLeft,
} from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';
import { exportFichaExcel } from '../utils/fichaExport';

const INDICADORES = [
  {
    clave: 'tpdre',
    nombre: 'TPDRE',
    dimension: 'Eficiencia operativa',
    descripcion: 'Tiempo promedio diario de registro de envíos (media de 20 jornadas)',
    formula: 'TPDRE = ΣTRE / NERD',
    unidad: 'min',
    icon: Timer,
    color: 'text-blue-600',
    detalle: (d) => `Media de ${d?.tpdre?.n_jornadas ?? 0} días · ΣTRE ${d?.tpdre?.suma_tre ?? 0} min`,
  },
  {
    clave: 'pdre',
    nombre: 'PDRE',
    dimension: 'Calidad de la información logística',
    descripcion: 'Porcentaje diario de registros con error (media de 20 jornadas)',
    formula: 'PDRE = (RCE / TRD) × 100',
    unidad: '%',
    icon: AlertTriangle,
    color: 'text-red-600',
    detalle: (d) => `Media de ${d?.pdre?.n_jornadas ?? 0} días · RCE ${d?.pdre?.rce ?? 0}`,
  },
  {
    clave: 'pdeea',
    nombre: 'PDEEA',
    dimension: 'Control y seguimiento de envíos',
    descripcion: 'Porcentaje diario de envíos con estado actualizado (media de 20 jornadas)',
    formula: 'PDEEA = (EEA / TED) × 100',
    unidad: '%',
    icon: MapPin,
    color: 'text-green-600',
    detalle: (d) => `Media de ${d?.pdeea?.n_jornadas ?? 0} días · EEA ${d?.pdeea?.eea ?? 0}`,
  },
  {
    clave: 'pdioic',
    nombre: 'PDIOIC',
    dimension: 'Gestión de la información operativa',
    descripcion: 'Porcentaje diario de incidencias con información completa (media de 20 jornadas)',
    formula: 'PDIOIC = (NIOC / TID) × 100',
    unidad: '%',
    icon: ClipboardCheck,
    color: 'text-amber-600',
    detalle: (d) => `Media de ${d?.pdioic?.n_jornadas ?? 0} días · NIOC ${d?.pdioic?.nioc ?? 0}`,
  },
];


const formatoValor = (valor, unidad) =>
  valor === null || valor === undefined ? '—' : `${valor}${unidad === '%' ? '%' : ''}`;

const formatoFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const VentanaCard = ({ etiqueta, ventana, muestra }) => {
  if (!ventana && !muestra) return null;
  const esperadas = muestra?.jornadasEsperadas ?? ventana?.jornadasEsperadas ?? 20;
  const disponibles = muestra?.jornadasDisponibles ?? ventana?.jornadasDisponibles ?? 0;
  const faltantes = Math.max(0, esperadas - disponibles);
  const completa = disponibles === esperadas;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{etiqueta}</p>
          <p className="text-xs text-slate-500">
            {ventana?.anexo} · {formatoFecha(ventana?.desde)} — {formatoFecha(ventana?.hasta)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            completa ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {completa ? 'Completo' : `Faltan ${faltantes}`}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{ventana?.fuente}</p>
      {faltantes > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
          Se encontraron {disponibles} de {esperadas} jornadas operativas requeridas.
        </p>
      )}
    </div>
  );
};

const MedicionPage = () => {
  const [medicion, setMedicion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(null);

  useEffect(() => {
    api
      .get('/observacion/medicion')
      .then((r) => setMedicion(r.data.data))
      .catch(() => toastError('Error', 'No se pudo cargar la medición de investigación'))
      .finally(() => setLoading(false));
  }, []);

  const exportarFicha = async (dimension) => {
    setExportando(dimension);
    try {
      const { data } = await api.get(`/observacion/ficha/${dimension}/export`);
      const payload = data.data || {};
      await exportFichaExcel({
        titulo: payload.titulo,
        indicador: payload.indicador,
        dimension: payload.dimension ?? dimension,
        headers: payload.headers || [],
        filas: payload.filas || [],
        indicadores: payload.indicadores || {},
      });
      toastSuccess('Ficha exportada', `Dimensión ${dimension} · ${payload.filas?.length ?? 0} jornadas`);
    } catch {
      toastError('Error', 'No se pudo exportar la ficha');
    } finally {
      setExportando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-salazar-200 border-t-salazar-800" />
      </div>
    );
  }

  const muestra = medicion?.muestra;
  const ventanaPos = medicion?.ventanas?.posprueba;
  const posprueba = medicion?.posprueba;

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
        title="Medición de investigación"
        subtitle="TPDRE, PDRE, PDEEA y PDIOIC sobre las 20 jornadas posteriores a la implementación (1–20 set 2026)"
        compact
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
          <span>
            Este módulo solo extrae los indicadores de las jornadas posteriores a la implementación.
            Cada observación es un día (20 jornadas, 1–20 set 2026). Los valores se calculan sobre
            los registros reales ya almacenados. No se modifican datos.
          </span>
        </p>
      </div>

      <VentanaCard etiqueta="Periodo posterior a la implementación" ventana={ventanaPos} muestra={muestra} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatChip
          label="Jornadas requeridas"
          value={muestra?.jornadasEsperadas ?? 20}
          accent="salazar"
        />
        <StatChip
          label="Jornadas disponibles"
          value={muestra?.jornadasDisponibles ?? 0}
          accent={muestra?.completa ? 'green' : 'amber'}
        />
        <StatChip
          label="Estado"
          value={muestra?.completa ? 'Completo' : `Faltan ${muestra?.faltantes ?? 20} jornadas operativas`}
          accent={muestra?.completa ? 'green' : 'amber'}
        />
      </div>

      <div className="table-panel">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">Indicadores por dimensión</h3>
          <p className="text-xs text-slate-500">
            Media de los promedios diarios de las jornadas disponibles (1–20 set 2026)
          </p>
        </div>
        <div className="table-panel-body">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Dimensión / Indicador</th>
                <th className="px-3 py-2.5">Fórmula</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {INDICADORES.map(({ clave, nombre, dimension, descripcion, formula, unidad, icon: Icon, color, detalle }) => {
                const pos = posprueba?.[clave];
                return (
                  <tr key={clave} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                        <div>
                          <p className="font-semibold text-slate-800">{nombre}</p>
                          <p className="text-xs text-slate-500">{dimension}</p>
                          <p className="text-xs text-slate-400">{descripcion}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-600">{formula}</td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-bold tabular-nums text-slate-800">{formatoValor(pos, unidad)}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">{detalle(posprueba?.detalle)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="panel-title">Exportar fichas</h3>
        <p className="mb-3 text-xs text-slate-500">
          Cada Excel incluye las jornadas disponibles (una fila = un día). Solo lectura.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4].map((dim) => (
            <div key={dim} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Dimensión {dim} · {INDICADORES[dim - 1].nombre}
              </p>
              <button
                type="button"
                className="btn-secondary w-full text-xs"
                disabled={exportando === dim}
                onClick={() => exportarFicha(dim)}
              >
                {exportando === dim ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar Excel
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicionPage;
