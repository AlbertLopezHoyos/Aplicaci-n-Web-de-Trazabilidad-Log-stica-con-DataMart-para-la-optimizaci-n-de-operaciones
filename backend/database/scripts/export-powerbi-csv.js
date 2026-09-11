/**
 * Exporta tablas DataMart a CSV para Power BI (sin conector MySQL)
 * Uso: npm run db:export-powerbi
 *      npm run db:export-powerbi:railway
 */
const useRailway = process.argv.includes('--railway');
const backendRoot = require('path').join(__dirname, '../..');
require('dotenv').config({ path: require('path').join(backendRoot, '.env') });
if (useRailway) {
  require('./load-railway-env');
}
const fs = require('fs');
const path = require('path');
const sequelize = require('../../src/config/database');
const { QueryTypes } = require('sequelize');

const OUT_DIR = path.join(__dirname, '../../exports/powerbi');

const TABLES = [
  'fact_operaciones_logisticas',
  'dim_fecha',
  'dim_cliente',
  'dim_estado',
  'dim_operador',
];

const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return `\uFEFF${lines.join('\n')}`;
};

const run = async () => {
  await sequelize.authenticate();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Exportando DataMart → ${OUT_DIR}\n`);

  for (const table of TABLES) {
    const rows = await sequelize.query(`SELECT * FROM ${table}`, { type: QueryTypes.SELECT });
    const file = path.join(OUT_DIR, `${table}.csv`);
    fs.writeFileSync(file, toCsv(rows), 'utf8');
    console.log(`✓ ${table}.csv (${rows.length} filas)`);
  }

  console.log('\n✅ Listo para Power BI:');
  console.log('   Obtener datos → Texto/CSV → seleccionar cada CSV de:');
  console.log(`   ${OUT_DIR}`);
  console.log('\n   Luego: Vista Modelo → relacionar como esquema estrella.\n');
  process.exit(0);
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
