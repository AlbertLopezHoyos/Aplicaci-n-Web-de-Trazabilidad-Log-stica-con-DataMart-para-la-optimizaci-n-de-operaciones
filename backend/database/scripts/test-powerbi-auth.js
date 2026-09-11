/**
 * Prueba login del usuario powerbi contra MySQL (local o Railway).
 * Uso: npm run db:powerbi-test
 *      npm run db:powerbi-test:railway
 */
const path = require('path');
const { Sequelize } = require('sequelize');

const useRailway = process.argv.includes('--railway');
const backendRoot = path.join(__dirname, '../..');

require('dotenv').config({ path: path.join(backendRoot, '.env') });
if (useRailway) {
  require('./load-railway-env');
}

const PBI_USER = 'powerbi';
const PBI_PASS = process.env.POWERBI_DB_PASSWORD || 'PowerBISalazar2026';
const DB_NAME = process.env.DB_NAME || 'trazabilidad_logistica';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const useSsl =
  process.env.DB_SSL === 'true' ||
  DB_HOST.includes('rlwy.net') ||
  DB_HOST.includes('railway.app');

const buildSequelize = () =>
  new Sequelize(DB_NAME, PBI_USER, PBI_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false,
    dialectOptions: useSsl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  });

const test = async (label, query) => {
  const s = buildSequelize();
  try {
    await s.authenticate();
    const [rows] = await s.query(query);
    const row = rows[0] ?? rows;
    console.log(`OK  ${label}`);
    return row;
  } catch (e) {
    console.log(`FAIL ${label} → ${e.message}`);
    return null;
  } finally {
    await s.close();
  }
};

(async () => {
  console.log(`Probando powerbi@${DB_HOST}:${DB_PORT}/${DB_NAME} (SSL: ${useSsl})\n`);

  const fact = await test('fact_operaciones_logisticas', 'SELECT COUNT(*) AS c FROM fact_operaciones_logisticas');
  if (fact) console.log(`    hechos: ${fact.c}`);

  const view = await test('pbi_fact_operaciones', 'SELECT COUNT(*) AS c FROM pbi_fact_operaciones');
  if (view) console.log(`    vista pbi: ${view.c}`);

  const s2 = buildSequelize();
  try {
    await s2.authenticate();
    const [rows] = await s2.query(`
      SELECT origen_dato, COUNT(*) AS c
      FROM pbi_fact_operaciones
      GROUP BY origen_dato
    `);
    console.log('OK  desglose origen_dato');
    rows.forEach((r) => console.log(`    ${r.origen_dato}: ${r.c}`));
  } catch (e) {
    console.log(`FAIL desglose origen_dato → ${e.message}`);
  } finally {
    await s2.close();
  }

  if (!fact && !view) {
    console.log('\nEjecute primero: npm run db:powerbi-setup');
    process.exit(1);
  }

  console.log('\n✅ Usuario powerbi listo para Power BI Desktop.');
  process.exit(0);
})();
