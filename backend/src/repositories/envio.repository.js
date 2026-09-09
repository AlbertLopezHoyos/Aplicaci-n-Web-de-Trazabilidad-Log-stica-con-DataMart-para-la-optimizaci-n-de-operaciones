const { Op } = require('sequelize');
const { Envio, Cliente, EstadoEnvio, Usuario, HistorialEstado } = require('../models');
const anonimizacion = require('../services/anonimizacion.service');

const includeDefault = [
  { model: Cliente, as: 'cliente' },
  { model: EstadoEnvio, as: 'estadoActual' },
  { model: Usuario, as: 'responsable', attributes: ['id_usuario', 'nombres', 'apellidos', 'email'] },
];

const findAllPaginated = async ({
  page = 1,
  limit = 10,
  search,
  estado,
  cliente,
  fechaDesde,
  fechaHasta,
  presentacionAcademica = false,
  idResponsable,
}) => {
  const where = { activo: true };
  if (estado) where.id_estado_actual = estado;
  if (cliente) where.id_cliente = cliente;
  if (idResponsable) where.id_responsable = idResponsable;
  if (fechaDesde || fechaHasta) {
    where.fecha_registro = {};
    if (fechaDesde) where.fecha_registro[Op.gte] = fechaDesde;
    if (fechaHasta) where.fecha_registro[Op.lte] = fechaHasta;
  }

  if (search) {
    const criterios = [
      { codigo_envio: { [Op.like]: `%${search}%` } },
      { origen: { [Op.like]: `%${search}%` } },
      { destino: { [Op.like]: `%${search}%` } },
    ];
    if (!presentacionAcademica) {
      criterios.push(
        { '$cliente.razon_social$': { [Op.like]: `%${search}%` } },
        { '$cliente.dni$': { [Op.like]: `%${search}%` } }
      );
    } else {
      const mapa = await anonimizacion.cargarMapaAlias();
      const q = search.toLowerCase();
      const idsPorAlias = [...mapa.entries()]
        .filter(([, meta]) => meta.alias.toLowerCase().includes(q))
        .map(([idCliente]) => idCliente);
      if (idsPorAlias.length) {
        criterios.push({ id_cliente: { [Op.in]: idsPorAlias } });
      }
    }
    where[Op.or] = criterios;
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
