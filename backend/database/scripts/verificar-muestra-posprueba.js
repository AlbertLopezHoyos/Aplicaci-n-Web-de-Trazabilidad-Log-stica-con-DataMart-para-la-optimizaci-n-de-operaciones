require('./load-railway-env');
const { sequelize } = require('../../src/models');
const { QueryTypes } = require('sequelize');

(async () => {
  const rows = await sequelize.query(
    `SELECT
       SUM(CASE WHEN origen_dato='REAL' AND grupo_muestra='POSPRUEBA' THEN 1 ELSE 0 END) AS posprueba,
       SUM(CASE WHEN origen_dato='REAL' AND grupo_muestra='PREPRUEBA' THEN 1 ELSE 0 END) AS preprueba,
       SUM(CASE WHEN origen_dato='REAL' AND fecha_registro BETWEEN '2026-09-01' AND '2026-09-19' THEN 1 ELSE 0 END) AS reales_ventana,
       SUM(CASE WHEN origen_dato='REAL' AND grupo_muestra='POSPRUEBA' AND fecha_registro BETWEEN '2026-09-01' AND '2026-09-19' THEN 1 ELSE 0 END) AS pos_en_ventana
     FROM envios WHERE activo=1`,
    { type: QueryTypes.SELECT }
  );
  const inc = await sequelize.query(
    `SELECT COUNT(*) AS n FROM incidencias i
     JOIN envios e ON e.id_envio=i.id_envio
     WHERE e.activo=1 AND e.origen_dato='REAL' AND e.grupo_muestra='POSPRUEBA'`,
    { type: QueryTypes.SELECT }
  );
  const fechas = await sequelize.query(
    `SELECT MIN(fecha_registro) AS minf, MAX(fecha_registro) AS maxf
     FROM envios WHERE activo=1 AND origen_dato='REAL' AND grupo_muestra='POSPRUEBA'`,
    { type: QueryTypes.SELECT }
  );
  console.log(JSON.stringify({ envios: rows[0], incidencias_pos: inc[0], fechas_pos: fechas[0] }, null, 2));
  await sequelize.close();
})();
