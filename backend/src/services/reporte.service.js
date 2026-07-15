const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { sequelize, Reporte, Envio, Incidencia, Cliente } = require('../models');
const { QueryTypes } = require('sequelize');

const reportsDir = path.join(__dirname, '../../uploads/reportes');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

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

const getDatosIncidencias = async () =>
  Incidencia.findAll({
    include: [{ model: Envio, as: 'envio', attributes: ['codigo_envio'] }],
    order: [['fecha_reporte', 'DESC']],
    limit: 500,
  });

const getDatosTiempos = async () =>
  Envio.findAll({
    where: { fecha_entrega_real: { [require('sequelize').Op.ne]: null } },
    attributes: ['codigo_envio', 'fecha_registro', 'fecha_entrega_real', 'fecha_estimada_entrega'],
    include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
    limit: 500,
  });

const generarPDF = async (titulo, filas, columnas, filename) => {
  const filepath = path.join(reportsDir, filename);
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);
  doc.fontSize(18).fillColor('#0B3D6E').text('Grupo Logístico Salazar S.A.C.', { align: 'center' });
  doc.fontSize(12).fillColor('#333').text('Sistema de Trazabilidad Logística - Lima 2026', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(titulo, { underline: true });
  doc.moveDown();
  doc.fontSize(9);
  doc.text(columnas.join(' | '));
  doc.moveDown(0.5);
  filas.forEach((row) => doc.text(columnas.map((c) => String(row[c] ?? '')).join(' | ')));
  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return `/uploads/reportes/${filename}`;
};

const generarExcel = async (titulo, filas, columnas, filename) => {
  const filepath = path.join(reportsDir, filename);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(titulo.slice(0, 31));
  ws.addRow(columnas);
  filas.forEach((row) => ws.addRow(columnas.map((c) => row[c] ?? '')));
  ws.getRow(1).font = { bold: true };
  await wb.xlsx.writeFile(filepath);
  return `/uploads/reportes/${filename}`;
};

const generar = async ({ tipo, formato, titulo, userId, area_solicitante, observaciones }) => {
  const horaInicio = new Date();
  let filas = [];
  let columnas = [];
  let tipoReporte = tipo;

  switch (tipo) {
    case 'envios_estado':
      filas = await getDatosEnviosPorEstado();
      columnas = ['codigo', 'estado', 'cantidad'];
      titulo = titulo || 'Reporte de envíos por estado';
      break;
    case 'tiempos':
      filas = (await getDatosTiempos()).map((e) => ({
        codigo: e.codigo_envio,
        cliente: e.cliente?.razon_social,
        registro: e.fecha_registro,
        entrega: e.fecha_entrega_real,
        estimada: e.fecha_estimada_entrega,
      }));
      columnas = ['codigo', 'cliente', 'registro', 'entrega', 'estimada'];
      titulo = titulo || 'Reporte de tiempos de entrega';
      break;
    case 'incidencias':
      filas = (await getDatosIncidencias()).map((i) => ({
        envio: i.envio?.codigo_envio,
        tipo: i.tipo,
        severidad: i.severidad,
        titulo: i.titulo,
        estado: i.estado_incidencia,
        fecha: i.fecha_reporte,
      }));
      columnas = ['envio', 'tipo', 'severidad', 'titulo', 'estado', 'fecha'];
      titulo = titulo || 'Reporte de incidencias';
      break;
    case 'productividad':
      filas = await getDatosProductividad();
      columnas = ['operador', 'envios_gestionados', 'entregas', 'incidencias_reportadas'];
      titulo = titulo || 'Reporte de productividad';
      break;
    default:
      throw Object.assign(new Error('Tipo de reporte no válido'), { statusCode: 400 });
  }

  const ts = Date.now();
  const ext = formato === 'excel' ? 'xlsx' : 'pdf';
  const filename = `reporte_${tipo}_${ts}.${ext}`;
  const ruta =
    formato === 'excel'
      ? await generarExcel(titulo, filas, columnas, filename)
      : await generarPDF(titulo, filas, columnas, filename);

  const horaFin = new Date();
  const tiempoMin = Math.round(((horaFin - horaInicio) / 60000) * 100) / 100;

  const reporte = await Reporte.create({
    id_usuario: userId,
    tipo_reporte: tipoReporte,
    titulo,
    parametros: { formato, tipo },
    ruta_archivo: ruta,
    formato: formato === 'excel' ? 'excel' : 'pdf',
    estado: 'generado',
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    tiempo_generacion_min: tiempoMin,
    area_solicitante: area_solicitante || 'Operaciones',
    cantidad_registros: filas.length,
    observaciones: observaciones || null,
  });

  return { reporte, downloadUrl: ruta };
};

const listHistorial = (userId, isAdmin) =>
  Reporte.findAll({
    where: isAdmin ? {} : { id_usuario: userId },
    order: [['created_at', 'DESC']],
    limit: 50,
  });

module.exports = { generar, listHistorial };
