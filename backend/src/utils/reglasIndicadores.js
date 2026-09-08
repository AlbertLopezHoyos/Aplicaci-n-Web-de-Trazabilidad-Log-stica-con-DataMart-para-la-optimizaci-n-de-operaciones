/**
 * Reglas únicas de cálculo de los indicadores de la investigación.
 *
 * Variable dependiente: "Optimización de operaciones logísticas".
 *
 *  D1 Eficiencia operativa            → TPRE  = ΣTRE / NER
 *  D2 Calidad de la información       → PER   = (RCE / TREg) × 100
 *  D3 Control y seguimiento           → PEEA  = (EEA / TEE) × 100
 *  D4 Gestión de la información       → PIOIC = (NIOC / NTIR) × 100
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

/** Grupos que forman parte de la muestra estadística de la tesis. */
const GRUPOS_MUESTRA_VALIDOS = [GRUPO_MUESTRA.PREPRUEBA, GRUPO_MUESTRA.POSPRUEBA];

/** Tamaño esperado de cada grupo (50 preprueba + 50 posprueba = 100). */
const TAMANIO_GRUPO_MUESTRA = 50;

/**
 * Campos que determinan que una incidencia operativa está COMPLETA (PIOIC).
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
 * PIOIC — criterio de "información completa" de una incidencia.
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
 * PER — criterio de "registro con error".
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
 * PEEA — criterio de "estado actualizado".
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

/** TPRE = ΣTRE / NER (minutos). Ignora envíos sin tiempo registrado. */
const calcularTPRE = (tiemposEnMinutos = []) => {
  const validos = tiemposEnMinutos
    .filter((t) => t !== null && t !== undefined && String(t).trim() !== '')
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t) && t >= 0);
  if (!validos.length) return { valor: 0, numerador: 0, denominador: 0 };
  const suma = validos.reduce((acc, t) => acc + t, 0);
  return { valor: redondear(suma / validos.length), numerador: redondear(suma), denominador: validos.length };
};

/** Porcentaje genérico usado por PER, PEEA y PIOIC. */
const calcularPorcentaje = (numerador, denominador) => {
  const n = Number(numerador) || 0;
  const d = Number(denominador) || 0;
  return { valor: d ? redondear((n / d) * 100) : 0, numerador: n, denominador: d };
};

const calcularPER = (registrosConError, totalRegistros) =>
  calcularPorcentaje(registrosConError, totalRegistros);

const calcularPEEA = (enviosActualizados, totalEnvios) =>
  calcularPorcentaje(enviosActualizados, totalEnvios);

const calcularPIOIC = (incidenciasCompletas, totalIncidencias) =>
  calcularPorcentaje(incidenciasCompletas, totalIncidencias);

module.exports = {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  GRUPOS_MUESTRA_VALIDOS,
  TAMANIO_GRUPO_MUESTRA,
  CAMPOS_INCIDENCIA_COMPLETA,
  esIncidenciaCompleta,
  camposFaltantesIncidencia,
  esRegistroConError,
  tieneEstadoActualizado,
  calcularTPRE,
  calcularPER,
  calcularPEEA,
  calcularPIOIC,
  calcularPorcentaje,
  redondear,
};
