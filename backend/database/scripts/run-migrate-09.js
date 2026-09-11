/**
 * Migración 09: destinatario (nombre + DNI + teléfono) en envíos.
 * Uso: npm run db:migrate-09
 *      npm run db:migrate-09:railway
 */
const useRailway = process.argv.includes('--railway');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (useRailway) {
  require('./load-railway-env');
}
const { sequelize } = require('../../src/models');

const addColumnIfMissing = async (table, column, definition) => {
  const rows = await sequelize.query(
    `SELECT 1 AS ok FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column }, type: sequelize.QueryTypes.SELECT }
  );
  if (!rows.length) {
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`  + columna ${table}.${column}`);
  } else {
    console.log(`  · columna ${table}.${column} ya existe`);
  }
};

const run = async () => {
  await sequelize.authenticate();
  console.log(`Migración 09: destinatario en envíos (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);

  await addColumnIfMissing(
    'envios',
    'nombre_destinatario',
    "VARCHAR(150) NULL COMMENT 'Persona que recibe el envío'"
  );
  await addColumnIfMissing(
    'envios',
    'dni_destinatario',
    "VARCHAR(8) NULL COMMENT 'DNI del destinatario (8 dígitos)'"
  );
  await addColumnIfMissing(
    'envios',
    'telefono_destinatario',
    "VARCHAR(20) NULL COMMENT 'Teléfono del destinatario'"
  );

  const [, backfillMeta] = await sequelize.query(`
    UPDATE envios e
    JOIN clientes c ON c.id_cliente = e.id_cliente
    SET
      e.nombre_destinatario = COALESCE(NULLIF(TRIM(e.nombre_destinatario), ''), CONCAT('Destinatario ', c.razon_social)),
      e.dni_destinatario = COALESCE(
        NULLIF(TRIM(e.dni_destinatario), ''),
        LPAD(MOD(e.id_envio * 7919, 89999999) + 10000000, 8, '0')
      ),
      e.telefono_destinatario = COALESCE(
        NULLIF(TRIM(e.telefono_destinatario), ''),
        COALESCE(NULLIF(TRIM(c.telefono), ''), '999000000')
      )
    WHERE e.nombre_destinatario IS NULL
       OR TRIM(e.nombre_destinatario) = ''
       OR e.dni_destinatario IS NULL
       OR TRIM(e.dni_destinatario) = ''
       OR e.telefono_destinatario IS NULL
       OR TRIM(e.telefono_destinatario) = ''
  `);
  console.log(`  ✓ backfill: ${backfillMeta?.affectedRows ?? 0} filas`);

  await sequelize.query(`
    ALTER TABLE envios
      MODIFY COLUMN nombre_destinatario VARCHAR(150) NOT NULL,
      MODIFY COLUMN dni_destinatario VARCHAR(8) NOT NULL,
      MODIFY COLUMN telefono_destinatario VARCHAR(20) NOT NULL
  `);
  console.log('✓ Migración 09 completada');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
