const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { sequelize, Envio, Incidencia, Cliente, EstadoEnvio, Usuario, HistorialEstado } = require('../models');
const { QueryTypes } = require('sequelize');
const { generarCodigoEnvio } = require('../utils/codigoEnvio');
const { generarDestinatarioAleatorio } = require('../utils/destinatario');
const { DESTINOS_PERU, calcularTotalEnvio } = require('../../database/seeders/bulk-data');
const {
  ORIGEN_ENVIO_FIJO,
  TIPOS_CARGA_OPERATIVOS,
  pick,
  especificacionAleatoria,
} = require('../utils/tiposCarga');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  GRUPOS_MUESTRA_VALIDOS,
  TAMANIO_GRUPO_MUESTRA,
  POSPRUEBA_POOL,
  limiteFichaGrupo,
  ventanaFichaGrupo,
  capturaHastaPosprueba,
  CAMPOS_INCIDENCIA_COMPLETA,
  VENTANAS_MEDICION,
  aFechaISO,
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
      'fecha',
      'codigo_incidencia',
      'tipo_incidencia',
      'area',
      'codigo_envio',
      'estado_incidencia',
      'titulo',
      'descripcion',
      'informacion_completa',
      'fuente_principal',
      'observacion',
    ],
    labels: [
      'Fecha',
      'Código incidencia',
      'Tipo incidencia',
      'Área',
      'Código envío',
      'Estado incidencia',
      'Título',
      'Descripción',
      'Información completa (Sí/No)',
      'Fuente principal de información',
      'Observación',
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
const filtroMuestra = (alias, { alcance, grupo, enVentana = false } = {}) => {
  const modo = normalizarAlcance(alcance);
  if (modo === ALCANCE.TODOS) return { sql: '1 = 1', replacements: {} };
  const grupoNormalizado = normalizarGrupo(grupo);
  const grupos = grupoNormalizado ? [grupoNormalizado] : GRUPOS_MUESTRA_VALIDOS;
  const replacements = { origenReal: ORIGEN_DATO.REAL, gruposMuestra: grupos };
  let sql = `${alias}.origen_dato = :origenReal AND ${alias}.grupo_muestra IN (:gruposMuestra)`;
  if (enVentana && grupoNormalizado) {
    const ventana = ventanaFichaGrupo(grupoNormalizado);
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
    SELECT h.id_envio, h.id_estado, h.fecha_hora, h.id_usuario
    FROM historial_estados h
    JOIN (
      SELECT id_envio, MAX(id_historial) AS id_historial
      FROM historial_estados GROUP BY id_envio
    ) m ON m.id_historial = h.id_historial
  ) ult ON ult.id_envio = e.id_envio`;

const ordenFicha = (grupo) =>
  normalizarGrupo(grupo) === GRUPO_MUESTRA.POSPRUEBA
    ? 'ORDER BY RAND()'
    : 'ORDER BY e.fecha_registro ASC, e.id_envio ASC';

const sqlFicha = (dimension, filtro, grupo) => {
  const orden = ordenFicha(grupo);
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
            ${orden}`;
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
            ${orden}`;
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
            ${orden}`;
  }
  const ordenInc = normalizarGrupo(grupo) === GRUPO_MUESTRA.POSPRUEBA
    ? 'ORDER BY RAND()'
    : 'ORDER BY e.fecha_registro ASC, i.id_incidencia ASC';
  return `SELECT DATE(i.fecha_reporte) AS fecha, i.codigo_incidencia,
                 i.tipo AS tipo_incidencia, i.area, e.codigo_envio,
                 i.estado_incidencia, i.titulo, i.descripcion,
                 IF(${SQL_INCIDENCIA_COMPLETA}, 'Sí', 'No') AS informacion_completa,
                 i.fuente_principal, i.observacion
          FROM incidencias i
          JOIN envios e ON e.id_envio = i.id_envio
          WHERE e.activo = 1 AND ${filtro.sql}
          ${ordenInc}`;
};

