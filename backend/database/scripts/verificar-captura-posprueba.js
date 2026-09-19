require('./load-railway-env');
const { sequelize } = require('../../src/models');
const { QueryTypes } = require('sequelize');

(async () => {
  const [tot] = await sequelize.query(
    `SELECT MAX(fecha_registro) AS max_fecha, MIN(fecha_registro) AS min_fecha, COUNT(*) AS total
     FROM envios WHERE activo = 1 AND origen_dato = 'REAL' AND fecha_registro BETWEEN '2026-09-01' AND '2026-09-19'`,
    { type: QueryTypes.SELECT }
  );
  const dias = await sequelize.query(
    `SELECT fecha_registro, COUNT(*) AS n FROM envios
     WHERE activo = 1 AND origen_dato = 'REAL' AND fecha_registro BETWEEN '2026-09-01' AND '2026-09-19'
     GROUP BY fecha_registro ORDER BY fecha_registro DESC LIMIT 8`,
    { type: QueryTypes.SELECT }
  );
  console.log(JSON.stringify({ tot, ultimosDias: dias }, null, 2));
  await sequelize.close();
})();
