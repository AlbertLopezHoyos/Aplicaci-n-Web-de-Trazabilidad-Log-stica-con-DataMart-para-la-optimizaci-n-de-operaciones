/**
 * Restaura/sortea la muestra posprueba de 50 en Railway (sin pasar por Vercel).
 * Uso: node database/scripts/aleatorizar-posprueba-railway.js
 */
require('./load-railway-env');
const { sequelize } = require('../../src/models');
const { aleatorizarPosprueba } = require('../../src/services/observacion.service');

(async () => {
  const t0 = Date.now();
  await sequelize.authenticate();
  const r = await aleatorizarPosprueba();
  console.log(r);
  console.log(`Tiempo: ${Date.now() - t0} ms`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
