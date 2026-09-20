const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  CAMPOS_INCIDENCIA_COMPLETA,
  VENTANAS_MEDICION,
  aFechaISO,
  redondear,
} = require('../utils/reglasIndicadores');

/** Unidad de análisis: una fila = una jornada operativa del postest. */
const JORNADAS_FICHA = 20;
const VALOR_NA = 'N/A';
const FICHA_MUESTRA = JORNADAS_FICHA;
const limiteFichaGrupo = () => JORNADAS_FICHA;

const VENTANA_POSTEST = Object.freeze({
  desde: '2026-09-01',
  hasta: '2026-09-20',
});

const ALCANCE = Object.freeze({
  MUESTRA: 'MUESTRA',
  TODOS: 'TODOS',
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
    columnas: ['fecha', 'trd', 'rce', 'sin_error', 'pdre'],
    labels: [
      'Fecha',
      'Total de registros evaluados (TRD)',
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
    columnas: ['fecha', 'ted', 'eea', 'no_actualizado', 'pdeea'],
    labels: [
      'Fecha',
      'Total de envíos evaluados (TED)',
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
    columnas: ['fecha', 'tid', 'nioc', 'incompletas', 'pdioic'],
    labels: [
      'Fecha',
      'Total de incidencias evaluadas (TID)',
      'Incidencias con información completa (NIOC)',
      'Incidencias con información incompleta',
      'Porcentaje diario de incidencias con información completa (%) (PDIOIC)',
    ],
  },
};

/**
 * Expresión SQL derivada de CAMPOS_INCIDENCIA_COMPLETA para que el criterio
 * PDIOIC en base de datos sea idéntico al de esIncidenciaCompleta() en JS.
 */
const SQL_INCIDENCIA_COMPLETA = CAMPOS_INCIDENCIA_COMPLETA
  .map((campo) => `TRIM(COALESCE(i.\`${campo}\`, '')) <> ''`)
  .join(' AND ');

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

/** 20 jornadas del postest (1–20 set 2026). La preprueba no forma parte del software. */
const jornadasFichaGrupo = () => listarDiasISO(VENTANA_POSTEST.desde, VENTANA_POSTEST.hasta);

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
 * Filtro de solo lectura: registros REALES de la ventana de postest.
 * Excluye SINTETICO y PREPRUEBA. Nunca altera filas.
 * Dimensión 4 agrupa y filtra por DATE(i.fecha_reporte).
 */
const filtroInvestigacion = (dimension) => {
  const replacements = {
    origenReal: ORIGEN_DATO.REAL,
    grupoPre: GRUPO_MUESTRA.PREPRUEBA,
    ventanaDesde: VENTANA_POSTEST.desde,
    ventanaHasta: VENTANA_POSTEST.hasta,
  };
  const base = 'e.origen_dato = :origenReal AND e.grupo_muestra <> :grupoPre';
  if (dimension === 4) {
    return {
      sql: `${base} AND DATE(i.fecha_reporte) BETWEEN :ventanaDesde AND :ventanaHasta`,
      replacements,
    };
  }
  return {
    sql: `${base} AND e.fecha_registro BETWEEN :ventanaDesde AND :ventanaHasta`,
    replacements,
  };
};

/** Alias interno: el módulo ya no acepta alcance TODOS ni grupo PREPRUEBA. */
const filtroMuestra = (_alias, { dimension } = {}) => filtroInvestigacion(dimension);

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
                   COUNT(*) AS trd,
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
                   COUNT(*) AS ted,
                   SUM(CASE WHEN ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual
                            THEN 1 ELSE 0 END) AS eea
            FROM envios e
            ${SQL_ULTIMO_HISTORIAL}
            WHERE e.activo = 1 AND ${filtro.sql}
            GROUP BY DATE(e.fecha_registro)
            ORDER BY DATE(e.fecha_registro) ASC`;
  }
  return `SELECT DATE(i.fecha_reporte) AS fecha,
                 COUNT(*) AS tid,
                 SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS nioc
          FROM incidencias i
          JOIN envios e ON e.id_envio = i.id_envio
          WHERE e.activo = 1 AND ${filtro.sql}
          GROUP BY DATE(i.fecha_reporte)
          ORDER BY DATE(i.fecha_reporte) ASC`;
};

const armarFilaDiaria = (dimension, fechaISO, raw) => {
  const fecha = formatoFechaFicha(fechaISO);
  if (dimension === 1) {
    const nerd = Number(raw?.nerd) || 0;
    const sumaTre = redondear(Number(raw?.suma_tre) || 0);
    return { fecha, nerd, suma_tre: sumaTre, tpdre: valorONa(sumaTre, nerd) };
  }
  if (dimension === 2) {
    const trd = Number(raw?.trd) || 0;
    const rce = Number(raw?.rce) || 0;
    return {
      fecha,
      trd,
      rce,
      sin_error: Math.max(0, trd - rce),
      pdre: valorONa(rce, trd, { porcentaje: true }),
    };
  }
  if (dimension === 3) {
    const ted = Number(raw?.ted) || 0;
    const eea = Number(raw?.eea) || 0;
    return {
      fecha,
      ted,
      eea,
      no_actualizado: Math.max(0, ted - eea),
      pdeea: valorONa(eea, ted, { porcentaje: true }),
    };
  }
  const tid = Number(raw?.tid) || 0;
  const nioc = Number(raw?.nioc) || 0;
  return {
    fecha,
    tid,
    nioc,
    incompletas: Math.max(0, tid - nioc),
    pdioic: valorONa(nioc, tid, { porcentaje: true }),
  };
};

const getDatosDimension = async (dimension) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  const filtro = filtroInvestigacion(dimension);
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
  return jornadasFichaGrupo().map((iso) =>
    armarFilaDiaria(dimension, iso, porFecha.get(iso))
  );
};

const countDatosDimension = async (dimension) => {
  if (!DIMENSIONES[dimension]) return 0;
  return jornadasFichaGrupo().length;
};

const indicadoresDesdeFilas = (diasTpdre, diasPdre, diasPdeea, diasPdioic) => {
  const tpdre = mediaDeRatiosDiarios(diasTpdre, 'suma_tre', 'nerd');
  const pdre = mediaDeRatiosDiarios(diasPdre, 'rce', 'trd', { porcentaje: true });
  const pdeea = mediaDeRatiosDiarios(diasPdeea, 'eea', 'ted', { porcentaje: true });
  const pdioic = mediaDeRatiosDiarios(diasPdioic, 'nioc', 'tid', { porcentaje: true });

  return {
    alcance: ALCANCE.MUESTRA,
    grupo: GRUPO_MUESTRA.POSPRUEBA,
    incluyeDatosSinteticos: false,
    unidadObservacion: 'jornada',
    nJornadas: JORNADAS_FICHA,
    nJornadasConDatos: tpdre.nDias,
    tpdre: tpdre.valor,
    pdre: pdre.valor,
    pdeea: pdeea.valor,
    pdioic: pdioic.valor,
    totalEnvios: pdre.denominador,
    totalIncidencias: pdioic.denominador,
    detalle: {
      tpdre: { suma_tre: tpdre.numerador, nerd: tpdre.denominador, n_jornadas: tpdre.nDias, unidad: 'minutos', media_diaria: true },
      pdre: { rce: pdre.numerador, trd: pdre.denominador, n_jornadas: pdre.nDias, media_diaria: true },
      pdeea: { eea: pdeea.numerador, ted: pdeea.denominador, n_jornadas: pdeea.nDias, media_diaria: true },
      pdioic: { nioc: pdioic.numerador, tid: pdioic.denominador, n_jornadas: pdioic.nDias, media_diaria: true },
    },
  };
};

/**
 * Calcula TPDRE, PDRE, PDEEA y PDIOIC como media de los promedios diarios
 * sobre los registros REALES existentes del postest. Solo lectura.
 */
const calcularIndicadores = async () => {
  const filtroEnvios = filtroInvestigacion(1);
  const filtroIncidencias = filtroInvestigacion(4);

  const diasTpdre = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS nerd,
            COALESCE(SUM(e.tiempo_registro_min), 0) AS suma_tre
     FROM envios e
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );

  const diasPdre = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS trd,
            SUM(CASE WHEN e.registro_correcto = 0
                       OR EXISTS (SELECT 1 FROM errores_registro er WHERE er.id_envio = e.id_envio)
                     THEN 1 ELSE 0 END) AS rce
     FROM envios e
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );

  const diasPdeea = await sequelize.query(
    `SELECT DATE(e.fecha_registro) AS fecha,
            COUNT(*) AS ted,
            SUM(CASE WHEN ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual
                     THEN 1 ELSE 0 END) AS eea
     FROM envios e
     ${SQL_ULTIMO_HISTORIAL}
     WHERE e.activo = 1 AND ${filtroEnvios.sql}
     GROUP BY DATE(e.fecha_registro)`,
    { type: QueryTypes.SELECT, replacements: filtroEnvios.replacements }
  );

  const diasPdioic = await sequelize.query(
    `SELECT DATE(i.fecha_reporte) AS fecha,
            COUNT(*) AS tid,
            SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS nioc
     FROM incidencias i
     JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.activo = 1 AND ${filtroIncidencias.sql}
     GROUP BY DATE(i.fecha_reporte)`,
    { type: QueryTypes.SELECT, replacements: filtroIncidencias.replacements }
  );

  return indicadoresDesdeFilas(diasTpdre, diasPdre, diasPdeea, diasPdioic);
};

const getCoberturaVentana = async () => {
  const ventana = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA] || {
    anexo: 'Anexo 3',
    desde: VENTANA_POSTEST.desde,
    hasta: VENTANA_POSTEST.hasta,
    fuente: 'Registros capturados desde la aplicación web.',
  };
  const desde = VENTANA_POSTEST.desde;
  const hasta = VENTANA_POSTEST.hasta;

  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta THEN 1 ELSE 0 END) AS dentro,
            COUNT(DISTINCT CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta
                                THEN DATE(e.fecha_registro) END) AS dias
     FROM envios e
     WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra <> :pre`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        desde,
        hasta,
        real: ORIGEN_DATO.REAL,
        pre: GRUPO_MUESTRA.PREPRUEBA,
      },
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

/** Medición del postest. La preprueba no se calcula ni se compara en el software. */
const getMedicionInvestigacion = async () => {
  const [posprueba, ventanaPos] = await Promise.all([
    calcularIndicadores(),
    getCoberturaVentana(),
  ]);

  const [cobertura] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN origen_dato = 'SINTETICO' THEN 1 ELSE 0 END) AS sinteticos,
       SUM(CASE WHEN origen_dato = 'REAL' AND grupo_muestra <> 'PREPRUEBA' THEN 1 ELSE 0 END) AS realesPostest,
       COUNT(*) AS total
     FROM envios WHERE activo = 1`,
    { type: QueryTypes.SELECT }
  );

  const jornadasPos = ventanaPos?.jornadasObservadas || 0;

  return {
    posprueba,
    ventanas: { posprueba: ventanaPos },
    muestra: {
      esperadoPorGrupo: JORNADAS_FICHA,
      registradoPosprueba: jornadasPos,
      enviosPosprueba: Number(cobertura?.realesPostest) || 0,
      fueraDeVentana: ventanaPos?.fueraDeVentana || 0,
      completa: jornadasPos === JORNADAS_FICHA && (ventanaPos?.fueraDeVentana || 0) === 0,
      unidadObservacion: 'jornada',
    },
    datosSinteticos: {
      envios: Number(cobertura?.sinteticos) || 0,
      totalEnviosActivos: Number(cobertura?.total) || 0,
      nota: 'Datos sintéticos de prueba técnica del DataMart. No participan en las fichas de investigación.',
    },
  };
};

const buildExportPayload = async (dimension) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });

  const [filas, totalBd, indicadores] = await Promise.all([
    getDatosDimension(dimension),
    countDatosDimension(dimension),
    calcularIndicadores(),
  ]);

  const headers = config.columnas.map((key, i) => ({ key, label: config.labels[i] }));
  return {
    dimension,
    titulo: config.titulo,
    indicador: config.indicador,
    alcance: ALCANCE.MUESTRA,
    grupo: GRUPO_MUESTRA.POSPRUEBA,
    incluyeDatosSinteticos: false,
    headers,
    filas,
    total: totalBd,
    exportados: filas.length,
    limite: JORNADAS_FICHA,
    indicadores: {
      tpdre: indicadores.tpdre,
      pdre: indicadores.pdre,
      pdeea: indicadores.pdeea,
      pdioic: indicadores.pdioic,
    },
  };
};

const exportarExcel = (dimension) => buildExportPayload(dimension);

module.exports = {
  DIMENSIONES,
  ALCANCE,
  VENTANA_POSTEST,
  VALOR_NA,
  getDatosDimension,
  countDatosDimension,
  calcularIndicadores,
  getCoberturaVentana,
  getMedicionInvestigacion,
  exportarExcel,
  buildExportPayload,
  filtroMuestra,
  filtroInvestigacion,
  SQL_INCIDENCIA_COMPLETA,
  JORNADAS_FICHA,
  FICHA_MUESTRA,
  limiteFichaGrupo,
};
