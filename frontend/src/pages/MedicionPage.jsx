import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toastSuccess, toastError } from '../utils/alerts';
import { exportFichaExcel } from '../utils/fichaExport';

const INDICADORES = [
  {
    clave: 'tpre',
    nombre: 'TPRE',
    dimension: 'Eficiencia operativa',
    descripcion: 'Tiempo promedio de registro de envíos',
    formula: 'TPRE = ΣTRE / NER',
    unidad: 'min',
    icon: Timer,
    color: 'text-blue-600',
    detalle: (d) => `ΣTRE ${d?.tpre?.suma_tre ?? 0} min / NER ${d?.tpre?.ner ?? 0}`,
  },
  {
    clave: 'per',
    nombre: 'PER',
    dimension: 'Calidad de la información logística',
    descripcion: 'Porcentaje de errores en los registros',
    formula: 'PER = (RCE / TREg) × 100',
    unidad: '%',
    icon: AlertTriangle,
    color: 'text-red-600',
    detalle: (d) => `RCE ${d?.per?.rce ?? 0} / TREg ${d?.per?.treg ?? 0}`,
  },
  {
    clave: 'peea',
    nombre: 'PEEA',
    dimension: 'Control y seguimiento de envíos',
    descripcion: 'Porcentaje de envíos con estado actualizado',
    formula: 'PEEA = (EEA / TEE) × 100',
    unidad: '%',
    icon: MapPin,
    color: 'text-green-600',
    detalle: (d) => `EEA ${d?.peea?.eea ?? 0} / TEE ${d?.peea?.tee ?? 0}`,
  },
  {
    clave: 'pioic',
    nombre: 'PIOIC',
    dimension: 'Gestión de la información operativa',
    descripcion: 'Porcentaje de incidencias operativas con información completa',
    formula: 'PIOIC = (NIOC / NTIR) × 100',
    unidad: '%',
    icon: ClipboardCheck,
    color: 'text-amber-600',
    detalle: (d) => `NIOC ${d?.pioic?.nioc ?? 0} / NTIR ${d?.pioic?.ntir ?? 0}`,
  },
];

const GRUPOS = [
  { clave: 'posprueba', etiqueta: 'Posprueba (postest)' },
];

const formatoValor = (valor, unidad) =>
  valor === null || valor === undefined ? '—' : `${valor}${unidad === '%' ? '%' : ''}`;

const formatoFecha = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const VentanaCard = ({ etiqueta, ventana }) => {
  if (!ventana) return null;
  const completa = ventana.faltantes === 0 && ventana.fueraDeVentana === 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{etiqueta}</p>
          <p className="text-xs text-slate-500">
            {ventana.anexo} · {formatoFecha(ventana.desde)} — {formatoFecha(ventana.hasta)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            completa ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {ventana.dentroDeVentana} / 50
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{ventana.fuente}</p>
      <div className="mt-2 space-y-1 text-xs">
        {ventana.fueraDeVentana > 0 && (
          <p className="flex items-center gap-1.5 text-red-700">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {ventana.fueraDeVentana} registro(s) marcados fuera del periodo declarado
          </p>
        )}
        {ventana.faltantes > 0 && (
          <p className="flex items-center gap-1.5 text-amber-700">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Faltan {ventana.faltantes} registro(s)
            {ventana.abierta
              ? ` · quedan ${ventana.diasRestantes} día(s) de observación`
              : ' · el periodo de observación ya cerró'}
          </p>
        )}
      </div>
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

  const exportarFicha = async (dimension, grupo) => {
    const clave = `${dimension}-${grupo}`;
    setExportando(clave);
    try {
      const { data } = await api.get(`/observacion/ficha/${dimension}/export`, {
        params: { alcance: 'MUESTRA', grupo: grupo.toUpperCase() },
      });
      const payload = data.data || {};
      await exportFichaExcel({
        titulo: `${payload.titulo} — ${grupo.toUpperCase()}`,
        indicador: payload.indicador,
        dimension: payload.dimension ?? dimension,
        headers: payload.headers || [],
        filas: payload.filas || [],
        indicadores: payload.indicadores || {},
      });
      toastSuccess('Ficha exportada', `Dimensión ${dimension} · ${grupo} · ${payload.filas?.length ?? 0} registros`);
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
      <PageHeader
        title="Medición de investigación"
        subtitle="Postest — TPRE, PER, PEEA y PIOIC sobre 50 envíos reales (1–20 set 2026)"
        compact
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
          <span>
            Este módulo solo extrae los datos del <strong>postest</strong>. No registra envíos, no
            cambia estados y no forma parte del funcionamiento operativo (envíos, seguimiento, incidencias).
            La operación sigue en esos módulos; aquí se miden los 50 registros de posprueba.
          </span>
        </p>
      </div>

      <VentanaCard etiqueta="Periodo de posprueba (postest)" ventana={ventanaPos} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatChip
          label="Registros de postest"
          value={`${muestra?.registradoPosprueba ?? 0} / ${muestra?.esperadoPorGrupo ?? 50}`}
          accent="salazar"
        />
        <StatChip
          label="Dentro de ventana"
          value={ventanaPos?.dentroDeVentana ?? 0}
          accent={ventanaPos?.fueraDeVentana ? 'amber' : 'green'}
        />
        <StatChip
          label="Fuera de ventana"
          value={ventanaPos?.fueraDeVentana ?? 0}
          accent={ventanaPos?.fueraDeVentana ? 'amber' : 'slate'}
        />
      </div>

      <div className="table-panel">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">Indicadores del postest</h3>
          <p className="text-xs text-slate-500">
            Calculados solo sobre envíos REALES de posprueba en la ventana 1–20 set 2026
          </p>
        </div>
        <div className="table-panel-body">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Dimensión / Indicador</th>
                <th className="px-3 py-2.5">Fórmula</th>
                <th className="px-3 py-2.5 text-right">Posprueba (postest)</th>
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
        <h3 className="panel-title">Exportar fichas del postest</h3>
        <p className="mb-3 text-xs text-slate-500">
          Cada Excel incluye únicamente los 50 registros de posprueba. No exporta la operación completa ni datos sintéticos.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[1, 2, 3, 4].map((dim) => (
            <div key={dim} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Dimensión {dim} · {INDICADORES[dim - 1].nombre}
              </p>
              <div className="flex gap-2">
                {GRUPOS.map(({ clave, etiqueta }) => (
                  <button
                    key={clave}
                    type="button"
                    className="btn-secondary flex-1 text-xs"
                    disabled={exportando === `${dim}-${clave}`}
                    onClick={() => exportarFicha(dim, clave)}
                  >
                    {exportando === `${dim}-${clave}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicionPage;
