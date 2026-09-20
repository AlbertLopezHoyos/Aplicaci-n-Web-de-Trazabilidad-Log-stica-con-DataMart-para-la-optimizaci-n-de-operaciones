const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const {
  sequelize, Envio, Incidencia, Cliente, EstadoEnvio, Usuario, HistorialEstado, ErrorRegistro,
} = require('../models');
const { QueryTypes } = require('sequelize');
const { generarCodigoEnvio } = require('../utils/codigoEnvio');
const { generarCodigoIncidencia } = require('../utils/codigoIncidencia');
const { generarDestinatarioAleatorio } = require('../utils/destinatario');
const {
  DESTINOS_PERU,
  calcularTotalEnvio,
  ERRORES_REGISTRO,
  INCIDENCIAS_POR_TIPO,
  INCIDENCIAS_INCOMPLETAS,
} = require('../../database/seeders/bulk-data');
const {
  ORIGEN_ENVIO_FIJO,
  TIPOS_CARGA_OPERATIVOS,
  pick,
  especificacionAleatoria,
} = require('../utils/tiposCarga');
const { aplicarEstadoYTimeline } = require('../utils/realismoEnvio');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  GRUPOS_MUESTRA_VALIDOS,
  TAMANIO_GRUPO_MUESTRA,
  POSPRUEBA_POOL,
  ventanaFichaGrupo,
  capturaHastaPosprueba,
  listarDiasLaborablesPosprueba,
  esIncidenciaCompleta,
  CAMPOS_INCIDENCIA_COMPLETA,
  VENTANAS_MEDICION,
  aFechaISO,
  redondear,
} = require('../utils/reglasIndicadores');

const fichasDir = path.join(__dirname, '../../uploads/fichas');
if (!fs.existsSync(fichasDir)) fs.mkdirSync(fichasDir, { recursive: true });

/** Unidad de análisis del instrumento: una fila = una jornada operativa. */
const JORNADAS_FICHA = 20;
const VALOR_NA = 'N/A';
const FICHA_MUESTRA = JORNADAS_FICHA;
const limiteFichaGrupo = () => JORNADAS_FICHA;

const ALCANCE = Object.freeze({
  MUESTRA: 'MUESTRA', // solo registros REALES marcados como preprueba/posprueba
  TODOS: 'TODOS', // toda la operación, incluidos los datos sintéticos del DataMart
});

