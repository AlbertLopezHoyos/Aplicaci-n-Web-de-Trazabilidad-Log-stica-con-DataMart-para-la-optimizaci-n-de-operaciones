const express = require('express');
const { body } = require('express-validator');
const envioController = require('../controllers/envio.controller');
const validate = require('../middlewares/validate.middleware');
const validateConRegistroErrores = require('../middlewares/validate.middleware').validateConRegistroErrores;
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { TIPOS_CARGA_OPERATIVOS } = require('../utils/tiposCarga');

const router = express.Router();

router.use(authenticate);

router.get('/', envioController.list);
router.get('/:id/timeline', envioController.timeline);
router.get('/:id', envioController.getById);
router.post(
  '/',
  [
    body('id_cliente').isInt().withMessage('Cliente requerido'),
    body('origen').notEmpty().withMessage('Origen requerido'),
    body('destino').notEmpty().withMessage('Destino requerido'),
    body('tipo_carga').isIn(TIPOS_CARGA_OPERATIVOS).withMessage('Tipo de carga inválido'),
    body('numero_paquetes').optional().isInt({ min: 1 }).withMessage('Número de paquetes inválido'),
    body('peso_kg').optional().isFloat({ min: 0 }).withMessage('Peso inválido'),
    body('hora_inicio_registro').optional().isISO8601().withMessage('Hora inicio inválida'),
  ],
  validateConRegistroErrores,
  envioController.create
);
router.put(
  '/:id',
  [
    body('tipo_carga').optional().isIn(TIPOS_CARGA_OPERATIVOS).withMessage('Tipo de carga inválido'),
    body('numero_paquetes').optional().isInt({ min: 1 }),
    body('peso_kg').optional().isFloat({ min: 0 }),
  ],
  validate,
  envioController.update
);
router.delete('/:id', authorize('Administrador'), envioController.remove);
router.patch(
  '/:id/estado',
  [body('id_estado').isInt()],
  validate,
  envioController.actualizarEstado
);

module.exports = router;
