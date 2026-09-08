/**
 * Fase B — Reset limpio de BD local
 * 01_schema → 02_medicion → 03_dimension4 → 07_muestra → seed → seed-bulk → ETL → diagnóstico
 *
 * La migración 07 debe ejecutarse ANTES de los seeders para que estos puedan
 * marcar sus registros como datos sintéticos.
 *
 * Uso: npm run db:phase-b
 *      SKIP_BULK=1 npm run db:phase-b   (omitir carga masiva)
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const backendRoot = path.join(__dirname, '../..');
const scriptsDir = __dirname;
const MYSQL =
  process.env.MYSQL_BIN || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';

const toSourcePath = (filePath) => path.resolve(filePath).replace(/\\/g, '/');

const runSql = (filename) => {
  const file = path.join(scriptsDir, filename);
  if (!fs.existsSync(file)) throw new Error(`No existe: ${file}`);
  console.log(`\n▶ SQL: ${filename}\n`);
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const env = { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' };
  const sourcePath = toSourcePath(file);
  execSync(
    `"${MYSQL}" --default-character-set=utf8mb4 -h ${host} -P ${port} -u ${user} -e "source ${sourcePath}"`,
    {
      env,
      stdio: 'inherit',
      shell: true,
    }
  );
};

const runNode = (relativeScript) => {
  console.log(`\n▶ Node: ${relativeScript}\n`);
  execSync(`node ${relativeScript}`, { cwd: backendRoot, stdio: 'inherit', env: process.env });
};

const main = async () => {
  if (!fs.existsSync(MYSQL)) {
    console.error(`❌ No se encontró mysql.exe en: ${MYSQL}`);
    console.error('   Defina MYSQL_BIN en backend/.env si está en otra ruta.');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log(' FASE B — Reset limpio BD (trazabilidad_logistica)');
  console.log(` Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`);
  console.log('═══════════════════════════════════════════════════════');

  runSql('01_schema_completo.sql');
  runSql('02_medicion_fichas.sql');
  runSql('03_dimension4_gestion_informacion.sql');
  runSql('07_muestra_investigacion.sql');

  runNode('database/seeders/seed.js');

  if (process.env.SKIP_BULK !== '1') {
    runNode('database/seeders/seed-bulk.js');
  } else {
    console.log('\n⏭ SKIP_BULK=1 — omitiendo seed-bulk\n');
  }

  runNode('database/scripts/run-etl.js');

  const diagOut = path.join(scriptsDir, '_diagnostico_ultimo.txt');
  console.log(`\n▶ Diagnóstico → ${path.basename(diagOut)}\n`);
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const env = { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' };
  const sourcePath = toSourcePath(path.join(scriptsDir, '05_diagnostico_bd.sql'));
  const output = execSync(
    `"${MYSQL}" --default-character-set=utf8mb4 -h ${host} -P ${port} -u ${user} -e "source ${sourcePath}"`,
    { env, encoding: 'utf8', shell: true }
  );
  fs.writeFileSync(diagOut, output, 'utf8');

  console.log('\n✅ Fase B completada.');
  console.log('   Frontend: VITE_DEMO_MODE=false en frontend/.env');
  console.log('   Credenciales: admin@salazarlogistica.pe / Admin123!\n');
};

main().catch((err) => {
  console.error('\n❌ Error en Fase B:', err.message);
  process.exit(1);
});
