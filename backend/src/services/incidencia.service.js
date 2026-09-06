const { Op } = require('sequelize');
const { Incidencia, Envio, Usuario, Cliente, EstadoEnvio } = require('../models');
const { sanitizeObject } = require('../utils/sanitize');
const { generarCodigoIncidencia, evaluarInformacionCompleta } = require('../utils/codigoIncidencia');

const list = async ({ page = 1, limit = 10, tipo, estado, id_envio }) => {
  const where = {};
  if (tipo) where.tipo = tipo;
  if (estado) where.estado_incidencia = estado;
  if (id_envio) where.id_envio = id_envio;

  const offset = (page - 1) * limit;
  const { count, rows } = await Incidencia.findAndCountAll({
    where,
    include: [
      {
        model: Envio,
        as: 'envio',
        attributes: ['id_envio', 'codigo_envio', 'origen', 'destino'],
        include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
      },
      { model: Usuario, as: 'reportadoPor', attributes: ['nombres', 'apellidos'] },
    ],
    order: [['fecha_reporte', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });
  return { total: count, page: parseInt(page, 10), data: rows };
};

const create = async (data, userId) => {
  const clean = sanitizeObject(data, ['titulo', 'descripcion', 'resolucion', 'area', 'fuente_principal']);
  const codigo_incidencia = await generarCodigoIncidencia();
  const informacion_completa = evaluarInformacionCompleta(clean);
  return Incidencia.create({
    ...clean,
    codigo_incidencia,
    informacion_completa,
    id_usuario_reporta: userId,
  });
};

const update = async (id, data) => {
  const inc = await Incidencia.findByPk(id);
  if (!inc) throw Object.assign(new Error('Incidencia no encontrada'), { statusCode: 404 });
  const clean = sanitizeObject(data, ['titulo', 'descripcion', 'resolucion', 'area', 'fuente_principal']);
  if (clean.estado_incidencia === 'resuelta' || clean.estado_incidencia === 'cerrada') {
    clean.fecha_resolucion = clean.fecha_resolucion || new Date();
  }
  const merged = { ...inc.toJSON(), ...clean };
  clean.informacion_completa = evaluarInformacionCompleta(merged);
  await inc.update(clean);
  return inc;
};

const getById = async (id) => {
  const inc = await Incidencia.findByPk(id, {
    include: [{ model: Envio, as: 'envio', include: [{ model: EstadoEnvio, as: 'estadoActual' }] }],
  });
  if (!inc) throw Object.assign(new Error('Incidencia no encontrada'), { statusCode: 404 });
  return inc;
};

module.exports = { list, create, update, getById };
