const express = require('express');
const evidenciaController = require('../controllers/evidencia.controller');
const upload = require('../middlewares/upload.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/envio/:idEnvio', evidenciaController.list);
router.post('/upload', upload.single('archivo'), evidenciaController.upload);
router.delete('/:id', evidenciaController.remove);

module.exports = router;
