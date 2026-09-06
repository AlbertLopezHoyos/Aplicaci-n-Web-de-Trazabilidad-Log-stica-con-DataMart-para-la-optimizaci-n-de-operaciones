const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { sequelize, Envio, Reporte, ErrorRegistro, Incidencia } = require('../models');
const { QueryTypes } = require('sequelize');

const fichasDir = path.join(__dirname, '../../uploads/fichas');
if (!fs.existsSync(fichasDir)) fs.mkdirSync(fichasDir, { recursive: true });

const DIMENSIONES = {
  1: {
    id: 'eficiencia',
    titulo: 'Dimensión 1 - Eficiencia operativa (TPRE)',
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
    titulo: 'Dimensión 4 - Gestión de la información operativa (PICO)',
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

const queryFallback = async (dimension) => {
  if (dimension === 1) {
    const rows = await Envio.findAll({
      where: { activo: true },
      attributes: [
        'codigo_envio', 'fecha_registro', 'tipo_carga', 'peso_kg', 'numero_paquetes',
        'origen', 'destino', 'hora_inicio_registro', 'hora_fin_registro',
        'tiempo_registro_min', 'observaciones',
      ],
      include: [{ association: 'responsable', attributes: ['nombres', 'apellidos'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return rows.map((e) => ({
      codigo_envio: e.codigo_envio,
      fecha: e.fecha_registro,
      tipo_mercaderia: e.tipo_carga,
      peso_kg: e.peso_kg,
      numero_paquetes: e.numero_paquetes,
      origen: e.origen,
      destino: e.destino,
      hora_inicio: e.hora_inicio_registro ? new Date(e.hora_inicio_registro).toTimeString().slice(0, 8) : null,
      hora_fin: e.hora_fin_registro ? new Date(e.hora_fin_registro).toTimeString().slice(0, 8) : null,
      tiempo_registro_min: e.tiempo_registro_min,
      usuario_responsable: e.responsable ? `${e.responsable.nombres} ${e.responsable.apellidos}` : null,
      observaciones: e.observaciones,
    }));
  }
  if (dimension === 2) {
    const rows = await Envio.findAll({
      where: { activo: true },
      include: [{ association: 'erroresRegistro', required: false }],
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    return rows.map((e) => {
      const err = e.erroresRegistro?.[0];
      const tieneError = !e.registro_correcto || (e.erroresRegistro?.length > 0);
      return {
        codigo_envio: e.codigo_envio,
        fecha: e.fecha_registro,
        tipo_mercaderia: e.tipo_carga,
        destino: e.destino,
        numero_paquetes: e.numero_paquetes,
        error_en_registro: tieneError ? 'Sí' : 'No',
        tipo_error: err?.tipo_error || null,
        campo_afectado: err?.campo_afectado || null,
        observaciones: e.observaciones,
      };
    });
  }
  if (dimension === 3) {
    return sequelize.query(
      `SELECT e.codigo_envio, e.fecha_registro AS fecha, e.tipo_carga AS tipo_mercaderia,
              e.origen, e.destino, s.nombre AS estado_actual,
              IF(COUNT(h.id_historial) > 1 OR s.codigo <> 'recibido', 'Sí', 'No') AS estado_actualizado,
              DATE(MAX(h.fecha_hora)) AS fecha_actualizacion,
              TIME(MAX(h.fecha_hora)) AS hora_actualizacion,
              CONCAT(u.nombres, ' ', u.apellidos) AS responsable_actualizacion,
              e.observaciones
       FROM envios e
       JOIN estados_envio s ON e.id_estado_actual = s.id_estado
       LEFT JOIN historial_estados h ON h.id_envio = e.id_envio
       LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
       WHERE e.activo = 1
       GROUP BY e.id_envio
       ORDER BY e.created_at DESC LIMIT 50`,
      { type: QueryTypes.SELECT }
    );
  }
  if (dimension === 4) {
    try {
      return await sequelize.query('SELECT * FROM vw_ficha_informacion_operativa LIMIT 50', { type: QueryTypes.SELECT });
    } catch {
      const rows = await Incidencia.findAll({
        include: [{ model: Envio, as: 'envio', attributes: ['codigo_envio'] }],
        order: [['fecha_reporte', 'DESC']],
        limit: 50,
      });
      return rows.map((i) => ({
        fecha: i.fecha_reporte ? i.fecha_reporte.toISOString().split('T')[0] : null,
        codigo_incidencia: i.codigo_incidencia,
        tipo_incidencia: i.tipo,
        area: i.area,
        codigo_envio: i.envio?.codigo_envio || null,
        estado_incidencia: i.estado_incidencia,
        informacion_completa: i.informacion_completa ? 'Sí' : 'No',
        fuente_principal: i.fuente_principal,
        observacion: i.descripcion,
      }));
    }
  }
  return [];
};

const getDatosDimension = async (dimension) => {
  const config = DIMENSIONES[dimension];
  if (!config) throw Object.assign(new Error('Dimensión no válida'), { statusCode: 400 });
  try {
    return await sequelize.query(`SELECT * FROM ${config.vista}`, { type: QueryTypes.SELECT });
  } catch {
    return queryFallback(dimension);
  }
};

const calcularIndicadores = async () => {
  const envios = await Envio.findAll({ where: { activo: true }, attributes: ['tiempo_registro_min', 'registro_correcto', 'id_envio'] });
  const totalEnvios = envios.length;
  const tiempos = envios.filter((e) => e.tiempo_registro_min != null).map((e) => Number(e.tiempo_registro_min));
  const tpre = tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : 0;

  const erroresCount = await ErrorRegistro.count();
  const enviosConError = envios.filter((e) => !e.registro_correcto).length + erroresCount;
  const per = totalEnvios ? (enviosConError / totalEnvios) * 100 : 0;

  let peea = 0;
  try {
    const [row] = await sequelize.query(
      `SELECT ROUND(AVG(CASE WHEN estado_actualizado = 'Sí' THEN 100 ELSE 0 END), 2) AS peea FROM vw_ficha_control`,
      { type: QueryTypes.SELECT }
    );
    peea = Number(row?.peea || 0);
  } catch {
    const [row] = await sequelize.query(
      `SELECT COUNT(DISTINCT e.id_envio) AS total,
              SUM(CASE WHEN COUNT(h.id_historial) > 1 THEN 1 ELSE 0 END) AS actualizados
       FROM envios e LEFT JOIN historial_estados h ON h.id_envio = e.id_envio
       WHERE e.activo = 1 GROUP BY e.id_envio`,
      { type: QueryTypes.SELECT }
    ).catch(() => [{ total: totalEnvios, actualizados: 0 }]);
    peea = totalEnvios ? ((row?.actualizados || 0) / totalEnvios) * 100 : 0;
  }

  const incidencias = await Incidencia.findAll({ attributes: ['informacion_completa'] });
  const totalIncidencias = incidencias.length;
  const completas = incidencias.filter((i) => i.informacion_completa).length;
  const pico = totalIncidencias ? (completas / totalIncidencias) * 100 : 0;

  return {
    tpre: Math.round(tpre * 100) / 100,
    per: Math.round(per * 100) / 100,
    peea: Math.round(peea * 100) / 100,
    pico: Math.round(pico * 100) / 100,
    totalEnvios,
    totalIncidencias,
  };
};

const exportarExcel = async (dimension) => {
  const config = DIMENSIONES[dimension];
  const filas = await getDatosDimension(dimension);
  const filename = `ficha_dim${dimension}_${Date.now()}.xlsx`;
  const filepath = path.join(fichasDir, filename);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Dimensión ${dimension}`);
  ws.addRow(config.labels);
  filas.forEach((row) => ws.addRow(config.columnas.map((c) => row[c] ?? '')));
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(filepath);

  return { downloadUrl: `/uploads/fichas/${filename}`, filas, config };
};

module.exports = {
  DIMENSIONES,
  getDatosDimension,
  calcularIndicadores,
  exportarExcel,
};
