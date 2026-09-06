const express = require('express');
const { body } = require('express-validator');
const reporteController = require('../controllers/reporte.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/historial', reporteController.historial);
router.get('/datos/:tipo', reporteController.getDatos);
router.post(
  '/generar',
  [
    body('tipo').isIn(['envios_estado', 'tiempos', 'incidencias', 'productividad']),
    body('formato').isIn(['pdf', 'excel']),
    body('area_solicitante').optional().notEmpty(),
    body('observaciones').optional(),
  ],
  validate,
  reporteController.generar
);

module.exports = router;
