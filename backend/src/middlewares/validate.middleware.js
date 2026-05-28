const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return error(res, 'Datos inválidos', 400, result.array());
  }
  next();
};

module.exports = validate;
