const incidenciaService = require('../services/incidencia.service');
const { success } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    return success(res, await incidenciaService.list(req.query));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await incidenciaService.create(req.body, req.user.id_usuario);
    return success(res, data, 'Incidencia registrada', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await incidenciaService.update(req.params.id, req.body);
    return success(res, data, 'Incidencia actualizada');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    return success(res, await incidenciaService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, getById };
