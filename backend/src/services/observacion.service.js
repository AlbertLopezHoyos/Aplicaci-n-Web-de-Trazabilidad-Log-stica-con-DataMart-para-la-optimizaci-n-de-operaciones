const path = require('path');
const fs = require('fs');
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  GRUPOS_MUESTRA_VALIDOS,
  TAMANIO_GRUPO_MUESTRA,
  CAMPOS_INCIDENCIA_COMPLETA,
  calcularTPRE,
  calcularPER,
  calcularPEEA,
  calcularPIOIC,
  redondear,
} = require('../utils/reglasIndicadores');

const fichasDir = path.join(__dirname, '../../uploads/fichas');
if (!fs.existsSync(fichasDir)) fs.mkdirSync(fichasDir, { recursive: true });

/** Tamaño de cada grupo de la muestra (50 preprueba + 50 posprueba). */
const FICHA_MUESTRA = TAMANIO_GRUPO_MUESTRA;

const ALCANCE = Object.freeze({
  MUESTRA: 'MUESTRA', // solo registros REALES marcados como preprueba/posprueba
  TODOS: 'TODOS', // toda la operación, incluidos los datos sintéticos del DataMart
});

const DIMENSIONES = {
  1: {
    id: 'eficiencia',
    titulo: 'Dimensión 1 - Eficiencia operativa (TPRE)',
    indicador: 'TPRE',
    vista: 'vw_ficha_eficiencia',
    columnas: [
      'codigo_envio', 'fecha', 'tipo_mercaderia', 'peso_kg', 'numero_paquetes',
      'origen', 'destino', 'hora_inicio', 'hora_fin', 'tiempo_registro_min',
      'usuario_responsable', 'observaciones',
    ],
    labels: [
      'Código envío', 'Fecha', 'Tipo mercadería', 'Peso (kg)', 'Nº paquetes',
      'Origen', 'Destino', 'Hora inicio', 'Hora fin', 'Tiempo registro (min)',
      'Usuario responsable', 'Observaciones',
    ],
  },
  2: {
    id: 'calidad',
    titulo: 'Dimensión 2 - Calidad información (PER)',
    indicador: 'PER',
    vista: 'vw_ficha_calidad',
    columnas: [
      'codigo_envio', 'fecha', 'tipo_mercaderia', 'destino', 'numero_paquetes',
      'error_en_registro', 'tipo_error', 'campo_afectado', 'observaciones',
    ],
    labels: [
      'Código envío', 'Fecha', 'Tipo mercadería', 'Destino', 'Nº paquetes',
      'Error registro (Sí/No)', 'Tipo error', 'Campo afectado', 'Observaciones',
    ],
  },
  3: {
    id: 'control',
    titulo: 'Dimensión 3 - Control y seguimiento (PEEA)',
    indicador: 'PEEA',
    vista: 'vw_ficha_control',
    columnas: [
      'codigo_envio', 'fecha', 'tipo_mercaderia', 'origen', 'destino',
      'estado_actual', 'estado_actualizado', 'fecha_actualizacion',
      'hora_actualizacion', 'responsable_actualizacion', 'observaciones',
    ],
    labels: [
      'Código envío', 'Fecha', 'Tipo mercadería', 'Origen', 'Destino',
      'Estado actual', 'Estado actualizado (Sí/No)', 'Fecha actualización',
      'Hora actualización', 'Responsable', 'Observaciones',
    ],
  },
  4: {
    id: 'informacion_operativa',
    titulo: 'Dimensión 4 - Gestión de la información operativa (PIOIC)',
    indicador: 'PIOIC',
    vista: 'vw_ficha_informacion_operativa',
    columnas: [
      'fecha', 'codigo_incidencia', 'tipo_incidencia', 'area', 'codigo_envio',
      'estado_incidencia', 'informacion_completa', 'fuente_principal', 'observacion',
    ],
    labels: [
      'Fecha', 'Código incidencia', 'Tipo incidencia', 'Área', 'Código envío (si aplica)',
      'Estado incidencia', 'Información completa (Sí/No)', 'Fuente principal de información', 'Observación',
    ],
  },
};

/**
 * Expresión SQL derivada de CAMPOS_INCIDENCIA_COMPLETA para que el criterio
 * PIOIC en base de datos sea idéntico al de esIncidenciaCompleta() en JS.
 */
const SQL_INCIDENCIA_COMPLETA = CAMPOS_INCIDENCIA_COMPLETA
  .map((campo) => `TRIM(COALESCE(i.\`${campo}\`, '')) <> ''`)
  .join(' AND ');

