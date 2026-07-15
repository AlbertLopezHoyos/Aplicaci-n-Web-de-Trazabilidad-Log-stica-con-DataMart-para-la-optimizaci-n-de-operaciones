const { ErrorRegistro } = require('../models');

const logValidationErrors = async (req, errors) => {
  const userId = req.user?.id_usuario || null;
  const records = errors.map((err) => ({
    id_usuario: userId,
    tipo_error: 'validacion',
    campo_afectado: err.path || err.param || 'general',
    descripcion: err.msg || String(err),
    corregido: false,
  }));
  if (records.length) await ErrorRegistro.bulkCreate(records);
};

const logError = async ({ id_envio, id_usuario, codigo_envio, tipo_error, campo_afectado, descripcion }) =>
  ErrorRegistro.create({
    id_envio: id_envio || null,
    id_usuario: id_usuario || null,
    codigo_envio: codigo_envio || null,
    tipo_error: tipo_error || 'validacion',
    campo_afectado: campo_afectado || 'general',
    descripcion,
    corregido: false,
  });

const list = async ({ page = 1, limit = 50, id_envio } = {}) => {
  const where = {};
  if (id_envio) where.id_envio = id_envio;
  const offset = (page - 1) * limit;
  return ErrorRegistro.findAndCountAll({
    where,
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });
};

module.exports = { logValidationErrors, logError, list };
