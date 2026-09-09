const reporteService = require('../services/reporte.service');
const { success } = require('../utils/response');

const generar = async (req, res, next) => {
  try {
    const result = await reporteService.generar({
      ...req.body,
      userId: req.user.id_usuario,
      presentacionAcademica: req.presentacionAcademica,
    });
    return success(res, result, 'Reporte generado', 201);
  } catch (err) {
    next(err);
  }
};

const historial = async (req, res, next) => {
  try {
    const isAdmin = req.userRole === 'Administrador';
    const data = await reporteService.listHistorial(req.user.id_usuario, isAdmin);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};

const getDatos = async (req, res, next) => {
  try {
    const datos = await reporteService.getDatos(req.params.tipo, {
      presentacionAcademica: req.presentacionAcademica,
    });
    return success(res, datos);
  } catch (err) {
    next(err);
  }
};

module.exports = { generar, getDatos, historial };
