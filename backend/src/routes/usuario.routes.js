const express = require('express');
const { body, param } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const validate = require('../middlewares/validate.middleware');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate, authorize('Administrador'));

router.get('/', usuarioController.list);
router.get('/:id', [param('id').isInt()], validate, usuarioController.getById);
router.post(
  '/',
  [
    body('nombres').trim().notEmpty(),
    body('apellidos').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('id_rol').isInt(),
  ],
  validate,
  usuarioController.create
);
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('nombres').trim().notEmpty(),
    body('apellidos').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('id_rol').isInt(),
    body('password').optional({ values: 'falsy' }).isLength({ min: 8 }),
  ],
  validate,
  usuarioController.update
);
router.patch(
  '/:id/activo',
  [param('id').isInt(), body('activo').isBoolean()],
  validate,
  usuarioController.setActivo
);

module.exports = router;
