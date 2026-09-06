/**
 * Pipeline completo: seed demo → bulk 5500 → fix estados → ETL DataMart (Railway)
 * Uso: npm run db:railway:all
 */
const { execSync } = require('child_process');
const path = require('path');
const { backendRoot } = require('./load-railway-env');
const sequelize = require('../../src/models').sequelize;

const run = (script) => {
  console.log(`\n▶ ${script}\n`);
  execSync(`node ${script}`, { cwd: backendRoot, stdio: 'inherit', env: process.env });
};

const main = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✓ Conectado a Railway MySQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);

    run('database/seeders/seed.js');
    run('database/seeders/seed-bulk.js');
    run('database/seeders/fix-estados.js');
    run('database/scripts/run-etl.js');

    console.log('\n✅ Railway listo. Verifica en la web: DataMart (admin) → Ejecutar ETL si hace falta.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    if (err.message?.includes('ECONNREFUSED') || err.message?.includes('Access denied')) {
      console.error('   Revisa host, puerto y password en backend/.env.railway');
    }
    process.exit(1);
  }
};

main();
