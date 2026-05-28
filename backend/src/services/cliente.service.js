const { Cliente } = require('../models');
const { Op } = require('sequelize');
const { sanitizeString } = require('../utils/sanitize');

const list = async (search) => {
  const where = { activo: true };
  if (search) {
    where[Op.or] = [
      { razon_social: { [Op.like]: `%${search}%` } },
      { ruc: { [Op.like]: `%${search}%` } },
    ];
  }
  return Cliente.findAll({ where, order: [['razon_social', 'ASC']] });
};

const create = async (data) => {
  return Cliente.create({
    razon_social: sanitizeString(data.razon_social),
    ruc: data.ruc,
    contacto: sanitizeString(data.contacto),
    email: data.email,
    telefono: data.telefono,
    direccion: sanitizeString(data.direccion),
    distrito: sanitizeString(data.distrito),
    ciudad: data.ciudad || 'Lima',
  });
};

module.exports = { list, create };
