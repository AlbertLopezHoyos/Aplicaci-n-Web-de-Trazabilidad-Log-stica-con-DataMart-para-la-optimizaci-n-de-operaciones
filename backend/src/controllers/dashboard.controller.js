const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/response');

const getDashboard = async (req, res, next) => {
  try {
    const [kpis, porEstado, tendencia, incidencias] = await Promise.all([
      dashboardService.getKpis(),
      dashboardService.getEnviosPorEstado(),
      dashboardService.getTendenciaMensual(),
      dashboardService.getIncidenciasPorTipo(),
    ]);
    return success(res, { kpis, porEstado, tendencia, incidencias });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDashboard };
