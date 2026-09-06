const path = require('path');
const fs = require('fs');
const { sequelize, Reporte, Envio, Incidencia, Cliente } = require('../models');
const { QueryTypes, Op } = require('sequelize');

const reportsDir = path.join(__dirname, '../../uploads/reportes');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const REPORT_HEADERS = {
  envios_estado: [
    { key: 'estado', label: 'Estado' },
    { key: 'codigo', label: 'Código' },
    { key: 'cantidad', label: 'Cantidad de envíos' },
  ],
  tiempos: [
    { key: 'codigo', label: 'Código envío' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'registro', label: 'Fecha registro' },
    { key: 'estimada', label: 'Entrega estimada' },
    { key: 'entrega', label: 'Entrega real' },
    { key: 'dias', label: 'Días de tránsito' },
  ],
  incidencias: [
    { key: 'envio', label: 'Código envío' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'severidad', label: 'Severidad' },
    { key: 'titulo', label: 'Título' },
    { key: 'estado', label: 'Estado' },
    { key: 'fecha', label: 'Fecha reporte' },
  ],
  productividad: [
    { key: 'operador', label: 'Operador' },
    { key: 'envios_gestionados', label: 'Envíos gestionados' },
    { key: 'entregas', label: 'Entregas' },
    { key: 'incidencias_reportadas', label: 'Incidencias reportadas' },
  ],
};

const getDatosEnviosPorEstado = async () => {
  try {
    return await sequelize.query('SELECT * FROM vw_envios_por_estado', { type: QueryTypes.SELECT });
  } catch {
    return [];
  }
};

const getDatosProductividad = async () => {
  try {
    return await sequelize.query('SELECT * FROM vw_productividad_operadores', { type: QueryTypes.SELECT });
  } catch {
    return [];
  }
};

const diasEntre = (desde, hasta) => {
  if (!desde || !hasta) return null;
  const a = new Date(`${desde}T12:00:00`);
  const b = new Date(`${hasta}T12:00:00`);
  return Math.round((b - a) / 86400000);
};

const buildReporteData = async (tipo) => {
  let filas = [];
  let titulo = '';

  switch (tipo) {
    case 'envios_estado':
      filas = (await getDatosEnviosPorEstado()).map((r) => ({
        estado: r.estado,
        codigo: r.codigo,
        cantidad: Number(r.cantidad) || 0,
      }));
      titulo = 'Reporte de envíos por estado';
      break;
    case 'tiempos':
      filas = (await Envio.findAll({
        where: { fecha_entrega_real: { [Op.ne]: null }, activo: true },
        attributes: ['codigo_envio', 'fecha_registro', 'fecha_entrega_real', 'fecha_estimada_entrega'],
        include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
        limit: 500,
        order: [['fecha_entrega_real', 'DESC']],
      })).map((e) => ({
        codigo: e.codigo_envio,
        cliente: e.cliente?.razon_social,
        registro: e.fecha_registro,
        estimada: e.fecha_estimada_entrega,
        entrega: e.fecha_entrega_real,
        dias: diasEntre(e.fecha_registro, e.fecha_entrega_real),
      }));
      titulo = 'Reporte de tiempos de entrega';
      break;
    case 'incidencias':
      filas = (await Incidencia.findAll({
        include: [{ model: Envio, as: 'envio', attributes: ['codigo_envio'] }],
        order: [['fecha_reporte', 'DESC']],
        limit: 500,
      })).map((i) => ({
        envio: i.envio?.codigo_envio,
        tipo: i.tipo,
        severidad: i.severidad,
        titulo: i.titulo,
        estado: i.estado_incidencia,
        fecha: i.fecha_reporte,
      }));
      titulo = 'Reporte de incidencias operativas';
      break;
    case 'productividad':
      filas = (await getDatosProductividad()).map((r) => ({
        operador: r.operador,
        envios_gestionados: Number(r.envios_gestionados) || 0,
        entregas: Number(r.entregas) || 0,
        incidencias_reportadas: Number(r.incidencias_reportadas) || 0,
      }));
      titulo = 'Reporte de productividad por operador';
      break;
    default:
      throw Object.assign(new Error('Tipo de reporte no válido'), { statusCode: 400 });
  }

  return {
    titulo,
    headers: REPORT_HEADERS[tipo],
    filas,
    tipo,
  };
};

const generar = async ({ tipo, formato, titulo, userId, area_solicitante, observaciones }) => {
  const horaInicio = new Date();
  const datos = await buildReporteData(tipo);
  if (titulo) datos.titulo = titulo;

  const horaFin = new Date();
  const tiempoMin = Math.round(((horaFin - horaInicio) / 60000) * 100) / 100;

  const reporte = await Reporte.create({
    id_usuario: userId,
    tipo_reporte: tipo,
    titulo: datos.titulo,
    parametros: { formato, tipo },
    ruta_archivo: null,
    formato: formato === 'excel' ? 'excel' : 'pdf',
    estado: 'generado',
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    tiempo_generacion_min: tiempoMin,
    area_solicitante: area_solicitante || 'Operaciones',
    cantidad_registros: datos.filas.length,
    observaciones: observaciones || null,
  });

  return {
    reporte,
    datos: {
      titulo: datos.titulo,
      headers: datos.headers,
      filas: datos.filas,
    },
  };
};

const getDatos = (tipo) => buildReporteData(tipo);

const listHistorial = (userId, isAdmin) =>
  Reporte.findAll({
    where: isAdmin ? {} : { id_usuario: userId },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

module.exports = { generar, getDatos, listHistorial, buildReporteData };
