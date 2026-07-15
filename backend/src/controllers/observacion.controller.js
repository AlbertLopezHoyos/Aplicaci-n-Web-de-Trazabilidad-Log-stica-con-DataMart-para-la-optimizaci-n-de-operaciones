const observacionService = require('../services/observacion.service');
const errorRegistroService = require('../services/errorRegistro.service');
const { success } = require('../utils/response');

const getIndicadores = async (_req, res, next) => {
  try {
    const indicadores = await observacionService.calcularIndicadores();
    return success(res, indicadores);
  } catch (err) {
    next(err);
  }
};

const getDimension = async (req, res, next) => {
  try {
    const dimension = parseInt(req.params.dimension, 10);
    const data = await observacionService.getDatosDimension(dimension);
    const config = observacionService.DIMENSIONES[dimension];
    return success(res, { dimension, titulo: config?.titulo, data });
  } catch (err) {
    next(err);
  }
};

const exportarFicha = async (req, res, next) => {
  try {
    const dimension = parseInt(req.params.dimension, 10);
    const result = await observacionService.exportarExcel(dimension);
    return success(res, result, 'Ficha exportada');
  } catch (err) {
    next(err);
  }
};

const listErrores = async (req, res, next) => {
  try {
    const result = await errorRegistroService.list(req.query);
    return success(res, { data: result.rows, total: result.count });
  } catch (err) {
    next(err);
  }
};

const logErrorCliente = async (req, res, next) => {
  try {
    const registro = await errorRegistroService.logError({
      ...req.body,
      id_usuario: req.user.id_usuario,
    });
    return success(res, registro, 'Error registrado', 201);
  } catch (err) {
    next(err);
  }
};

module.exports = { getIndicadores, getDimension, exportarFicha, listErrores, logErrorCliente };
