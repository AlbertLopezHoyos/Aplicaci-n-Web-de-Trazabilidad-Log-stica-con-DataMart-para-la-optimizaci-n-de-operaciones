const express = require('express');
const { body, param, query } = require('express-validator');
const observacionController = require('../controllers/observacion.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

const validadoresAlcance = [
  query('alcance').optional().isIn(['MUESTRA', 'TODOS', 'muestra', 'todos']),
  query('grupo').optional().isIn(['PREPRUEBA', 'POSPRUEBA', 'preprueba', 'posprueba']),
];

router.get('/indicadores', validadoresAlcance, validate, observacionController.getIndicadores);

// Medición de investigación (preprueba vs posprueba) — solo Administrador
router.get('/medicion', authorize('Administrador'), observacionController.getMedicion);

router.get(
  '/ficha/:dimension',
  [param('dimension').isIn(['1', '2', '3', '4']), ...validadoresAlcance],
  validate,
  observacionController.getDimension
);
router.get(
  '/ficha/:dimension/export',
  [param('dimension').isIn(['1', '2', '3', '4']), ...validadoresAlcance],
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
