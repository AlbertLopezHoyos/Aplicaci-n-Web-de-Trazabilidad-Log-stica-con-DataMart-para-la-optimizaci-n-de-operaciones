const observacionService = require('../services/observacion.service');
const errorRegistroService = require('../services/errorRegistro.service');
const { success } = require('../utils/response');

/** Alcance y grupo se leen del query string; por defecto solo la muestra real. */
const opcionesDesdeQuery = (req) => ({
  alcance: req.query.alcance,
  grupo: req.query.grupo,
});

const getIndicadores = async (req, res, next) => {
  try {
    const indicadores = await observacionService.calcularIndicadores(opcionesDesdeQuery(req));
    return success(res, indicadores);
  } catch (err) {
    next(err);
  }
};

const getMedicion = async (_req, res, next) => {
  try {
    const medicion = await observacionService.getMedicionInvestigacion();
    return success(res, medicion);
  } catch (err) {
    next(err);
  }
};

const getDimension = async (req, res, next) => {
  try {
    const dimension = parseInt(req.params.dimension, 10);
    const opciones = opcionesDesdeQuery(req);
    const [data, total] = await Promise.all([
      observacionService.getDatosDimension(dimension, {
        ...opciones,
        limit: req.query.limit || observacionService.FICHA_MUESTRA,
      }),
      observacionService.countDatosDimension(dimension, opciones),
    ]);
    const config = observacionService.DIMENSIONES[dimension];
    return success(res, {
      dimension,
      titulo: config?.titulo,
      indicador: config?.indicador,
      columnas: config?.columnas || [],
      labels: config?.labels || [],
      alcance: opciones.alcance || observacionService.ALCANCE.MUESTRA,
      grupo: opciones.grupo || null,
      data,
      total,
      limite: observacionService.FICHA_MUESTRA,
    });
  } catch (err) {
    next(err);
  }
};

const exportarFicha = async (req, res, next) => {
  try {
    const dimension = parseInt(req.params.dimension, 10);
    const result = await observacionService.exportarExcel(dimension, opcionesDesdeQuery(req));
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

const aleatorizarPosprueba = async (_req, res, next) => {
  try {
    const resultado = await observacionService.aleatorizarPosprueba();
    return success(res, resultado, 'Muestra posprueba aleatorizada');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getIndicadores,
  getMedicion,
  getDimension,
  exportarFicha,
  listErrores,
  logErrorCliente,
  aleatorizarPosprueba,
};
