const { validationResult } = require('express-validator');
const { error } = require('../utils/response');
const errorRegistroService = require('../services/errorRegistro.service');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return error(res, 'Datos inválidos', 400, result.array());
  }
  next();
};

/** Registra errores en BD para medición PER (ficha dimensión 2) */
const validateConRegistroErrores = async (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    try {
      await errorRegistroService.logValidationErrors(req, result.array());
    } catch (err) {
      console.error('[ErrorRegistro]', err.message);
    }
    return error(res, 'Datos inválidos', 400, result.array());
  }
  next();
};

module.exports = validate;
module.exports.validateConRegistroErrores = validateConRegistroErrores;
