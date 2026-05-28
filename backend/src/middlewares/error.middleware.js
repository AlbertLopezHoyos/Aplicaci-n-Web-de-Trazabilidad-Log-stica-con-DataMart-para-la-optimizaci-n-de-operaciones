const { error } = require('../utils/response');

const notFound = (req, res) => error(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404);

const errorHandler = (err, req, res, _next) => {
  console.error('[Error]', err.message);
  if (err.name === 'SequelizeValidationError') {
    return error(res, 'Error de validación', 400, err.errors?.map((e) => e.message));
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return error(res, 'Registro duplicado', 409);
  }
  const status = err.statusCode || 500;
  return error(res, err.message || 'Error interno del servidor', status);
};

module.exports = { notFound, errorHandler };
