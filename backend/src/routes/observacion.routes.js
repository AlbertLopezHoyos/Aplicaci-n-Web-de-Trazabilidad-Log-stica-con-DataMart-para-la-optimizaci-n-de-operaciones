const express = require('express');
const { param } = require('express-validator');
const observacionController = require('../controllers/observacion.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/indicadores', observacionController.getIndicadores);

router.get('/medicion', authorize('Administrador'), observacionController.getMedicion);

router.get(
  '/ficha/:dimension',
  [param('dimension').isIn(['1', '2', '3', '4'])],
  validate,
  observacionController.getDimension
);
router.get(
  '/ficha/:dimension/export',
  [param('dimension').isIn(['1', '2', '3', '4'])],
  validate,
  observacionController.exportarFicha
);
router.get('/errores-registro', observacionController.listErrores);

module.exports = router;
