const express = require('express');
const catalogoController = require('../controllers/catalogo.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/estados', catalogoController.getEstados);
router.get('/roles', catalogoController.getRoles);
router.get('/clientes', catalogoController.getClientes);
router.get('/clientes/check-dni', catalogoController.checkClienteDni);
router.post('/clientes', catalogoController.createCliente);
router.put('/clientes/:id', catalogoController.updateCliente);

module.exports = router;
