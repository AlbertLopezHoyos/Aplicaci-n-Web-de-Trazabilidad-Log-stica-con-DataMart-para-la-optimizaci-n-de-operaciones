/**
 * Reglas únicas de cálculo de los indicadores de la investigación.
 *
 * Variable dependiente: "Optimización de operaciones logísticas".
 * Unidad de análisis: jornada operativa. El software trabaja únicamente
 * con jornadas posteriores a la implementación. Una fila de ficha = un día.
 * Los datos ya existen; el módulo de investigación solo lee y calcula.
 *
 *  D1 Eficiencia operativa            → TPDRE  = ΣTRE / NERD
 *  D2 Calidad de la información       → PDRE   = (RCE / TRD) × 100
 *  D3 Control y seguimiento           → PDEEA  = (EEA / TED) × 100
 *  D4 Gestión de la información       → PDIOIC = (NIOC / TID) × 100
 *     Si TID = 0, la ficha muestra N/A (no 0 %).
 *
 * Este módulo es la ÚNICA fuente de verdad de los criterios. Cualquier
 * consulta SQL, servicio o reporte debe reutilizarlo para no producir
 * cifras distintas en pantallas diferentes.
 */

const ORIGEN_DATO = Object.freeze({
  REAL: 'REAL',
  SINTETICO: 'SINTETICO',
});

const GRUPO_MUESTRA = Object.freeze({
  PREPRUEBA: 'PREPRUEBA',
  POSPRUEBA: 'POSPRUEBA',
  NO_MUESTRA: 'NO_MUESTRA',
});

/**
 * Valores históricos de `grupo_muestra`. El software de fichas no gestiona la preprueba;
 * la columna se conserva por compatibilidad con scripts históricos.
 */
const GRUPOS_MUESTRA_VALIDOS = [GRUPO_MUESTRA.PREPRUEBA, GRUPO_MUESTRA.POSPRUEBA];

/**
 * Compatibilidad con scripts históricos. No representa la metodología actual
 * de las fichas de investigación (una fila = una jornada; volumen variable).
 */
const TAMANIO_GRUPO_MUESTRA = 50;

/**
 * Compatibilidad con scripts históricos de captura. No limita las fichas actuales:
 * el módulo de investigación lee todos los registros reales de cada jornada.
 */
const limiteFichaGrupo = (_grupo) => TAMANIO_GRUPO_MUESTRA;

/**
 * Periodos de observación declarados en los instrumentos de la tesis.
 * Las fichas leen jornadas operativas con envíos reales dentro de la ventana.
 * Operaciones reales posteriores al periodo no invalidan el postest.
 */
const VENTANAS_MEDICION = Object.freeze({
  [GRUPO_MUESTRA.PREPRUEBA]: Object.freeze({
    desde: '2026-08-01',
    hasta: '2026-08-31',
    anexo: 'Anexo 2',
    fuente: 'Registros manuales de la empresa, previos a la implementación.',
  }),
  [GRUPO_MUESTRA.POSPRUEBA]: Object.freeze({
    desde: '2026-09-01',
    hasta: '2026-09-20',
    anexo: 'Anexo 3',
    fuente: 'Registros capturados desde la aplicación web.',
  }),
});

/** Último día hábil de captura posprueba (20-set-2026 es domingo, no laborable). */
const ULTIMO_DIA_CAPTURA_POSPRUEBA = '2026-09-19';

const DOMINGOS_POSPRUEBA = Object.freeze(['2026-09-06', '2026-09-13', '2026-09-20']);

const esDomingoISO = (fechaISO) => new Date(`${fechaISO}T12:00:00`).getDay() === 0;

const esDiaLaborablePosprueba = (fechaISO) => {
  const iso = aFechaISO(fechaISO);
  if (!iso) return false;
  if (DOMINGOS_POSPRUEBA.includes(iso)) return false;
  return !esDomingoISO(iso);
};