const normalizarAlcance = (alcance) =>
  String(alcance || ALCANCE.MUESTRA).toUpperCase() === ALCANCE.TODOS ? ALCANCE.TODOS : ALCANCE.MUESTRA;

const normalizarGrupo = (grupo) => {
  const valor = String(grupo || '').toUpperCase();
  return GRUPOS_MUESTRA_VALIDOS.includes(valor) ? valor : null;
};

/**
 * Construye el filtro que separa la muestra de investigación de los datos
 * sintéticos cargados para las pruebas técnicas del DataMart.
 * `alias` es el alias de la tabla envios o incidencias en la consulta.
 */
const filtroMuestra = (alias, { alcance, grupo } = {}) => {
  const modo = normalizarAlcance(alcance);
  if (modo === ALCANCE.TODOS) return { sql: '1 = 1', replacements: {} };
  const grupoNormalizado = normalizarGrupo(grupo);
  const grupos = grupoNormalizado ? [grupoNormalizado] : GRUPOS_MUESTRA_VALIDOS;
  return {
    sql: `${alias}.origen_dato = :origenReal AND ${alias}.grupo_muestra IN (:gruposMuestra)`,
    replacements: { origenReal: ORIGEN_DATO.REAL, gruposMuestra: grupos },
  };
};

// -----------------------------------------------------------------------------
// Fichas de observación (una por dimensión)
// -----------------------------------------------------------------------------

const SQL_ULTIMO_HISTORIAL = `
  LEFT JOIN (
    SELECT h.id_envio, h.id_estado, h.fecha_hora, h.id_usuario
    FROM historial_estados h
    JOIN (
      SELECT id_envio, MAX(id_historial) AS id_historial
      FROM historial_estados GROUP BY id_envio
    ) m ON m.id_historial = h.id_historial
  ) ult ON ult.id_envio = e.id_envio`;

const sqlFicha = (dimension, filtro) => {
  if (dimension === 1) {
    return `SELECT e.codigo_envio, e.fecha_registro AS fecha, e.tipo_carga AS tipo_mercaderia,
                   e.peso_kg, e.numero_paquetes, e.origen, e.destino,
                   TIME(e.hora_inicio_registro) AS hora_inicio,
                   TIME(e.hora_fin_registro) AS hora_fin,
                   e.tiempo_registro_min,
                   CONCAT(u.nombres, ' ', u.apellidos) AS usuario_responsable,
                   e.observaciones
            FROM envios e
            LEFT JOIN usuarios u ON e.id_responsable = u.id_usuario
            WHERE e.activo = 1 AND ${filtro.sql}
            ORDER BY e.fecha_registro DESC, e.id_envio DESC`;
  }
  if (dimension === 2) {
    return `SELECT e.codigo_envio, e.fecha_registro AS fecha, e.tipo_carga AS tipo_mercaderia,
                   e.destino, e.numero_paquetes,
                   IF(e.registro_correcto = 0 OR er.total > 0, 'Sí', 'No') AS error_en_registro,
                   COALESCE(er.tipo_error, IF(e.registro_correcto = 0, 'validacion', NULL)) AS tipo_error,
                   er.campo_afectado,
                   e.observaciones
            FROM envios e
            LEFT JOIN (
              SELECT id_envio, COUNT(*) AS total,
                     SUBSTRING_INDEX(GROUP_CONCAT(tipo_error ORDER BY created_at DESC), ',', 1) AS tipo_error,
                     SUBSTRING_INDEX(GROUP_CONCAT(campo_afectado ORDER BY created_at DESC), ',', 1) AS campo_afectado
              FROM errores_registro WHERE id_envio IS NOT NULL GROUP BY id_envio
            ) er ON er.id_envio = e.id_envio
            WHERE e.activo = 1 AND ${filtro.sql}
            ORDER BY e.fecha_registro DESC, e.id_envio DESC`;
  }
  if (dimension === 3) {
    return `SELECT e.codigo_envio, e.fecha_registro AS fecha, e.tipo_carga AS tipo_mercaderia,
                   e.origen, e.destino, s.nombre AS estado_actual,
                   IF(ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual, 'Sí', 'No') AS estado_actualizado,
                   DATE(ult.fecha_hora) AS fecha_actualizacion,
                   TIME(ult.fecha_hora) AS hora_actualizacion,
                   CONCAT(u.nombres, ' ', u.apellidos) AS responsable_actualizacion,
                   e.observaciones
            FROM envios e
            JOIN estados_envio s ON e.id_estado_actual = s.id_estado
            ${SQL_ULTIMO_HISTORIAL}
            LEFT JOIN usuarios u ON ult.id_usuario = u.id_usuario
            WHERE e.activo = 1 AND ${filtro.sql}
            ORDER BY e.fecha_registro DESC, e.id_envio DESC`;
  }
  return `SELECT DATE(i.fecha_reporte) AS fecha, i.codigo_incidencia,
                 i.tipo AS tipo_incidencia, i.area, e.codigo_envio,
                 i.estado_incidencia,
                 IF(${SQL_INCIDENCIA_COMPLETA}, 'Sí', 'No') AS informacion_completa,
                 i.fuente_principal, i.descripcion AS observacion
          FROM incidencias i
          JOIN envios e ON e.id_envio = i.id_envio
          WHERE e.activo = 1 AND ${filtro.sql}
          ORDER BY i.fecha_reporte DESC, i.id_incidencia DESC`;
};

