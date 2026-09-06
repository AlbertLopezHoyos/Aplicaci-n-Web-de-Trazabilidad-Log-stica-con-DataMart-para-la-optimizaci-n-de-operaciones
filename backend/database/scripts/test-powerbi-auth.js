require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Sequelize } = require('sequelize');

const PBI_USER = 'powerbi';
const PBI_PASS = process.env.POWERBI_DB_PASSWORD || 'PowerBISalazar2026';

const test = async (label, config) => {
  const s = new Sequelize(config.database, config.username, config.password, config.options);
  try {
    await s.authenticate();
    const [rows] = await s.query('SELECT COUNT(*) AS c FROM fact_operaciones_logisticas');
    console.log(`OK ${label} → hechos=${rows[0]?.c ?? rows.c}`);
    return true;
  } catch (e) {
    console.log(`FAIL ${label} → ${e.message}`);
    return false;
  } finally {
    await s.close();
  }
};

const base = {
  database: process.env.DB_NAME || 'trazabilidad_logistica',
  username: PBI_USER,
  password: PBI_PASS,
};

(async () => {
  const admin = require('../../src/config/database');
  const [users] = await admin.query(
    "SELECT user, host, plugin FROM mysql.user WHERE user='powerbi' ORDER BY host"
  );
  console.log('powerbi users:', users);

  await test('127.0.0.1', {
    ...base,
    options: { host: '127.0.0.1', port: 3306, dialect: 'mysql', logging: false },
  });
  await test('localhost', {
    ...base,
    options: { host: 'localhost', port: 3306, dialect: 'mysql', logging: false },
  });
  process.exit(0);
})();