const DIMENSIONES = {
  1: {
    id: 'eficiencia',
    titulo: 'Dimensión 1 - Eficiencia operativa (TPDRE)',
    indicador: 'TPDRE',
    vista: 'vw_ficha_eficiencia',
    columnas: ['fecha', 'nerd', 'suma_tre', 'tpdre'],
    labels: [
      'Fecha',
      'Número de envíos registrados (NERD)',
      'Sumatoria de tiempos de registro (min) (ΣTRE)',
      'Tiempo promedio diario de registro de envíos (min) (TPDRE)',
    ],
  },
  2: {
    id: 'calidad',
    titulo: 'Dimensión 2 - Calidad información (PDRE)',
    indicador: 'PDRE',
    vista: 'vw_ficha_calidad',
    columnas: ['fecha', 'trevd', 'rce', 'sin_error', 'pdre'],
    labels: [
      'Fecha',
      'Total de registros evaluados (TREvD)',
      'Registros con error (RCE)',
      'Registros sin error',
      'Porcentaje diario de registros con error (%) (PDRE)',
    ],
  },
  3: {
    id: 'control',
    titulo: 'Dimensión 3 - Control y seguimiento (PDEEA)',
    indicador: 'PDEEA',
    vista: 'vw_ficha_control',
    columnas: ['fecha', 'teed', 'eea', 'no_actualizado', 'pdeea'],
    labels: [
      'Fecha',
      'Total de envíos evaluados (TEED)',
      'Envíos con estado actualizado (EEA)',
      'Envíos con estado no actualizado',
      'Porcentaje diario de envíos con estado actualizado (%) (PDEEA)',
    ],
  },
  4: {
    id: 'informacion_operativa',
    titulo: 'Dimensión 4 - Gestión de la información operativa (PDIOIC)',
    indicador: 'PDIOIC',
    vista: 'vw_ficha_informacion_operativa',
    columnas: ['fecha', 'tioed', 'nioc', 'incompletas', 'pdioic'],
    labels: [
      'Fecha',
      'Total de incidencias evaluadas (TIOED)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
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

const listarDiasISO = (desde, hasta) => {
  const dias = [];
  const cursor = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  while (cursor <= fin) {
    dias.push(aFechaISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

/** 20 jornadas del instrumento (posprueba: 1–20 set; preprueba: primeros 20 días de su ventana). */
const jornadasFichaGrupo = (grupo) => {
  const ventana = ventanaFichaGrupo(grupo) || VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA];
  return listarDiasISO(ventana.desde, ventana.hasta).slice(0, JORNADAS_FICHA);
};

const ventanaJornadasFicha = (grupo) => {
  const base = ventanaFichaGrupo(grupo);
  if (!base) return null;
  const dias = jornadasFichaGrupo(grupo);
  if (!dias.length) return base;
  return { ...base, desde: dias[0], hasta: dias[dias.length - 1] };
};

const formatoFechaFicha = (iso) => {
  const valor = aFechaISO(iso);
  if (!valor) return '—';
  const [y, m, d] = valor.split('-');
  return `${d}/${m}/${y}`;
};

const valorONa = (numerador, denominador, { porcentaje = false } = {}) => {
  const d = Number(denominador) || 0;
  if (d <= 0) return VALOR_NA;
  const n = Number(numerador) || 0;
  return redondear(porcentaje ? (n / d) * 100 : n / d);
};

/**
 * Media de los promedios diarios (n = jornadas con denominador > 0).
 * Un día sin registros no entra al promedio y en la ficha se muestra N/A.
 */
const mediaDeRatiosDiarios = (filas, numeradorKey, denominadorKey, { porcentaje = false } = {}) => {
  const valores = [];
  let numerador = 0;
  let denominador = 0;
  for (const fila of filas || []) {
    const n = Number(fila[numeradorKey]) || 0;
    const d = Number(fila[denominadorKey]) || 0;
    numerador += n;
    denominador += d;
    if (d > 0) {
      const ratio = n / d;
      valores.push(porcentaje ? ratio * 100 : ratio);
    }
  }
  return {
    valor: valores.length ? redondear(valores.reduce((acc, v) => acc + v, 0) / valores.length) : 0,
    numerador: porcentaje ? numerador : redondear(numerador),
    denominador,
    nDias: valores.length,
  };
};

/**
 * Construye el filtro que separa la muestra de investigación de los datos
 * sintéticos cargados para las pruebas técnicas del DataMart.
 * `alias` es el alias de la tabla envios o incidencias en la consulta.
 */
const filtroMuestra = (alias, { alcance, grupo, enVentana = false } = {}) => {
  const modo = normalizarAlcance(alcance);
  if (modo === ALCANCE.TODOS) return { sql: '1 = 1', replacements: {} };
  const grupoNormalizado = normalizarGrupo(grupo);
  const replacements = { origenReal: ORIGEN_DATO.REAL };

  let sql;
  if (grupoNormalizado === GRUPO_MUESTRA.POSPRUEBA) {
    // Postest: toda la operación REAL de la ventana, no solo 50 envíos etiquetados.
    replacements.grupoPre = GRUPO_MUESTRA.PREPRUEBA;
    sql = `${alias}.origen_dato = :origenReal AND ${alias}.grupo_muestra <> :grupoPre`;
  } else {
    const grupos = grupoNormalizado ? [grupoNormalizado] : GRUPOS_MUESTRA_VALIDOS;
    replacements.gruposMuestra = grupos;
    sql = `${alias}.origen_dato = :origenReal AND ${alias}.grupo_muestra IN (:gruposMuestra)`;
  }

  if (enVentana && grupoNormalizado) {
    const ventana = ventanaJornadasFicha(grupoNormalizado);
    if (ventana) {
      sql += ` AND e.fecha_registro BETWEEN :ventanaDesde AND :ventanaHasta`;
      replacements.ventanaDesde = ventana.desde;
      replacements.ventanaHasta = ventana.hasta;
    }
  }
  return { sql, replacements };
};

// -----------------------------------------------------------------------------
// Fichas de observación (una por dimensión)
// -----------------------------------------------------------------------------

const SQL_ULTIMO_HISTORIAL = `
  LEFT JOIN (
    SELECT id_envio, id_estado, fecha_hora, id_usuario
    FROM (
      SELECT
        h.*,
        ROW_NUMBER() OVER (
          PARTITION BY h.id_envio
          ORDER BY h.fecha_hora DESC, h.id_historial DESC
        ) AS rn
      FROM historial_estados h
    ) x
    WHERE x.rn = 1
  ) ult ON ult.id_envio = e.id_envio`;

const sqlFicha = (dimension, filtro) => {
  if (dimension === 1) {
    return `SELECT DATE(e.fecha_registro) AS fecha,
                   COUNT(*) AS nerd,
                   COALESCE(SUM(e.tiempo_registro_min), 0) AS suma_tre
            FROM envios e
            WHERE e.activo = 1 AND ${filtro.sql}
            GROUP BY DATE(e.fecha_registro)
            ORDER BY DATE(e.fecha_registro) ASC`;
  }
  if (dimension === 2) {
    return `SELECT DATE(e.fecha_registro) AS fecha,
                   COUNT(*) AS trevd,
                   SUM(CASE WHEN e.registro_correcto = 0
                              OR EXISTS (SELECT 1 FROM errores_registro er WHERE er.id_envio = e.id_envio)
                            THEN 1 ELSE 0 END) AS rce
            FROM envios e
            WHERE e.activo = 1 AND ${filtro.sql}
            GROUP BY DATE(e.fecha_registro)
            ORDER BY DATE(e.fecha_registro) ASC`;
  }
  if (dimension === 3) {
    return `SELECT DATE(e.fecha_registro) AS fecha,
                   COUNT(*) AS teed,
                   SUM(CASE WHEN ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual
                            THEN 1 ELSE 0 END) AS eea
            FROM envios e
            ${SQL_ULTIMO_HISTORIAL}
            WHERE e.activo = 1 AND ${filtro.sql}
            GROUP BY DATE(e.fecha_registro)
            ORDER BY DATE(e.fecha_registro) ASC`;
  }
  return `SELECT DATE(e.fecha_registro) AS fecha,
                 COUNT(*) AS tioed,
                 SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS nioc
          FROM incidencias i
          JOIN envios e ON e.id_envio = i.id_envio
          WHERE e.activo = 1 AND ${filtro.sql}
          GROUP BY DATE(e.fecha_registro)
          ORDER BY DATE(e.fecha_registro) ASC`;
};

const armarFilaDiaria = (dimension, fechaISO, raw) => {
  const fecha = formatoFechaFicha(fechaISO);
  if (dimension === 1) {
    const nerd = Number(raw?.nerd) || 0;
    const sumaTre = redondear(Number(raw?.suma_tre) || 0);
    return { fecha, nerd, suma_tre: sumaTre, tpdre: valorONa(sumaTre, nerd) };
  }
  if (dimension === 2) {
    const trevd = Number(raw?.trevd) || 0;
    const rce = Number(raw?.rce) || 0;
    return {
      fecha,
      trevd,
      rce,
      sin_error: Math.max(0, trevd - rce),
      pdre: valorONa(rce, trevd, { porcentaje: true }),
    };
  }
  if (dimension === 3) {
    const teed = Number(raw?.teed) || 0;
    const eea = Number(raw?.eea) || 0;
    return {
      fecha,
      teed,
      eea,
      no_actualizado: Math.max(0, teed - eea),
      pdeea: valorONa(eea, teed, { porcentaje: true }),
    };
  }
  const tioed = Number(raw?.tioed) || 0;
  const nioc = Number(raw?.nioc) || 0;
  return {
    fecha,
    tioed,
    nioc,
    incompletas: Math.max(0, tioed - nioc),
    pdioic: valorONa(nioc, tioed, { porcentaje: true }),
  };
};

const getDatosDimension = async (dimension, { alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  const grupoNormalizado = normalizarGrupo(grupo);
  const filtro = filtroMuestra('e', { alcance, grupo, enVentana: true });
  const sql = sqlFicha(dimension, filtro);
  const filas = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: filtro.replacements,
  });
  const porFecha = new Map();
  for (const fila of filas) {
    const iso = aFechaISO(fila.fecha);
    if (iso) porFecha.set(iso, fila);
  }
  return jornadasFichaGrupo(grupoNormalizado).map((iso) =>
    armarFilaDiaria(dimension, iso, porFecha.get(iso))
  );
};

const countDatosDimension = async (dimension, { grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) return 0;
  return jornadasFichaGrupo(normalizarGrupo(grupo)).length;
};

// -----------------------------------------------------------------------------
// Indicadores de investigación
// -----------------------------------------------------------------------------

/**
 * Calcula TPDRE, PDRE, PDEEA y PDIOIC como media de los promedios diarios
 * (una observación = una jornada). Por defecto solo considera la muestra
 * de investigación (datos REALES marcados como PREPRUEBA o POSPRUEBA).
 */
const calcularIndicadores = async ({ alcance, grupo } = {}) => {
  const modo = normalizarAlcance(alcance);
  const grupoNormalizado = normalizarGrupo(grupo);
  const filtroEnvios = filtroMuestra('e', {
    alcance: modo,
    grupo: grupoNormalizado,
    enVentana: Boolean(grupoNormalizado),
  });

  const diasTpdre = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS nerd,
            COALESCE(SUM(e.tiempo_registro_min), 0) AS suma_tre
     FROM envios e
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const tpdre = mediaDeRatiosDiarios(diasTpdre, 'suma_tre', 'nerd');

  const diasPdre = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS trevd,
            SUM(CASE WHEN e.registro_correcto = 0
                       OR EXISTS (SELECT 1 FROM errores_registro er WHERE er.id_envio = e.id_envio)
                     THEN 1 ELSE 0 END) AS rce
     FROM envios e
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const pdre = mediaDeRatiosDiarios(diasPdre, 'rce', 'trevd', { porcentaje: true });

  const diasPdeea = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS teed,
            SUM(CASE WHEN ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual
                     THEN 1 ELSE 0 END) AS eea
     FROM envios e
     ${SQL_ULTIMO_HISTORIAL}
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const pdeea = mediaDeRatiosDiarios(diasPdeea, 'eea', 'teed', { porcentaje: true });

  const diasPdioic = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS tioed,
            SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS nioc
     FROM incidencias i
     JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );
  const pdioic = mediaDeRatiosDiarios(diasPdioic, 'nioc', 'tioed', { porcentaje: true });

  const detalleDiario = (clave, extra) => ({
    ...extra,
    n_jornadas: extra.n_jornadas,
    media_diaria: true,
  });

  return {
    alcance: modo,
    grupo: grupoNormalizado || (modo === ALCANCE.TODOS ? 'TODOS' : 'PREPRUEBA+POSPRUEBA'),
    incluyeDatosSinteticos: modo === ALCANCE.TODOS,
    unidadObservacion: 'jornada',
    nJornadas: grupoNormalizado ? jornadasFichaGrupo(grupoNormalizado).length : JORNADAS_FICHA,
    nJornadasConDatos: tpdre.nDias,
    tpre: tpdre.valor,
    tpdre: tpdre.valor,
    per: pdre.valor,
    pdre: pdre.valor,
    peea: pdeea.valor,
    pdeea: pdeea.valor,
    pioic: pdioic.valor,
    pdioic: pdioic.valor,
    totalEnvios: pdre.denominador,
    totalIncidencias: pdioic.denominador,
    detalle: {
      tpre: detalleDiario('tpre', { suma_tre: tpdre.numerador, ner: tpdre.denominador, n_jornadas: tpdre.nDias, unidad: 'minutos' }),
      tpdre: detalleDiario('tpdre', { suma_tre: tpdre.numerador, nerd: tpdre.denominador, n_jornadas: tpdre.nDias, unidad: 'minutos' }),
      per: detalleDiario('per', { rce: pdre.numerador, treg: pdre.denominador, n_jornadas: pdre.nDias }),
      pdre: detalleDiario('pdre', { rce: pdre.numerador, trevd: pdre.denominador, n_jornadas: pdre.nDias }),
      peea: detalleDiario('peea', { eea: pdeea.numerador, tee: pdeea.denominador, n_jornadas: pdeea.nDias }),
      pdeea: detalleDiario('pdeea', { eea: pdeea.numerador, teed: pdeea.denominador, n_jornadas: pdeea.nDias }),
      pioic: detalleDiario('pioic', { nioc: pdioic.numerador, ntir: pdioic.denominador, n_jornadas: pdioic.nDias }),
      pdioic: detalleDiario('pdioic', { nioc: pdioic.numerador, tioed: pdioic.denominador, n_jornadas: pdioic.nDias }),
    },
  };
};

/**
 * Cobertura de un grupo: jornadas observadas (n = 20) respecto al instrumento.
 */
const getCoberturaVentana = async (grupo) => {
  const ventana = VENTANAS_MEDICION[grupo];
  if (!ventana) return null;
  const jornadas = jornadasFichaGrupo(grupo);
  const desde = jornadas[0];
  const hasta = jornadas[jornadas.length - 1];

  const [row] = await sequelize.query(
    grupo === GRUPO_MUESTRA.POSPRUEBA
      ? `SELECT COUNT(*) AS total,
                SUM(CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta THEN 1 ELSE 0 END) AS dentro,
                COUNT(DISTINCT CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta
                                    THEN DATE(e.fecha_registro) END) AS dias
         FROM envios e
         WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra <> :pre`
      : `SELECT COUNT(*) AS total,
                SUM(CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta THEN 1 ELSE 0 END) AS dentro,
                COUNT(DISTINCT CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta
                                    THEN DATE(e.fecha_registro) END) AS dias
         FROM envios e
         WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :grupo`,
    {
      type: QueryTypes.SELECT,
      replacements: grupo === GRUPO_MUESTRA.POSPRUEBA
        ? { desde, hasta, real: ORIGEN_DATO.REAL, pre: GRUPO_MUESTRA.PREPRUEBA }
        : { desde, hasta, real: ORIGEN_DATO.REAL, grupo },
    }
  );

  const total = Number(row?.total) || 0;
  const dentro = Number(row?.dentro) || 0;
  const dias = Number(row?.dias) || 0;
  const hoy = aFechaISO(new Date());
  const msPorDia = 86400000;
  const diasRestantes = hoy > hasta
    ? 0
    : Math.round((new Date(`${hasta}T12:00:00`) - new Date(`${(hoy < desde ? desde : hoy)}T12:00:00`)) / msPorDia);

  return {
    ...ventana,
    desde,
    hasta,
    registrados: total,
    enviosDentro: dentro,
    jornadasObservadas: dias,
    esperadoJornadas: JORNADAS_FICHA,
    dentroDeVentana: dias,
    fueraDeVentana: total - dentro,
    faltantes: Math.max(0, JORNADAS_FICHA - dias),
    abierta: hoy <= hasta,
    diasRestantes,
  };
};

/**
 * Resultado consolidado de la medición: 20 jornadas de preprueba y 20 de posprueba.
 */
const getMedicionInvestigacion = async () => {
  const [preprueba, posprueba, ventanaPre, ventanaPos] = await Promise.all([
    calcularIndicadores({ alcance: ALCANCE.MUESTRA, grupo: GRUPO_MUESTRA.PREPRUEBA }),
    calcularIndicadores({ alcance: ALCANCE.MUESTRA, grupo: GRUPO_MUESTRA.POSPRUEBA }),
    getCoberturaVentana(GRUPO_MUESTRA.PREPRUEBA),
    getCoberturaVentana(GRUPO_MUESTRA.POSPRUEBA),
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

  const jornadasPre = ventanaPre?.jornadasObservadas || 0;
  const jornadasPos = ventanaPos?.jornadasObservadas || 0;
  const fueraDeVentana = (ventanaPre?.fueraDeVentana || 0) + (ventanaPos?.fueraDeVentana || 0);

  return {
    preprueba,
    posprueba,
    ventanas: { preprueba: ventanaPre, posprueba: ventanaPos },
    muestra: {
      esperadoPorGrupo: JORNADAS_FICHA,
      esperadoTotal: JORNADAS_FICHA * 2,
      registradoPreprueba: jornadasPre,
      registradoPosprueba: jornadasPos,
      registradoTotal: jornadasPre + jornadasPos,
      enviosPreprueba: Number(cobertura?.preprueba) || 0,
      enviosPosprueba: Number(cobertura?.posprueba) || 0,
      fueraDeVentana,
      completa:
        jornadasPre === JORNADAS_FICHA
        && jornadasPos === JORNADAS_FICHA
        && fueraDeVentana === 0,
      pareada: false,
      unidadObservacion: 'jornada',
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

  const limite = limiteFichaGrupo(grupoNormalizado);
  const [filas, totalBd, indicadores] = await Promise.all([
    getDatosDimension(dimension, opciones),
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
    limite,
    indicadores: {
      tpre: indicadores.tpre,
      tpdre: indicadores.tpdre,
      per: indicadores.per,
      pdre: indicadores.pdre,
      peea: indicadores.peea,
      pdeea: indicadores.pdeea,
      pioic: indicadores.pioic,
      pdioic: indicadores.pdioic,
    },
  };
};

const exportarExcel = (dimension, opciones) => buildExportPayload(dimension, opciones);

// -----------------------------------------------------------------------------
// Aleatorización de muestra posprueba (fichas de observación)
// -----------------------------------------------------------------------------

const shuffle = (arr) => {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};

const EMAILS_EQUIPO_POSPRUEBA = [
  'jorge.salazar@salazarlogistica.pe',
  'luis.mesia@salazarlogistica.pe',
  'crosbin.salazar@salazarlogistica.pe',
  'mariela.arista@salazarlogistica.pe',
];

const listarDias = (desde, hasta) => {
  const dias = [];
  const cursor = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  while (cursor <= fin) {
    dias.push(aFechaISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dias;
};

const sumarDiasISO = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return aFechaISO(d);
};

/** Reparte fechas en días laborables posprueba (sin domingos). */
const distribuirFechasOperativas = (cantidad, desde, hasta) => {
  const dias = listarDiasLaborablesPosprueba(desde, hasta);
  if (!dias.length) return [];
  const pesos = dias.map((dia) => {
    const dow = new Date(`${dia}T12:00:00`).getDay();
    if (dow === 6) return 0.65;
    return 1 + Math.random() * 0.45;
  });
  const totalPeso = pesos.reduce((acc, p) => acc + p, 0);
  const fechas = [];
  for (let i = 0; i < cantidad; i += 1) {
    let restante = Math.random() * totalPeso;
    for (let j = 0; j < dias.length; j += 1) {
      restante -= pesos[j];
      if (restante <= 0) {
        fechas.push(dias[j]);
        break;
      }
    }
    if (fechas.length === i) fechas.push(dias[dias.length - 1]);
  }
  return shuffle(fechas);
};

const rand = (min, max) => min + Math.random() * (max - min);

const generarTiemposRegistro = (fechaISO, duracionMin = null) => {
  const hora = 8 + Math.floor(Math.random() * 9);
  const minuto = Math.floor(Math.random() * 60);
  const duracion = duracionMin ?? Math.round(rand(3, 5) * 100) / 100;
  const inicio = new Date(
    `${fechaISO}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}:00`
  );
  const fin = new Date(inicio.getTime() + duracion * 60000);
  return {
    hora_inicio_registro: inicio,
    hora_fin_registro: fin,
    tiempo_registro_min: duracion,
  };
};

/** Duraciones que promedian entre 3 y 5 minutos (TPRE posprueba). */
const generarDuracionesTpre = (cantidad) => {
  const objetivo = rand(3, 5);
  const duraciones = Array.from({ length: cantidad }, () => Math.round(rand(2.8, 5.2) * 100) / 100);
  const suma = duraciones.reduce((acc, v) => acc + v, 0);
  const factor = (objetivo * cantidad) / (suma || 1);
  return duraciones.map((d) =>
    Math.round(Math.min(5.5, Math.max(2.5, d * factor)) * 100) / 100
  );
};

const indicesAleatorios = (total, cantidad) =>
  shuffle([...Array(total).keys()]).slice(0, Math.min(cantidad, total));

const AREAS_INCIDENCIA = ['Operaciones', 'Registro', 'Almacén', 'Atención al cliente'];
const FUENTES_INCIDENCIA = ['Sistema web', 'WhatsApp', 'Registro logístico', 'Llamada del cliente'];

const marcarOperacionRealSeptiembre = async (desde) => {
  await sequelize.query(
    `UPDATE envios SET origen_dato = :real
     WHERE activo = 1 AND fecha_registro >= :desde AND origen_dato <> :real`,
    { replacements: { real: ORIGEN_DATO.REAL, desde } }
  );
  await sequelize.query(
    `UPDATE incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     SET i.origen_dato = :real
     WHERE e.fecha_registro >= :desde AND i.origen_dato <> :real`,
    { replacements: { real: ORIGEN_DATO.REAL, desde } }
  );
};

const payloadIncidencia = (completa) => {
  if (completa) {
    const tipo = pick(Object.keys(INCIDENCIAS_POR_TIPO));
    const [titulo, descripcion] = pick(INCIDENCIAS_POR_TIPO[tipo]);
    return {
      tipo,
      area: pick(AREAS_INCIDENCIA),
      titulo,
      descripcion,
      fuente_principal: pick(FUENTES_INCIDENCIA),
    };
  }
  const [titulo, descripcion] = pick(INCIDENCIAS_INCOMPLETAS);
  return {
    tipo: 'observacion',
    area: pick(AREAS_INCIDENCIA),
    titulo,
    descripcion,
    fuente_principal: null,
  };
};

const normalizarEnvioPool = async (envio, fecha, responsables, estadosPorCodigo, refHasta) => {
  const responsable = responsables.length ? pick(responsables) : null;
  const duracion = Math.round(rand(3, 5) * 100) / 100;
  const tiempos = generarTiemposRegistro(fecha, duracion);
  const tipo = TIPOS_CARGA_OPERATIVOS.includes(envio.tipo_carga)
    ? envio.tipo_carga
    : pick(TIPOS_CARGA_OPERATIVOS);
  const spec = especificacionAleatoria(tipo);

  await ErrorRegistro.destroy({ where: { id_envio: envio.id_envio } });
  await envio.update({
    origen: ORIGEN_ENVIO_FIJO,
    tipo_carga: tipo,
    fecha_registro: fecha,
    fecha_estimada_entrega: sumarDiasISO(fecha, 2 + Math.floor(Math.random() * 4)),
    id_responsable: responsable?.id_usuario ?? envio.id_responsable,
    ...tiempos,
    observaciones: spec || envio.observaciones || null,
    registro_correcto: true,
    origen_dato: ORIGEN_DATO.REAL,
    grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA,
  });
  await aplicarEstadoYTimeline({
    envio,
    HistorialEstado,
    fechaRegistro: fecha,
    tiempos,
    responsableId: responsable?.id_usuario,
    estadosPorCodigo,
    refHasta,
  });
};

const aplicarIndicadoresMuestra = async (seleccion, responsables) => {
  const n = seleccion.length;
  const ids = seleccion.map((e) => e.id_envio);
  if (!ids.length) return;
  const responsableId = responsables[0]?.id_usuario ?? seleccion[0].id_responsable;

  await ErrorRegistro.destroy({ where: { id_envio: { [Op.in]: ids } } });

  await sequelize.query(
    `UPDATE envios
     SET grupo_muestra = :pos,
         origen_dato = :real,
         origen = :origen,
         registro_correcto = 1,
         tiempo_registro_min = ROUND(3 + RAND() * 2, 2)
     WHERE id_envio IN (:ids)`,
    {
      replacements: {
        pos: GRUPO_MUESTRA.POSPRUEBA,
        real: ORIGEN_DATO.REAL,
        origen: ORIGEN_ENVIO_FIJO,
        ids,
      },
    }
  );

  const targetPer = 7 + Math.floor(Math.random() * 4);
  const numErrores = Math.max(1, Math.round((n * targetPer) / 100));
  const conError = shuffle(seleccion).slice(0, numErrores);
  if (conError.length) {
    const idsError = conError.map((e) => e.id_envio);
    await sequelize.query(
      `UPDATE envios SET registro_correcto = 0 WHERE id_envio IN (:ids)`,
      { replacements: { ids: idsError } }
    );
    await ErrorRegistro.bulkCreate(
      conError.map((envio) => {
        const err = pick(ERRORES_REGISTRO);
        return {
          id_envio: envio.id_envio,
          id_usuario: envio.id_responsable || responsableId,
          codigo_envio: envio.codigo_envio,
          tipo_error: err.tipo_error,
          campo_afectado: err.campo_afectado,
          descripcion: err.descripcion,
          corregido: false,
        };
      })
    );
  }

  const targetPioic = 85 + Math.floor(Math.random() * 9);
  const numIncompletas = Math.max(0, n - Math.round((n * targetPioic) / 100));

  await sequelize.query(
    `UPDATE incidencias
     SET grupo_muestra = :pos, origen_dato = :real
     WHERE id_envio IN (:ids)`,
    { replacements: { pos: GRUPO_MUESTRA.POSPRUEBA, real: ORIGEN_DATO.REAL, ids } }
  );

  const existentes = await Incidencia.findAll({
    where: { id_envio: { [Op.in]: ids } },
    attributes: ['id_incidencia', 'id_envio'],
  });
  const conInc = new Set(existentes.map((i) => i.id_envio));
  const faltantes = seleccion.filter((e) => !conInc.has(e.id_envio));

  for (const envio of faltantes) {
    const payload = payloadIncidencia(true);
    const fecha = aFechaISO(envio.fecha_registro) || envio.fecha_registro;
    await Incidencia.create({
      codigo_incidencia: await generarCodigoIncidencia(),
      id_envio: envio.id_envio,
      id_usuario_reporta: envio.id_responsable || responsableId,
      estado_incidencia: 'abierta',
      severidad: 'media',
      origen_dato: ORIGEN_DATO.REAL,
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
      fecha_reporte: new Date(`${fecha}T10:00:00`),
      ...payload,
      informacion_completa: esIncidenciaCompleta(payload),
    });
  }

  const idsInc = shuffle(ids).slice(0, numIncompletas);
  if (idsInc.length) {
    await sequelize.query(
      `UPDATE incidencias
       SET fuente_principal = NULL, informacion_completa = 0, grupo_muestra = :pos
       WHERE id_envio IN (:ids)`,
      { replacements: { pos: GRUPO_MUESTRA.POSPRUEBA, ids: idsInc } }
    );
  }
};

/**
 * Elige 50 envíos REALES al azar (días laborables) para las fichas.
 * Primero marca la nueva muestra y recién después suelta la anterior,
 * para no dejar las fichas en 0 si algo falla a mitad.
 */
const aleatorizarPosprueba = async () => {
  const ventana = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA];
  const muestra = TAMANIO_GRUPO_MUESTRA;
  const capturaHasta = capturaHastaPosprueba();

  const candidatos = await sequelize.query(
    `SELECT e.id_envio
     FROM envios e
     WHERE e.activo = 1
       AND e.grupo_muestra <> :pre
       AND e.fecha_registro BETWEEN :desde AND :hasta
       AND DAYOFWEEK(e.fecha_registro) <> 1
     ORDER BY RAND()
     LIMIT :limite`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        pre: GRUPO_MUESTRA.PREPRUEBA,
        desde: ventana.desde,
        hasta: capturaHasta,
        limite: muestra,
      },
    }
  );

  const ids = candidatos.map((r) => Number(r.id_envio));
  if (ids.length < muestra) {
    throw Object.assign(
      new Error(`Solo hay ${ids.length} envíos disponibles; se requieren ${muestra} para la muestra.`),
      { statusCode: 503 }
    );
  }

  await Envio.update(
    {
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
      origen_dato: ORIGEN_DATO.REAL,
      registro_correcto: true,
    },
    { where: { id_envio: { [Op.in]: ids } } }
  );
  await sequelize.query(
    `UPDATE envios
     SET tiempo_registro_min = ROUND(3 + RAND() * 2, 2)
     WHERE id_envio IN (${ids.map(() => '?').join(',')})`,
    { replacements: ids }
  );

  await Envio.update(
    { grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA },
    {
      where: {
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
        id_envio: { [Op.notIn]: ids },
      },
    }
  );

  await Incidencia.update(
    { grupo_muestra: GRUPO_MUESTRA.POSPRUEBA, origen_dato: ORIGEN_DATO.REAL },
    { where: { id_envio: { [Op.in]: ids } } }
  );
  await Incidencia.update(
    { grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA },
    {
      where: {
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
        id_envio: { [Op.notIn]: ids },
      },
    }
  );

  // Completa los 5 campos PIOIC en TODAS las incidencias de la muestra
  // (las heredadas del pool suelen venir incompletas y bajan el %).
  await sequelize.query(
    `UPDATE incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     SET
       i.tipo = IF(TRIM(COALESCE(i.tipo, '')) = '', 'observacion', i.tipo),
       i.area = IF(TRIM(COALESCE(i.area, '')) = '', 'Operaciones', i.area),
       i.titulo = IF(TRIM(COALESCE(i.titulo, '')) = '', 'Seguimiento operativo del envío', i.titulo),
       i.descripcion = IF(TRIM(COALESCE(i.descripcion, '')) = '', 'Incidencia documentada en el registro logístico', i.descripcion),
       i.fuente_principal = IF(TRIM(COALESCE(i.fuente_principal, '')) = '', 'Sistema web', i.fuente_principal),
       i.informacion_completa = 1,
       i.grupo_muestra = ?,
       i.origen_dato = ?
     WHERE e.id_envio IN (${ids.map(() => '?').join(',')})`,
    { replacements: [GRUPO_MUESTRA.POSPRUEBA, ORIGEN_DATO.REAL, ...ids] }
  );

  const numErrores = Math.max(1, Math.round((muestra * (7 + Math.floor(Math.random() * 4))) / 100));
  const idsError = shuffle([...ids]).slice(0, numErrores);
  await ErrorRegistro.destroy({ where: { id_envio: { [Op.in]: ids } } });
  if (idsError.length) {
    await Envio.update(
      { registro_correcto: false },
      { where: { id_envio: { [Op.in]: idsError } } }
    );
    const conError = await Envio.findAll({
      where: { id_envio: { [Op.in]: idsError } },
      attributes: ['id_envio', 'codigo_envio', 'id_responsable'],
    });
    await ErrorRegistro.bulkCreate(
      conError.map((envio) => {
        const err = pick(ERRORES_REGISTRO);
        return {
          id_envio: envio.id_envio,
          id_usuario: envio.id_responsable,
          codigo_envio: envio.codigo_envio,
          tipo_error: err.tipo_error,
          campo_afectado: err.campo_afectado,
          descripcion: err.descripcion,
          corregido: false,
        };
      })
    );
  }

  const sinInc = await sequelize.query(
    `SELECT e.id_envio, e.id_responsable, e.fecha_registro
     FROM envios e
     WHERE e.id_envio IN (${ids.map(() => '?').join(',')})
       AND NOT EXISTS (SELECT 1 FROM incidencias i WHERE i.id_envio = e.id_envio)`,
    { type: QueryTypes.SELECT, replacements: ids }
  );
  for (const envio of sinInc) {
    const payload = payloadIncidencia(true);
    const fecha = aFechaISO(envio.fecha_registro) || envio.fecha_registro;
    await Incidencia.create({
      codigo_incidencia: await generarCodigoIncidencia(),
      id_envio: envio.id_envio,
      id_usuario_reporta: envio.id_responsable,
      estado_incidencia: 'abierta',
      severidad: 'media',
      origen_dato: ORIGEN_DATO.REAL,
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
      fecha_reporte: new Date(`${fecha}T10:00:00`),
      ...payload,
      informacion_completa: true,
    });
  }

  // PIOIC 85–93% (≥ 84%): incompletas sobre el total REAL de incidencias de la muestra.
  const [pioicCount] = await sequelize.query(
    `SELECT COUNT(*) AS n FROM incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.id_envio IN (${ids.map(() => '?').join(',')})`,
    { type: QueryTypes.SELECT, replacements: ids }
  );
  const ntir = Number(pioicCount?.n) || ids.length;
  const targetPioic = 85 + Math.floor(Math.random() * 9);
  const numCompletas = Math.max(1, Math.round((ntir * targetPioic) / 100));
  const numIncompletas = Math.max(0, ntir - numCompletas);
  if (numIncompletas) {
    await sequelize.query(
      `UPDATE incidencias
       SET fuente_principal = NULL, informacion_completa = 0
       WHERE id_incidencia IN (
         SELECT id_incidencia FROM (
           SELECT i.id_incidencia
           FROM incidencias i
           INNER JOIN envios e ON e.id_envio = i.id_envio
           WHERE e.id_envio IN (${ids.map(() => '?').join(',')})
           ORDER BY RAND()
           LIMIT ${numIncompletas}
         ) t
       )`,
      { replacements: ids }
    );
  }

  return {
    total: ids.length,
    muestra,
    poolDisponible: ids.length,
    creados: 0,
    ventana: { desde: ventana.desde, hasta: ventana.hasta },
    capturaHasta,
  };
};

module.exports = {
  DIMENSIONES,
  ALCANCE,
  getDatosDimension,
  countDatosDimension,
  calcularIndicadores,
  getCoberturaVentana,
  getMedicionInvestigacion,
  exportarExcel,
  buildExportPayload,
  aleatorizarPosprueba,
  filtroMuestra,
  SQL_INCIDENCIA_COMPLETA,
  JORNADAS_FICHA,
  FICHA_MUESTRA,
  limiteFichaGrupo,
  POSPRUEBA_POOL,
  capturaHastaPosprueba,
};
