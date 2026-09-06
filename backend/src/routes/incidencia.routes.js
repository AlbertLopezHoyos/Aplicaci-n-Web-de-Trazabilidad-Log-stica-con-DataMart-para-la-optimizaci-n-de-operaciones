const express = require('express');
const { body } = require('express-validator');
const incidenciaController = require('../controllers/incidencia.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/', incidenciaController.list);
router.get('/:id', incidenciaController.getById);
router.post(
  '/',
  [body('id_envio').isInt(), body('titulo').notEmpty(), body('descripcion').notEmpty(), body('area').notEmpty(), body('fuente_principal').notEmpty()],
  validate,
  incidenciaController.create
);
router.put('/:id', incidenciaController.update);

module.exports = router;
