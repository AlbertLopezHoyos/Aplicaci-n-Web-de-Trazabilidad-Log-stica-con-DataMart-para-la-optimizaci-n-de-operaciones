const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { success } = require('../utils/response');
const datamartDesign = require('../datamart/star-schema.design');
const etlService = require('../datamart/etl.service');

const router = express.Router();
router.use(authenticate);

router.get('/design', (_req, res) => success(res, datamartDesign));
router.get('/preview', authorize('Administrador'), async (req, res, next) => {
  try {
    const preview = await etlService.getPreview();
    return success(res, preview);
  } catch (err) {
    next(err);
  }
});
router.get('/analytics', authorize('Administrador'), async (req, res, next) => {
  try {
    const analytics = await etlService.getAnalytics();
    return success(res, analytics);
  } catch (err) {
    next(err);
  }
});
router.post('/etl/run', authorize('Administrador'), async (req, res, next) => {
  try {
    const result = await etlService.runStaging();
    return success(res, result, 'ETL de staging ejecutado');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
