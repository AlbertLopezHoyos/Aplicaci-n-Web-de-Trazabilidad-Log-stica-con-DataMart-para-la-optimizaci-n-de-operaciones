const { Incidencia } = require('../models');
const { Op } = require('sequelize');
const { esIncidenciaCompleta } = require('./reglasIndicadores');

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

// El criterio de "información completa" (PIOIC) vive en reglasIndicadores.js
// para que backend, reportes y fichas usen exactamente la misma definición.
const evaluarInformacionCompleta = esIncidenciaCompleta;

module.exports = { generarCodigoIncidencia, evaluarInformacionCompleta };
