const envioService = require('../services/envio.service');
const { success, error } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const result = await envioService.list(req.query);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const data = await envioService.getById(req.params.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await envioService.create(req.body, req.user.id_usuario);
    return success(res, data, 'Envío registrado', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await envioService.update(req.params.id, req.body, req.user.id_usuario);
    return success(res, data, 'Envío actualizado');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await envioService.remove(req.params.id, req.user.id_usuario);
    return success(res, null, 'Envío eliminado');
  } catch (err) {
    next(err);
  }
};

const actualizarEstado = async (req, res, next) => {
  try {
    const data = await envioService.actualizarEstado(req.params.id, req.body, req.user.id_usuario);
    return success(res, data, 'Estado actualizado');
  } catch (err) {
    next(err);
  }
};

const timeline = async (req, res, next) => {
  try {
    const data = await envioService.getTimeline(req.params.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, remove, actualizarEstado, timeline };