const getDatosDimension = async (dimension, { limit = null, alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  const filtro = filtroMuestra('e', { alcance, grupo });
  let sql = sqlFicha(dimension, filtro);
  const cap = limit ? Math.max(1, Math.min(Number(limit) || FICHA_MUESTRA, 500)) : null;
  if (cap) sql += ` LIMIT ${cap}`;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: filtro.replacements });
};

const countDatosDimension = async (dimension, { alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) return 0;
  const filtro = filtroMuestra('e', { alcance, grupo });
  const tabla = dimension === 4
    ? `FROM incidencias i JOIN envios e ON e.id_envio = i.id_envio WHERE e.activo = 1 AND ${filtro.sql}`
    : `FROM envios e WHERE e.activo = 1 AND ${filtro.sql}`;
  const [row] = await sequelize.query(`SELECT COUNT(*) AS total ${tabla}`, {
    type: QueryTypes.SELECT,
    replacements: filtro.replacements,
  });
  return Number(row?.total) || 0;
};

// -----------------------------------------------------------------------------
// Indicadores de investigación
// -----------------------------------------------------------------------------

/**
 * Calcula TPRE, PER, PEEA y PIOIC sobre un alcance controlado.
 * Por defecto solo considera la muestra de investigación (datos REALES
 * marcados como PREPRUEBA o POSPRUEBA). Los registros sintéticos generados
 * por `db:seed-bulk` quedan excluidos salvo que se pida alcance = TODOS,
 * que existe únicamente para inspección operativa, no para la tesis.
 */
