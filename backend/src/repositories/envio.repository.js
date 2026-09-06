const { Op } = require('sequelize');
const { Envio, Cliente, EstadoEnvio, Usuario, HistorialEstado } = require('../models');

const includeDefault = [
  { model: Cliente, as: 'cliente' },
  { model: EstadoEnvio, as: 'estadoActual' },
  { model: Usuario, as: 'responsable', attributes: ['id_usuario', 'nombres', 'apellidos', 'email'] },
];

const findAllPaginated = async ({ page = 1, limit = 10, search, estado, cliente, fechaDesde, fechaHasta }) => {
  const where = { activo: true };
  if (estado) where.id_estado_actual = estado;
  if (cliente) where.id_cliente = cliente;
  if (fechaDesde || fechaHasta) {
    where.fecha_registro = {};
    if (fechaDesde) where.fecha_registro[Op.gte] = fechaDesde;
    if (fechaHasta) where.fecha_registro[Op.lte] = fechaHasta;
  }

  if (search) {
    where[Op.or] = [
      { codigo_envio: { [Op.like]: `%${search}%` } },
      { origen: { [Op.like]: `%${search}%` } },
      { destino: { [Op.like]: `%${search}%` } },
      { '$cliente.razon_social$': { [Op.like]: `%${search}%` } },
      { '$cliente.ruc$': { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await Envio.findAndCountAll({
    where,
    include: includeDefault,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
    distinct: true,
    subQuery: false,
  });
  return { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10), data: rows };
};

const findById = (id) =>
  Envio.findByPk(id, {
    include: [
      ...includeDefault,
      {
        model: HistorialEstado,
        as: 'historial',
        include: [
          { model: EstadoEnvio, as: 'estado' },
          { model: Usuario, as: 'usuario', attributes: ['nombres', 'apellidos'] },
        ],
        order: [['fecha_hora', 'DESC']],
      },
    ],
  });

module.exports = { findAllPaginated, findById, includeDefault };