const getDatosDimension = async (dimension, { limit = null, alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  const grupoNormalizado = normalizarGrupo(grupo);
  const filtro = filtroMuestra('e', { alcance, grupo, enVentana: true });
  let sql = sqlFicha(dimension, filtro, grupoNormalizado);
  const limiteGrupo = limiteFichaGrupo(grupoNormalizado);
  const cap = limit ? Math.max(1, Math.min(Number(limit) || limiteGrupo, 500)) : null;
  if (cap) sql += ` LIMIT ${cap}`;
  return sequelize.query(sql, { type: QueryTypes.SELECT, replacements: filtro.replacements });
};

const countDatosDimension = async (dimension, { alcance, grupo } = {}) => {
  const config = DIMENSIONES[dimension];
  if (!config) return 0;
  const filtro = filtroMuestra('e', { alcance, grupo, enVentana: true });
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
 * Cobertura de un grupo respecto al periodo declarado en su ficha: cuántos
 * registros hay, cuántos caen fuera de la ventana y cuántos días quedan.
 */
const getCoberturaVentana = async (grupo) => {
  const ventana = VENTANAS_MEDICION[grupo];
  if (!ventana) return null;

  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN e.fecha_registro BETWEEN :desde AND :hasta THEN 1 ELSE 0 END) AS dentro
     FROM envios e
     WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :grupo`,
    {
      type: QueryTypes.SELECT,
      replacements: { desde: ventana.desde, hasta: ventana.hasta, real: ORIGEN_DATO.REAL, grupo },
    }
  );

  const total = Number(row?.total) || 0;
  const dentro = Number(row?.dentro) || 0;
  const hoy = aFechaISO(new Date());
  const msPorDia = 86400000;
  const diasRestantes = hoy > ventana.hasta
    ? 0
    : Math.round((new Date(`${ventana.hasta}T12:00:00`) - new Date(`${(hoy < ventana.desde ? ventana.desde : hoy)}T12:00:00`)) / msPorDia);

  return {
    ...ventana,
    registrados: total,
    dentroDeVentana: dentro,
    fueraDeVentana: total - dentro,
    faltantes: Math.max(0, TAMANIO_GRUPO_MUESTRA - dentro),
    abierta: hoy <= ventana.hasta,
    diasRestantes,
  };
};

/**
 * Resultado consolidado de la medición de investigación:
 * preprueba (50) y posprueba (50) por separado, nunca mezcladas.
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

  const enPreprueba = Number(cobertura?.preprueba) || 0;
  const enPosprueba = Number(cobertura?.posprueba) || 0;

  const fueraDeVentana = (ventanaPre?.fueraDeVentana || 0) + (ventanaPos?.fueraDeVentana || 0);

  return {
    preprueba,
    posprueba,
    ventanas: { preprueba: ventanaPre, posprueba: ventanaPos },
    muestra: {
      esperadoPorGrupo: TAMANIO_GRUPO_MUESTRA,
      esperadoTotal: TAMANIO_GRUPO_MUESTRA * 2,
      registradoPreprueba: enPreprueba,
      registradoPosprueba: enPosprueba,
      registradoTotal: enPreprueba + enPosprueba,
      fueraDeVentana,
      completa:
        enPreprueba === TAMANIO_GRUPO_MUESTRA
        && enPosprueba === TAMANIO_GRUPO_MUESTRA
        && fueraDeVentana === 0,
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

  const limite = limiteFichaGrupo(grupoNormalizado);
  const [filas, totalBd, indicadores] = await Promise.all([
    getDatosDimension(dimension, { ...opciones, limit: limite }),
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
      per: indicadores.per,
      peea: indicadores.peea,
      pioic: indicadores.pioic,
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

/** Reparte fechas como captura diaria: más carga entre semana, menos domingos. */
const distribuirFechasOperativas = (cantidad, desde, hasta) => {
  const dias = listarDias(desde, hasta);
  if (!dias.length) return [];
  const pesos = dias.map((dia) => {
    const dow = new Date(`${dia}T12:00:00`).getDay();
    if (dow === 0) return 0.35;
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

const generarTiemposRegistro = (fechaISO) => {
  const hora = 8 + Math.floor(Math.random() * 9);
  const minuto = Math.floor(Math.random() * 60);
  const duracion = Math.round((4 + Math.random() * 9.5) * 100) / 100;
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

/**
 * Mantiene un pool de envíos REALES (86 por ahora, 1 set – ayer) y elige 50 al azar
 * para la muestra posprueba de las fichas. Cada clic vuelve a sortear esos 50.
 */
const aleatorizarPosprueba = async () => {
  const ventana = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA];
  const poolObjetivo = POSPRUEBA_POOL.tamanio;
  const muestra = TAMANIO_GRUPO_MUESTRA;
  const capturaHasta = capturaHastaPosprueba();

  const anteriores = await Envio.findAll({
    where: { grupo_muestra: GRUPO_MUESTRA.POSPRUEBA, origen_dato: ORIGEN_DATO.REAL },
    attributes: ['id_envio'],
  });
  const idsAnteriores = anteriores.map((e) => e.id_envio);
  if (idsAnteriores.length) {
    await Envio.update(
      { grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA },
      { where: { id_envio: { [Op.in]: idsAnteriores } } }
    );
    await Incidencia.update(
      { grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA },
      { where: { id_envio: { [Op.in]: idsAnteriores } } }
    );
  }

  let pool = await Envio.findAll({
    where: {
      activo: true,
      origen_dato: ORIGEN_DATO.REAL,
      grupo_muestra: { [Op.ne]: GRUPO_MUESTRA.PREPRUEBA },
      fecha_registro: { [Op.between]: [ventana.desde, capturaHasta] },
    },
  });

  let creados = 0;

  const equipo = await Usuario.findAll({
    where: { activo: true, email: { [Op.in]: EMAILS_EQUIPO_POSPRUEBA } },
  });
  const responsableFallback = await Usuario.findOne({ where: { email: EMAILS_EQUIPO_POSPRUEBA[0] } });
  const responsables = equipo.length ? equipo : responsableFallback ? [responsableFallback] : [];

  if (pool.length < poolObjetivo) {
    const faltan = poolObjetivo - pool.length;
    const clientes = await Cliente.findAll({ where: { activo: true }, limit: 100 });
    const estado = await EstadoEnvio.findOne({ where: { codigo: 'recibido' } });
    if (!clientes.length || !estado || !responsables.length) {
      throw Object.assign(new Error('Faltan clientes, estados o usuarios para completar la muestra posprueba.'), {
        statusCode: 503,
      });
    }

    const fechasNuevas = distribuirFechasOperativas(faltan, ventana.desde, capturaHasta);
    for (let i = 0; i < faltan; i += 1) {
      const cliente = pick(clientes);
      const tipo = pick(TIPOS_CARGA_OPERATIVOS);
      const fecha = fechasNuevas[i];
      const responsable = pick(responsables);
      const tiempos = generarTiemposRegistro(fecha);
      const peso = Math.round((8 + Math.random() * 180) * 10) / 10;
      const paquetes = 1 + Math.floor(Math.random() * 4);
      const codigo = await generarCodigoEnvio();
      const destinatario = generarDestinatarioAleatorio(Date.now() + i);
      const envio = await Envio.create({
        codigo_envio: codigo,
        id_cliente: cliente.id_cliente,
        id_estado_actual: estado.id_estado,
        id_responsable: responsable.id_usuario,
        origen: ORIGEN_ENVIO_FIJO,
        destino: pick(DESTINOS_PERU),
        fecha_registro: fecha,
        fecha_estimada_entrega: sumarDiasISO(fecha, 2 + Math.floor(Math.random() * 4)),
        tipo_carga: tipo,
        peso_kg: peso,
        numero_paquetes: paquetes,
        total_envio: calcularTotalEnvio(peso, paquetes, 'normal'),
        observaciones: especificacionAleatoria(tipo) || null,
        ...destinatario,
        ...tiempos,
        registro_correcto: true,
        origen_dato: ORIGEN_DATO.REAL,
        grupo_muestra: GRUPO_MUESTRA.NO_MUESTRA,
        activo: true,
      });
      await HistorialEstado.create({
        id_envio: envio.id_envio,
        id_estado: estado.id_estado,
        id_usuario: responsable.id_usuario,
        comentario: 'Registro inicial en almacén Lima',
        fecha_hora: tiempos.hora_inicio_registro,
      });
      pool.push(envio);
      creados += 1;
    }
  }

  const seleccion = shuffle(pool).slice(0, muestra);
  if (seleccion.length < muestra) {
    throw Object.assign(
      new Error(`Solo hay ${seleccion.length} envíos reales en el pool; se requieren ${muestra} para la muestra.`),
      { statusCode: 503 }
    );
  }
  const ids = seleccion.map((e) => e.id_envio);
  const fechasAsignadas = distribuirFechasOperativas(seleccion.length, ventana.desde, capturaHasta);

  for (let idx = 0; idx < seleccion.length; idx += 1) {
    const envio = seleccion[idx];
    const tipo = pick(TIPOS_CARGA_OPERATIVOS);
    const fecha = fechasAsignadas[idx];
    const responsable = responsables.length ? pick(responsables) : null;
    const tiempos = generarTiemposRegistro(fecha);
    const spec = especificacionAleatoria(tipo);
    const tipoAnterior = envio.tipo_carga;
    const partes = [];
    if (spec) partes.push(spec);
    if (tipoAnterior && !TIPOS_CARGA_OPERATIVOS.includes(tipoAnterior)) {
      partes.push(`Detalle anterior: ${tipoAnterior}`);
    } else if (envio.observaciones) {
      partes.push(envio.observaciones);
    }

    await envio.update({
      origen: ORIGEN_ENVIO_FIJO,
      tipo_carga: tipo,
      fecha_registro: fecha,
      fecha_estimada_entrega: sumarDiasISO(fecha, 2 + Math.floor(Math.random() * 4)),
      id_responsable: responsable?.id_usuario ?? envio.id_responsable,
      ...tiempos,
      observaciones: partes.join('. ').trim() || null,
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
      origen_dato: ORIGEN_DATO.REAL,
    });

    const ultimoHistorial = await HistorialEstado.findOne({
      where: { id_envio: envio.id_envio },
      order: [['id_historial', 'DESC']],
    });
    if (ultimoHistorial) {
      await ultimoHistorial.update({
        fecha_hora: tiempos.hora_fin_registro,
        id_usuario: responsable?.id_usuario ?? envio.id_responsable,
        comentario: 'Estado confirmado en sistema',
      });
    }
  }

  const incidencias = await Incidencia.findAll({ where: { id_envio: { [Op.in]: ids } } });
  const fechaPorEnvio = Object.fromEntries(seleccion.map((e, i) => [e.id_envio, fechasAsignadas[i]]));
  for (const inc of incidencias) {
    const base = fechaPorEnvio[inc.id_envio];
    const offset = Math.floor(Math.random() * 3);
    const fechaInc = sumarDiasISO(base, offset);
    const hora = 9 + Math.floor(Math.random() * 8);
    await inc.update({
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
      origen_dato: ORIGEN_DATO.REAL,
      fecha_reporte: new Date(`${fechaInc}T${String(hora).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00`),
    });
  }

  return {
    total: seleccion.length,
    muestra,
    poolDisponible: pool.length,
    creados,
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
  FICHA_MUESTRA,
  limiteFichaGrupo,
  POSPRUEBA_POOL,
  capturaHastaPosprueba,
};
