const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const getKpis = async () => {
  try {
    const result = await sequelize.query('CALL sp_kpis_dashboard()');
    const row = result[0]?.[0] || result[0] || {};
    return {
      totalEnvios: Number(row.total_envios || 0),
      enviosEntregados: Number(row.envios_entregados || 0),
      enviosPendientes: Number(row.envios_pendientes || 0),
      incidenciasAbiertas: Number(row.incidencias_abiertas || 0),
      diasPromedioEntrega: Number(row.dias_promedio_entrega || 0),
    };
  } catch {
    const [row] = await sequelize.query(
      `SELECT
        (SELECT COUNT(*) FROM envios WHERE activo = 1) AS total_envios,
        (SELECT COUNT(*) FROM envios e JOIN estados_envio s ON e.id_estado_actual = s.id_estado WHERE s.codigo = 'entregado') AS envios_entregados,
        (SELECT COUNT(*) FROM envios e JOIN estados_envio s ON e.id_estado_actual = s.id_estado WHERE s.codigo IN ('recibido','en_transito','retrasado')) AS envios_pendientes,
        (SELECT COUNT(*) FROM incidencias WHERE estado_incidencia IN ('abierta','en_revision')) AS incidencias_abiertas,
        (SELECT ROUND(AVG(DATEDIFF(fecha_entrega_real, fecha_registro)),1) FROM envios WHERE fecha_entrega_real IS NOT NULL) AS dias_promedio_entrega`,
      { type: QueryTypes.SELECT }
    );
    return {
      totalEnvios: Number(row.total_envios || 0),
      enviosEntregados: Number(row.envios_entregados || 0),
      enviosPendientes: Number(row.envios_pendientes || 0),
      incidenciasAbiertas: Number(row.incidencias_abiertas || 0),
      diasPromedioEntrega: Number(row.dias_promedio_entrega || 0),
    };
  }
};

const getEnviosPorEstado = async () => {
  const rows = await sequelize.query('SELECT * FROM vw_envios_por_estado', { type: QueryTypes.SELECT });
  return rows;
};

const getTendenciaMensual = async () => {
  const rows = await sequelize.query(
    `SELECT DATE_FORMAT(fecha_registro, '%Y-%m') AS mes,
            COUNT(*) AS total,
            SUM(CASE WHEN s.codigo = 'entregado' THEN 1 ELSE 0 END) AS entregados
     FROM envios e
     JOIN estados_envio s ON e.id_estado_actual = s.id_estado
     WHERE e.activo = 1 AND fecha_registro >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(fecha_registro, '%Y-%m')
     ORDER BY mes`,
    { type: QueryTypes.SELECT }
  );
  return rows;
};

const getIncidenciasPorTipo = async () => {
  const { Incidencia } = require('../models');
  const rows = await Incidencia.findAll({
    attributes: [
      'tipo',
      [sequelize.fn('COUNT', sequelize.col('id_incidencia')), 'cantidad'],
    ],
    group: ['tipo'],
    raw: true,
  });
  return rows;
};

module.exports = { getKpis, getEnviosPorEstado, getTendenciaMensual, getIncidenciasPorTipo };
