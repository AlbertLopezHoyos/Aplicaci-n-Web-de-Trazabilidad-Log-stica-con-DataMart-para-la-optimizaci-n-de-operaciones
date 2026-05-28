const success = (res, data, message = 'Operación exitosa', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const error = (res, message = 'Error interno', statusCode = 500, errors = null) =>
  res.status(statusCode).json({ success: false, message, errors });

module.exports = { success, error };
