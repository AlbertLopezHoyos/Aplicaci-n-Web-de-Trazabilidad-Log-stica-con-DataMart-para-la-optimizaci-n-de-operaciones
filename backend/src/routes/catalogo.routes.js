const express = require('express');
const catalogoController = require('../controllers/catalogo.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/estados', catalogoController.getEstados);
router.get('/clientes', catalogoController.getClientes);
router.post('/clientes', catalogoController.createCliente);

module.exports = router;
