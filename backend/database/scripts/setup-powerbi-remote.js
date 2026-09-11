/**
 * Prepara MySQL en la nube (Railway) para Power BI Desktop remoto:
 * - Vistas pbi_* del DataMart (solo lectura analítica)
 * - Usuario powerbi con mysql_native_password y host remoto (%)
 * - Permisos SELECT limitados al DataMart
 *
 * Uso local contra Railway:
 *   npm run db:powerbi-setup
 *   npm run db:powerbi-setup:railway   (fuerza .env.railway)
 *
 * Variables opcionales en .env / .env.railway:
 *   POWERBI_DB_PASSWORD=...   (sin @ en la contraseña)
 */
const path = require('path');

const useRailway = process.argv.includes('--railway');
const backendRoot = path.join(__dirname, '../..');

require('dotenv').config({ path: path.join(backendRoot, '.env') });
if (useRailway) {
  require('./load-railway-env');
}

const sequelize = require('../../src/config/database');

const PBI_USER = 'powerbi';
const PBI_PASS = process.env.POWERBI_DB_PASSWORD || 'PowerBISalazar2026';
const DB_NAME = process.env.DB_NAME || 'trazabilidad_logistica';

const PBI_VIEWS = [
  {
    name: 'pbi_fact_operaciones',
    sql: 'SELECT * FROM fact_operaciones_logisticas',
  },
  {
    name: 'pbi_dim_fecha',
    sql: 'SELECT * FROM dim_fecha',
  },
  {
    name: 'pbi_dim_cliente',
    sql: 'SELECT * FROM dim_cliente WHERE es_actual = 1',
  },
  {
    name: 'pbi_dim_estado',
    sql: 'SELECT * FROM dim_estado WHERE es_actual = 1',
  },
  {
    name: 'pbi_dim_operador',
    sql: 'SELECT * FROM dim_operador WHERE es_actual = 1',
  },
  {
    name: 'pbi_etl_ejecuciones',
    sql: 'SELECT * FROM etl_ejecuciones',
  },
];

const GRANT_OBJECTS = [
  ...PBI_VIEWS.map((v) => v.name),
  'fact_operaciones_logisticas',
  'dim_fecha',
  'dim_cliente',
  'dim_estado',
  'dim_operador',
  'etl_ejecuciones',
];

const tableExists = async (table) => {
  const rows = await sequelize.query(
    `SELECT 1 AS ok FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table`,
    { replacements: { table }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.length > 0;
};

const createViews = async () => {
  for (const view of PBI_VIEWS) {
    const baseTable = view.sql.match(/FROM\s+(\w+)/i)?.[1];
    if (baseTable && !(await tableExists(baseTable))) {
      console.log(`  · omitida ${view.name} (falta tabla ${baseTable})`);
      continue;
    }
    await sequelize.query(`CREATE OR REPLACE VIEW \`${view.name}\` AS ${view.sql}`);
    console.log(`  ✓ vista ${view.name}`);
  }
};

const isRailwayHost = (host) => host.includes('rlwy.net') || host.includes('railway.app');

const setupUser = async () => {
  const dbHost = process.env.DB_HOST || '';
  const useNativePassword = !isRailwayHost(dbHost);

  const hosts = ['%', 'localhost', '127.0.0.1'];
  for (const host of hosts) {
    await sequelize.query(`DROP USER IF EXISTS '${PBI_USER}'@'${host}'`);
    if (useNativePassword) {
      await sequelize.query(
        `CREATE USER '${PBI_USER}'@'${host}' IDENTIFIED WITH mysql_native_password BY :pass`,
        { replacements: { pass: PBI_PASS } }
      );
    } else {
      await sequelize.query(
        `CREATE USER '${PBI_USER}'@'${host}' IDENTIFIED BY :pass`,
        { replacements: { pass: PBI_PASS } }
      );
    }
    for (const obj of GRANT_OBJECTS) {
      const isView = PBI_VIEWS.some((v) => v.name === obj);
      const baseTable = isView
        ? PBI_VIEWS.find((v) => v.name === obj)?.sql.match(/FROM\s+(\w+)/i)?.[1]
        : obj;
      if (baseTable && !(await tableExists(baseTable))) continue;
      try {
        await sequelize.query(
          `GRANT SELECT ON \`${DB_NAME}\`.\`${obj}\` TO '${PBI_USER}'@'${host}'`
        );
      } catch (err) {
        if (!err.message?.includes('Unknown table')) throw err;
      }
    }
  }
  await sequelize.query('FLUSH PRIVILEGES');
};

const printConnectionCard = async () => {
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const ssl = process.env.DB_SSL === 'true' || host.includes('rlwy.net') || host.includes('railway.app');

  let factCount = 0;
  let realCount = 0;
  let sintCount = 0;
  try {
    const [rows] = await sequelize.query('SELECT COUNT(*) AS c FROM fact_operaciones_logisticas');
    factCount = rows[0]?.c ?? rows.c ?? 0;
    const [byOrigen] = await sequelize.query(
      `SELECT origen_dato, COUNT(*) AS c FROM fact_operaciones_logisticas GROUP BY origen_dato`
    );
    for (const row of byOrigen) {
      if (row.origen_dato === 'REAL') realCount = row.c;
      if (row.origen_dato === 'SINTETICO') sintCount = row.c;
    }
  } catch {
    /* tablas aún no cargadas */
  }

  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  Power BI — conexión remota (MySQL en la nube)');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`  Servidor:     ${host}`);
  console.log(`  Puerto:       ${port}`);
  console.log(`  Base de datos:${DB_NAME}`);
  console.log(`  Usuario:      ${PBI_USER}`);
  console.log(`  Contraseña:   ${PBI_PASS}`);
  console.log(`  SSL:          ${ssl ? 'Requerido (Railway)' : 'Opcional'}`);
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  Hechos cargados: ${factCount} (REAL: ${realCount}, SINTETICO: ${sintCount})`);
  console.log('  Tablas recomendadas en Power BI:');
  PBI_VIEWS.forEach((v) => console.log(`    · ${v.name}`));
  console.log('──────────────────────────────────────────────────────────');
  console.log('  Power BI Desktop → Obtener datos → MySQL');
  console.log('  Servidor: host:puerto   (ej. tokaido.proxy.rlwy.net:18507)');
  console.log('  Modo: Importar (recomendado) o DirectQuery');
  console.log('  Guía completa: docs/POWERBI.md');
  console.log('  Plantilla:     powerbi/Conexion-Railway.pbids');
  console.log('══════════════════════════════════════════════════════════\n');
};

const run = async () => {
  await sequelize.authenticate();
  const host = process.env.DB_HOST || 'localhost';
  console.log(`Conectado a MySQL (${host}:${process.env.DB_PORT || 3306}/${DB_NAME})\n`);

  console.log('1/3 Creando vistas pbi_* ...');
  await createViews();

  console.log('\n2/3 Usuario powerbi (acceso remoto %) ...');
  await setupUser();
  console.log('  ✓ permisos SELECT sobre DataMart');

  console.log('\n3/3 Resumen de conexión');
  await printConnectionCard();
  process.exit(0);
};

run().catch((err) => {
  console.error('\n❌ Error:', err.message);
  if (err.message?.includes('fact_operaciones_logisticas')) {
    console.error('   Ejecute antes: npm run db:etl  (o db:railway:all)');
  }
  process.exit(1);
});