const calcularIndicadores = async ({ alcance, grupo } = {}) => {
  const modo = normalizarAlcance(alcance);
  const grupoNormalizado = normalizarGrupo(grupo);
  const filtroEnvios = filtroMuestra('e', { alcance: modo, grupo: grupoNormalizado });

  // D1 — TPRE = ΣTRE / NER
  const [tpreRow] = await sequelize.query(
    `SELECT COUNT(*) AS ner, COALESCE(SUM(e.tiempo_registro_min), 0) AS suma_tre
     FROM envios e
     WHERE e.activo = 1 AND e.tiempo_registro_min IS NOT NULL AND ${filtroEnvios.sql}`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const ner = Number(tpreRow?.ner) || 0;
  const sumaTre = Number(tpreRow?.suma_tre) || 0;
  const tpre = ner
    ? { valor: redondear(sumaTre / ner), numerador: redondear(sumaTre), denominador: ner }
    : calcularTPRE([]);

  // D2 — PER = (RCE / TREg) × 100
  const [perRow] = await sequelize.query(
    `SELECT COUNT(*) AS treg,
            SUM(CASE WHEN e.registro_correcto = 0
                       OR EXISTS (SELECT 1 FROM errores_registro er WHERE er.id_envio = e.id_envio)
                     THEN 1 ELSE 0 END) AS rce
     FROM envios e
     WHERE e.activo = 1 AND ${filtroEnvios.sql}`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const per = calcularPER(Number(perRow?.rce) || 0, Number(perRow?.treg) || 0);

  // D3 — PEEA = (EEA / TEE) × 100
  const [peeaRow] = await sequelize.query(
    `SELECT COUNT(*) AS tee,
            SUM(CASE WHEN ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual
                     THEN 1 ELSE 0 END) AS eea
     FROM envios e
     ${SQL_ULTIMO_HISTORIAL}
     WHERE e.activo = 1 AND ${filtroEnvios.sql}`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const peea = calcularPEEA(Number(peeaRow?.eea) || 0, Number(peeaRow?.tee) || 0);

  // D4 — PIOIC = (NIOC / NTIR) × 100
  // Denominador: incidencias registradas de los envíos del alcance (NO los envíos).
  const [pioicRow] = await sequelize.query(
    `SELECT COUNT(*) AS ntir,
            SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS nioc
     FROM incidencias i
     JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.activo = 1 AND ${filtroEnvios.sql}`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const pioic = calcularPIOIC(Number(pioicRow?.nioc) || 0, Number(pioicRow?.ntir) || 0);

  const totalEnvios = per.denominador;

  return {
    alcance: modo,
    grupo: grupoNormalizado || (modo === ALCANCE.TODOS ? 'TODOS' : 'PREPRUEBA+POSPRUEBA'),
    incluyeDatosSinteticos: modo === ALCANCE.TODOS,
    tpre: tpre.valor,
    per: per.valor,
    peea: peea.valor,
    pioic: pioic.valor,
    totalEnvios,
    totalIncidencias: pioic.denominador,
    detalle: {
      tpre: { suma_tre: tpre.numerador, ner: tpre.denominador, unidad: 'minutos' },
      per: { rce: per.numerador, treg: per.denominador },
      peea: { eea: peea.numerador, tee: peea.denominador },
      pioic: { nioc: pioic.numerador, ntir: pioic.denominador },
    },
  };
};

/**
 * Resultado consolidado de la medición de investigación:
 * preprueba (50) y posprueba (50) por separado, nunca mezcladas.
 */
const getMedicionInvestigacion = async () => {
  const [preprueba, posprueba] = await Promise.all([
    calcularIndicadores({ alcance: ALCANCE.MUESTRA, grupo: GRUPO_MUESTRA.PREPRUEBA }),
    calcularIndicadores({ alcance: ALCANCE.MUESTRA, grupo: GRUPO_MUESTRA.POSPRUEBA }),
  ]);

  const [cobertura] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN origen_dato = 'REAL' AND grupo_muestra = 'PREPRUEBA' THEN 1 ELSE 0 END) AS preprueba,
       SUM(CASE WHEN origen_dato = 'REAL' AND grupo_muestra = 'POSPRUEBA' THEN 1 ELSE 0 END) AS posprueba,
       SUM(CASE WHEN origen_dato = 'SINTETICO' THEN 1 ELSE 0 END) AS sinteticos,
       COUNT(*) AS total
     FROM envios WHERE activo = 1`,
    { type: QueryTypes.SELECT }
  );

  const enPreprueba = Number(cobertura?.preprueba) || 0;
  const enPosprueba = Number(cobertura?.posprueba) || 0;

  return {
    preprueba,
    posprueba,
    muestra: {
      esperadoPorGrupo: TAMANIO_GRUPO_MUESTRA,
      esperadoTotal: TAMANIO_GRUPO_MUESTRA * 2,
      registradoPreprueba: enPreprueba,
      registradoPosprueba: enPosprueba,
      registradoTotal: enPreprueba + enPosprueba,
      completa: enPreprueba === TAMANIO_GRUPO_MUESTRA && enPosprueba === TAMANIO_GRUPO_MUESTRA,
      pareada: false,
    },
    datosSinteticos: {
      envios: Number(cobertura?.sinteticos) || 0,
      totalEnviosActivos: Number(cobertura?.total) || 0,
      nota: 'Datos sintéticos de prueba técnica del DataMart. No participan en el contraste de hipótesis.',
    },
  };
};

// -----------------------------------------------------------------------------
// Exportación de fichas
// -----------------------------------------------------------------------------

const buildExportPayload = async (dimension, { alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  const modo = normalizarAlcance(alcance);
  const grupoNormalizado = normalizarGrupo(grupo);
  const opciones = { alcance: modo, grupo: grupoNormalizado };

  const [filas, totalBd, indicadores] = await Promise.all([
    getDatosDimension(dimension, { ...opciones, limit: FICHA_MUESTRA }),
    countDatosDimension(dimension, opciones),
    calcularIndicadores(opciones),
  ]);

  const headers = config.columnas.map((key, i) => ({ key, label: config.labels[i] }));
  return {
    dimension,
    titulo: config.titulo,
    indicador: config.indicador,
    alcance: modo,
    grupo: grupoNormalizado,
    incluyeDatosSinteticos: modo === ALCANCE.TODOS,
    headers,
    filas,
    total: totalBd,
    exportados: filas.length,
    limite: FICHA_MUESTRA,
    indicadores: {
      tpre: indicadores.tpre,
      per: indicadores.per,
      peea: indicadores.peea,
      pioic: indicadores.pioic,
    },
  };
};

const exportarExcel = (dimension, opciones) => buildExportPayload(dimension, opciones);

module.exports = {
  DIMENSIONES,
  ALCANCE,
  getDatosDimension,
  countDatosDimension,
  calcularIndicadores,
  getMedicionInvestigacion,
  exportarExcel,
  buildExportPayload,
  filtroMuestra,
  SQL_INCIDENCIA_COMPLETA,
  FICHA_MUESTRA,
};
