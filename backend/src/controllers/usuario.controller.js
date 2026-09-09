const usuarioService = require('../services/usuario.service');
const { success } = require('../utils/response');

const list = async (_req, res, next) => {
  try {
    return success(res, await usuarioService.list());
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    return success(res, await usuarioService.findById(req.params.id));
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await usuarioService.create(req.body);
    return success(res, data, 'Usuario creado', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await usuarioService.update(req.params.id, req.body);
    return success(res, data, 'Usuario actualizado');
  } catch (err) {
    next(err);
  }
};

const setActivo = async (req, res, next) => {
  try {
    const data = await usuarioService.setActivo(req.params.id, req.body.activo);
    return success(res, data, req.body.activo ? 'Usuario activado' : 'Usuario desactivado');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getById, create, update, setActivo };
