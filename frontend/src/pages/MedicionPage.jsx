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
  FlaskConical,
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
  { clave: 'preprueba', etiqueta: 'Preprueba' },
  { clave: 'posprueba', etiqueta: 'Posprueba' },
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
  const ventanas = medicion?.ventanas;

  return (
    <div className="page-shell">
      <PageHeader
        title="Medición de investigación"
        subtitle="Indicadores TPRE, PER, PEEA y PIOIC — preprueba y posprueba por separado"
        compact
      />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-salazar-700" />
          <span>
            Los indicadores se calculan sobre la muestra de {muestra?.esperadoPorGrupo} registros
            de preprueba y {muestra?.esperadoPorGrupo} de posprueba ({muestra?.esperadoTotal} en total).
          </span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <VentanaCard etiqueta="Periodo de preprueba" ventana={ventanas?.preprueba} />
        <VentanaCard etiqueta="Periodo de posprueba" ventana={ventanas?.posprueba} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatChip label="Preprueba registrada" value={`${muestra?.registradoPreprueba ?? 0} / ${muestra?.esperadoPorGrupo ?? 50}`} accent="salazar" />
        <StatChip label="Posprueba registrada" value={`${muestra?.registradoPosprueba ?? 0} / ${muestra?.esperadoPorGrupo ?? 50}`} accent="salazar" />
        <StatChip label="Muestra total" value={`${muestra?.registradoTotal ?? 0} / ${muestra?.esperadoTotal ?? 100}`} accent={muestra?.completa ? 'green' : 'slate'} />
      </div>

      {!muestra?.completa && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-start gap-2">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              La preprueba todavía no está cargada. Cuando la suba, los indicadores de ese periodo
              aparecerán aquí para compararlos con la posprueba.
            </span>
          </p>
        </div>
      )}

      <div className="table-panel">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-salazar-900">Resultados por indicador</h3>
          <p className="text-xs text-slate-500">
            Variable dependiente: optimización de operaciones logísticas · 4 dimensiones
          </p>
        </div>
        <div className="table-panel-body">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Dimensión / Indicador</th>
                <th className="px-3 py-2.5">Fórmula</th>
                <th className="px-3 py-2.5 text-right">Preprueba</th>
                <th className="px-3 py-2.5 text-right">Posprueba</th>
                <th className="px-3 py-2.5 text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              {INDICADORES.map(({ clave, nombre, dimension, descripcion, formula, unidad, icon: Icon, color, detalle }) => {
                const pre = medicion?.preprueba?.[clave];
                const pos = medicion?.posprueba?.[clave];
                const variacion =
                  pre === undefined || pos === undefined ? null : Math.round((pos - pre) * 100) / 100;
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
                      <p className="font-bold tabular-nums text-slate-800">{formatoValor(pre, unidad)}</p>
                      <p className="text-[11px] text-slate-400">{detalle(medicion?.preprueba?.detalle)}</p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-bold tabular-nums text-slate-800">{formatoValor(pos, unidad)}</p>
                      <p className="text-[11px] text-slate-400">{detalle(medicion?.posprueba?.detalle)}</p>
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-slate-600">
                      {variacion === null ? '—' : `${variacion > 0 ? '+' : ''}${variacion}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="panel-title">Exportar fichas de observación por grupo</h3>
        <p className="mb-3 text-xs text-slate-500">
          Cada ficha exporta únicamente los registros de la muestra del grupo seleccionado.
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
