const express = require('express');
const { body, param } = require('express-validator');
const observacionController = require('../controllers/observacion.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/indicadores', observacionController.getIndicadores);
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
router.post(
  '/errores-registro',
  [
    body('tipo_error').notEmpty(),
    body('campo_afectado').notEmpty(),
    body('descripcion').optional(),
  ],
  validate,
  observacionController.logErrorCliente
);

module.exports = router;
