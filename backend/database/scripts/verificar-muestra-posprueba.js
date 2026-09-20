require('./load-railway-env');
const { sequelize } = require('../../src/models');
const { QueryTypes } = require('sequelize');

(async () => {
  const [c] = await sequelize.query(
    `SELECT
       SUM(grupo_muestra='POSPRUEBA') AS pos,
       SUM(grupo_muestra='PREPRUEBA') AS pre,
       SUM(grupo_muestra='NO_MUESTRA') AS no,
       SUM(origen_dato='REAL' AND fecha_registro BETWEEN '2026-09-01' AND '2026-09-20') AS reales_ventana
     FROM envios WHERE activo=1`,
    { type: QueryTypes.SELECT }
  );
  const posFechas = await sequelize.query(
    `SELECT fecha_registro, origen_dato, COUNT(*) n
     FROM envios WHERE activo=1 AND grupo_muestra='POSPRUEBA'
     GROUP BY fecha_registro, origen_dato ORDER BY fecha_registro`,
    { type: QueryTypes.SELECT }
  );
  console.log(JSON.stringify({ c, posFechas }, null, 2));
  await sequelize.close();
})();
