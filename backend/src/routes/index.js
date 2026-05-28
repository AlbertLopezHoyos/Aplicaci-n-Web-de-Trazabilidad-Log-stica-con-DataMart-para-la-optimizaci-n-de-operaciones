const express = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const envioRoutes = require('./envio.routes');
const incidenciaRoutes = require('./incidencia.routes');
const evidenciaRoutes = require('./evidencia.routes');
const reporteRoutes = require('./reporte.routes');
const catalogoRoutes = require('./catalogo.routes');
const datamartRoutes = require('./datamart.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/envios', envioRoutes);
router.use('/incidencias', incidenciaRoutes);
router.use('/evidencias', evidenciaRoutes);
router.use('/reportes', reporteRoutes);
router.use('/catalogos', catalogoRoutes);
router.use('/datamart', datamartRoutes);

router.get('/health', (_req, res) =>
  res.json({ success: true, message: 'API Trazabilidad Logística operativa', timestamp: new Date() })
);

module.exports = router;