const listarDiasLaborablesPosprueba = (desde, hasta) => {
  const inicio = aFechaISO(desde);
  const fin = aFechaISO(hasta);
  if (!inicio || !fin || inicio > fin) return [];
  const dias = [];
  const cursor = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fin}T12:00:00`);
  while (cursor <= end) {
    const iso = aFechaISO(cursor);
    if (esDiaLaborablePosprueba(iso)) dias.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

/** Reasigna domingos al día hábil anterior inmediato dentro de la ventana. */
const fechaLaborableSustituto = (fechaISO) => {
  const iso = aFechaISO(fechaISO);
  if (!iso || esDiaLaborablePosprueba(iso)) return iso;
  const mapa = Object.freeze({
    '2026-09-06': '2026-09-05',
    '2026-09-13': '2026-09-12',
    '2026-09-20': '2026-09-19',
  });
  if (mapa[iso]) return mapa[iso];
  let cursor = new Date(`${iso}T12:00:00`);
  for (let i = 0; i < 7; i += 1) {
    cursor.setDate(cursor.getDate() - 1);
    const candidato = aFechaISO(cursor);
    if (esDiaLaborablePosprueba(candidato)) return candidato;
  }
  return iso;
};

const ventanaDeGrupo = (grupo) => VENTANAS_MEDICION[String(grupo || '').toUpperCase()] || null;

/** Ventana del instrumento para fichas (sin recortar por días ya capturados). */
const ventanaFichaGrupo = (grupo) => ventanaDeGrupo(grupo);

/**
 * Último día con captura operativa (incluye el día de referencia), acotado al 19-set-2026.
 * Domingo 20-set queda fuera. La ventana formal del instrumento sigue al 20-set.
 */
const capturaHastaPosprueba = (referencia = new Date()) => {
  const ventana = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA];
  const topeCaptura = ULTIMO_DIA_CAPTURA_POSPRUEBA < ventana.hasta
    ? ULTIMO_DIA_CAPTURA_POSPRUEBA
    : ventana.hasta;
  const isoHoy = aFechaISO(referencia);
  if (isoHoy < ventana.desde) return ventana.desde;
  let iso = isoHoy > topeCaptura ? topeCaptura : isoHoy;
  if (iso < ventana.desde) iso = ventana.desde;
  if (!esDiaLaborablePosprueba(iso)) iso = fechaLaborableSustituto(iso);
  return iso;
};

/**
 * Compatibilidad con scripts históricos de captura. No determina el NERD de las fichas.
 */
const tamanioPoolPosprueba = (capturaHasta = capturaHastaPosprueba()) => {
  const ventana = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA];
  const diasLaborables = listarDiasLaborablesPosprueba(ventana.desde, capturaHasta).length;
  const base = listarDiasLaborablesPosprueba('2026-09-01', '2026-09-11').length || 10;
  return Math.max(TAMANIO_GRUPO_MUESTRA + 10, Math.round((86 / base) * Math.max(1, diasLaborables)));
};

/**
 * Compatibilidad con scripts históricos. No representa un sorteo de fichas:
 * las fichas actuales no seleccionan un subconjunto fijo de envíos.
 */
const POSPRUEBA_POOL = Object.freeze({
  get tamanio() {
    return tamanioPoolPosprueba();
  },
});

/** Normaliza Date | string | DATEONLY a 'YYYY-MM-DD' en hora local. */
const aFechaISO = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, '0');
    const d = String(valor.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const texto = String(valor).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null;
};

/** ¿La fecha de registro cae dentro de la ventana declarada para ese grupo? */
const estaEnVentana = (grupo, fecha) => {
  const ventana = ventanaDeGrupo(grupo);
  const iso = aFechaISO(fecha);
  if (!ventana || !iso) return false;
  return iso >= ventana.desde && iso <= ventana.hasta;
};

/**
 * Campos que determinan que una incidencia operativa está COMPLETA (PDIOIC).
 * Se corresponden uno a uno con columnas reales de la tabla `incidencias`.
 */
const CAMPOS_INCIDENCIA_COMPLETA = Object.freeze([
  'tipo',
  'area',
  'titulo',
  'descripcion',
  'fuente_principal',
]);

const tieneValor = (valor) => {
  if (valor === null || valor === undefined) return false;
  return String(valor).trim().length > 0;
};

/**
 * PDIOIC — criterio de "información completa" de una incidencia.
 * Una incidencia está completa cuando todos los campos de
 * CAMPOS_INCIDENCIA_COMPLETA tienen contenido no vacío.
 */
const esIncidenciaCompleta = (incidencia) => {
  if (!incidencia) return false;
  const data = typeof incidencia.get === 'function' ? incidencia.get({ plain: true }) : incidencia;
  return CAMPOS_INCIDENCIA_COMPLETA.every((campo) => tieneValor(data[campo]));
};

/** Devuelve los campos obligatorios que faltan en la incidencia. */
const camposFaltantesIncidencia = (incidencia) => {
  if (!incidencia) return [...CAMPOS_INCIDENCIA_COMPLETA];
  const data = typeof incidencia.get === 'function' ? incidencia.get({ plain: true }) : incidencia;
  return CAMPOS_INCIDENCIA_COMPLETA.filter((campo) => !tieneValor(data[campo]));
};

/**
 * PDRE — criterio de "registro con error".
 * Un envío se considera erróneo si la validación del formulario lo marcó como
 * incorrecto (`registro_correcto = 0`) o si tiene al menos un error asociado
 * en `errores_registro`. Un envío con varios errores cuenta UNA sola vez.
 */
const esRegistroConError = (envio) => {
  if (!envio) return false;
  const data = typeof envio.get === 'function' ? envio.get({ plain: true }) : envio;
  const marcadoIncorrecto = data.registro_correcto === false || data.registro_correcto === 0;
  const erroresAsociados = Number(data.total_errores ?? data.erroresRegistro?.length ?? 0);
  return marcadoIncorrecto || erroresAsociados > 0;
};

/**
 * PDEEA — criterio de "estado actualizado".
 * El estado del envío está actualizado cuando el `id_estado_actual` coincide
 * con el estado del último movimiento de `historial_estados`. Un envío sin
 * historial no puede considerarse actualizado.
 */
const tieneEstadoActualizado = (envio) => {
  if (!envio) return false;
  const data = typeof envio.get === 'function' ? envio.get({ plain: true }) : envio;
  if (data.id_ultimo_estado_historial === null || data.id_ultimo_estado_historial === undefined) return false;
  return Number(data.id_ultimo_estado_historial) === Number(data.id_estado_actual);
};

const redondear = (valor, decimales = 2) => {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) || 0) * factor) / factor;
};

/** TPDRE = ΣTRE / NERD (minutos). Ignora envíos sin tiempo registrado. */
const calcularTPDRE = (tiemposEnMinutos = []) => {
  const validos = tiemposEnMinutos
    .filter((t) => t !== null && t !== undefined && String(t).trim() !== '')
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t) && t >= 0);
  if (!validos.length) return { valor: 0, numerador: 0, denominador: 0 };
  const suma = validos.reduce((acc, t) => acc + t, 0);
  return { valor: redondear(suma / validos.length), numerador: redondear(suma), denominador: validos.length };
};

/**
 * Porcentaje genérico usado por PDRE, PDEEA y PDIOIC.
 * Si el denominador es 0 devuelve 0 por compatibilidad numérica; las fichas
 * muestran N/A cuando TID = 0 (observacion.service.js).
 */
const calcularPorcentaje = (numerador, denominador) => {
  const n = Number(numerador) || 0;
  const d = Number(denominador) || 0;
  return { valor: d ? redondear((n / d) * 100) : 0, numerador: n, denominador: d };
};

const calcularPDRE = (registrosConError, totalRegistros) =>
  calcularPorcentaje(registrosConError, totalRegistros);

const calcularPDEEA = (enviosActualizados, totalEnvios) =>
  calcularPorcentaje(enviosActualizados, totalEnvios);

const calcularPDIOIC = (incidenciasCompletas, totalIncidencias) =>
  calcularPorcentaje(incidenciasCompletas, totalIncidencias);

/** Alias internos para scripts y pruebas históricas. No son la nomenclatura oficial. */
const calcularTPRE = calcularTPDRE;
const calcularPER = calcularPDRE;
const calcularPEEA = calcularPDEEA;
const calcularPIOIC = calcularPDIOIC;

module.exports = {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  GRUPOS_MUESTRA_VALIDOS,
  TAMANIO_GRUPO_MUESTRA,
  POSPRUEBA_POOL,
  limiteFichaGrupo,
  ventanaFichaGrupo,
  capturaHastaPosprueba,
  ULTIMO_DIA_CAPTURA_POSPRUEBA,
  DOMINGOS_POSPRUEBA,
  esDiaLaborablePosprueba,
  listarDiasLaborablesPosprueba,
  fechaLaborableSustituto,
  VENTANAS_MEDICION,
  ventanaDeGrupo,
  estaEnVentana,
  aFechaISO,
  CAMPOS_INCIDENCIA_COMPLETA,
  esIncidenciaCompleta,
  camposFaltantesIncidencia,
  esRegistroConError,
  tieneEstadoActualizado,
  calcularTPDRE,
  calcularPDRE,
  calcularPDEEA,
  calcularPDIOIC,
  calcularTPRE,
  calcularPER,
  calcularPEEA,
  calcularPIOIC,
  calcularPorcentaje,
  redondear,
};
