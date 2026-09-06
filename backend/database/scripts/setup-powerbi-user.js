/**
 * Crea usuario MySQL compatible con Power BI (mysql_native_password)
 * Uso: node database/scripts/setup-powerbi-user.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../../src/config/database');

const PBI_USER = 'powerbi';
const PBI_PASS = process.env.POWERBI_DB_PASSWORD || 'PowerBISalazar2026';

const run = async () => {
  await sequelize.authenticate();
  console.log('Conectado a MySQL\n');

  const [users] = await sequelize.query(
    "SELECT user, host, plugin FROM mysql.user WHERE user IN ('root', 'powerbi') ORDER BY user, host"
  );
  console.log('Usuarios actuales (plugin de auth):');
  users.forEach((u) => console.log(`  ${u.user}@${u.host} → ${u.plugin}`));

  const hosts = ['localhost', '127.0.0.1', '%'];
  for (const host of hosts) {
    await sequelize.query(`DROP USER IF EXISTS '${PBI_USER}'@'${host}'`);
    await sequelize.query(
      `CREATE USER '${PBI_USER}'@'${host}' IDENTIFIED WITH mysql_native_password BY :pass`,
      { replacements: { pass: PBI_PASS } }
    );
    await sequelize.query(
      `GRANT SELECT ON ${process.env.DB_NAME || 'trazabilidad_logistica'}.* TO '${PBI_USER}'@'${host}'`
    );
  }

  await sequelize.query('FLUSH PRIVILEGES');

  console.log('\n✅ Usuario Power BI creado.\n');
  console.log('Use en Power BI:');
  console.log(`  Servidor: 127.0.0.1`);
  console.log(`  Base:     ${process.env.DB_NAME || 'trazabilidad_logistica'}`);
  console.log(`  Usuario:  ${PBI_USER}`);
  console.log(`  Password: ${PBI_PASS}`);
  console.log('\n(Sin @ en la contraseña — evita problemas del conector)\n');
  process.exit(0);
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
