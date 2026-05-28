const evidenciaService = require('../services/evidencia.service');
const { success, error } = require('../utils/response');

const list = async (req, res, next) => {
  try {
    const data = await evidenciaService.listByEnvio(req.params.idEnvio);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) return error(res, 'Archivo requerido', 400);
    const data = await evidenciaService.create(req.file, req.body, req.user.id_usuario);
    return success(res, data, 'Evidencia subida', 201);
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await evidenciaService.remove(req.params.id);
    return success(res, null, 'Evidencia eliminada');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, upload, remove };
