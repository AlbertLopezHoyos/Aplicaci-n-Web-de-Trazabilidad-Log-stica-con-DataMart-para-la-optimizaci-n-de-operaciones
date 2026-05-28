const express = require('express');
const { body } = require('express-validator');
const envioController = require('../controllers/envio.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', envioController.list);
router.get('/:id/timeline', envioController.timeline);
router.get('/:id', envioController.getById);
router.post(
  '/',
  [
    body('id_cliente').isInt(),
    body('origen').notEmpty(),
    body('destino').notEmpty(),
    body('tipo_carga').notEmpty(),
  ],
  validate,
  envioController.create
);
router.put('/:id', envioController.update);
router.delete('/:id', envioController.remove);
router.patch(
  '/:id/estado',
  [body('id_estado').isInt()],
  validate,
  envioController.actualizarEstado
);

module.exports = router;
