const { Incidencia } = require('../models');
const { Op } = require('sequelize');

const generarCodigoIncidencia = async () => {
  const anio = new Date().getFullYear();
  const prefix = `INC-${anio}-`;
  const ultimo = await Incidencia.findOne({
    where: { codigo_incidencia: { [Op.like]: `${prefix}%` } },
    order: [['id_incidencia', 'DESC']],
  });
  let seq = 1;
  if (ultimo?.codigo_incidencia) {
    const part = ultimo.codigo_incidencia.split('-').pop();
    seq = parseInt(part, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
};

const evaluarInformacionCompleta = (data) =>
  Boolean(
    data.tipo &&
      data.area?.trim() &&
      data.titulo?.trim() &&
      data.descripcion?.trim() &&
      data.fuente_principal?.trim()
  );

module.exports = { generarCodigoIncidencia, evaluarInformacionCompleta };
