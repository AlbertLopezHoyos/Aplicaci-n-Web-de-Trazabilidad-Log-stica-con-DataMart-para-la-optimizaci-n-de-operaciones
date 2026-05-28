const { Envio } = require('../models');
const { Op } = require('sequelize');

const generarCodigoEnvio = async () => {
  const anio = new Date().getFullYear();
  const prefix = `GLS-${anio}-`;
  const ultimo = await Envio.findOne({
    where: { codigo_envio: { [Op.like]: `${prefix}%` } },
    order: [['id_envio', 'DESC']],
  });
  let seq = 1;
  if (ultimo) {
    const part = ultimo.codigo_envio.split('-').pop();
    seq = parseInt(part, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

module.exports = { generarCodigoEnvio };
