/**
 * Repara textos con tildes corruptos (mojibake) y sincroniza dimensiones.
 * Uso: npm run db:fix-utf8
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../../src/models');
const { QueryTypes } = require('sequelize');
const {
  NOMBRES_CLIENTES,
  ORIGENES_LIMA,
  DESTINOS_PERU,
  TIPOS_CARGA,
  AREAS,
  FUENTES,
} = require('../seeders/bulk-data');

const SEED_DNI_NAMES = {
  72345678: 'Albert López Hoyos',
  45678901: 'María García Ruiz',
  73451289: 'Carlos Mendoza Vela',
  47892345: 'Rosa Quispe Huamán',
  70123456: 'José Torres Ramírez',
};

const USUARIOS_NAMES = {
  'admin@salazarlogistica.pe': { nombres: 'Carlos', apellidos: 'Salazar Mendoza' },
  'operador@salazarlogistica.pe': { nombres: 'María', apellidos: 'Torres Vega' },
};

const ROLES_CORRECTOS = [
  { id_rol: 1, nombre: 'Administrador', descripcion: 'Acceso total al sistema, configuración y reportes' },
  { id_rol: 2, nombre: 'Operador logístico', descripcion: 'Gestión de envíos, seguimiento e incidencias' },
];

const ESTADOS_CORRECTOS = [
  { codigo: 'recibido', nombre: 'Recibido', descripcion: 'Envío registrado en almacén origen' },
  { codigo: 'en_transito', nombre: 'En tránsito', descripcion: 'Mercadería en ruta hacia destino' },
  { codigo: 'entregado', nombre: 'Entregado', descripcion: 'Entrega confirmada al destinatario' },
  { codigo: 'retrasado', nombre: 'Retrasado', descripcion: 'Fuera del plazo estimado' },
  { codigo: 'cancelado', nombre: 'Cancelado', descripcion: 'Envío cancelado' },
];

const nombreClientePorId = (id) => {
  const idx = (id - 1) % NOMBRES_CLIENTES.length;
  const base = NOMBRES_CLIENTES[idx];
  return id > NOMBRES_CLIENTES.length ? `${base} (${id})` : base;
};

const fixClientes = async () => {
  const rows = await sequelize.query('SELECT id_cliente, razon_social, dni FROM clientes ORDER BY id_cliente', {
    type: QueryTypes.SELECT,
  });
  let fixed = 0;
  for (const row of rows) {
    const correct = row.dni && SEED_DNI_NAMES[row.dni]
      ? SEED_DNI_NAMES[row.dni]
      : nombreClientePorId(row.id_cliente);
    if (row.razon_social !== correct) {
      await sequelize.query('UPDATE clientes SET razon_social = :name WHERE id_cliente = :id', {
        replacements: { name: correct, id: row.id_cliente },
      });
      fixed += 1;
    }
  }
  return fixed;
};

const fixUsuarios = async () => {
  let fixed = 0;
  for (const [email, { nombres, apellidos }] of Object.entries(USUARIOS_NAMES)) {
    const [, meta] = await sequelize.query(
      'UPDATE usuarios SET nombres = :nombres, apellidos = :apellidos WHERE email = :email',
      { replacements: { nombres, apellidos, email } }
    );
    fixed += meta?.affectedRows || 0;
  }
  return fixed;
};

const fixRoles = async () => {
  let fixed = 0;
  for (const rol of ROLES_CORRECTOS) {
    const [, meta] = await sequelize.query(
      'UPDATE roles SET nombre = :nombre, descripcion = :descripcion WHERE id_rol = :id_rol',
      { replacements: rol }
    );
    fixed += meta?.affectedRows || 0;
  }
  return fixed;
};

const fixEstados = async () => {
  let fixed = 0;
  for (const est of ESTADOS_CORRECTOS) {
    const [, meta] = await sequelize.query(
      'UPDATE estados_envio SET nombre = :nombre, descripcion = :descripcion WHERE codigo = :codigo',
      { replacements: est }
    );
    fixed += meta?.affectedRows || 0;
  }
  return fixed;
};

const MOJIBAKE = /[Ã├�]|Ã³|Ã­|Ã©|Ã¡|Ãº|Ã±/;

const fixEnvioColumn = async (column, catalog) => {
  const rows = await sequelize.query(
    `SELECT id_envio, ${column} AS val FROM envios WHERE ${column} IS NOT NULL`,
    { type: QueryTypes.SELECT }
  );
  let fixed = 0;
  for (const row of rows) {
    const val = String(row.val);
    if (!MOJIBAKE.test(val) && catalog.includes(val)) continue;
    if (!MOJIBAKE.test(val) && !catalog.includes(val)) {
      const byPrefix = catalog.find((c) => c.slice(0, 5) === val.slice(0, 5));
      if (byPrefix && byPrefix !== val) {
        await sequelize.query(`UPDATE envios SET ${column} = :val WHERE id_envio = :id`, {
          replacements: { val: byPrefix, id: row.id_envio },
        });
        fixed += 1;
      }
      continue;
    }
    const replacement =
      catalog.find((c) => c.slice(0, 4) === val.slice(0, 4)) ||
      catalog[row.id_envio % catalog.length];
    await sequelize.query(`UPDATE envios SET ${column} = :val WHERE id_envio = :id`, {
      replacements: { val: replacement, id: row.id_envio },
    });
    fixed += 1;
  }
  return fixed;
};

const syncDimCliente = async () => {
  const [r] = await sequelize.query(
    `UPDATE dim_cliente dc
     JOIN clientes c ON c.id_cliente = dc.id_cliente_origen
     SET dc.razon_social = c.razon_social
     WHERE dc.es_actual = 1 AND dc.razon_social <> c.razon_social`
  );
  return r?.affectedRows || 0;
};

const ensureUtf8Session = async () => {
  await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  await sequelize.query(
    "ALTER DATABASE trazabilidad_logistica CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
};

const run = async () => {
  await sequelize.authenticate();
  console.log('Reparando codificación UTF-8...\n');

  await ensureUtf8Session();

  const clientes = await fixClientes();
  console.log(`✓ Clientes corregidos: ${clientes}`);

  const usuarios = await fixUsuarios();
  console.log(`✓ Usuarios corregidos: ${usuarios}`);

  const roles = await fixRoles();
  console.log(`✓ Roles corregidos: ${roles}`);

  const estados = await fixEstados();
  console.log(`✓ Estados corregidos: ${estados}`);

  const origen = await fixEnvioColumn('origen', ORIGENES_LIMA);
  const destino = await fixEnvioColumn('destino', DESTINOS_PERU);
  const tipo = await fixEnvioColumn('tipo_carga', TIPOS_CARGA);
  console.log(`✓ Envíos (origen/destino/tipo): ${origen}/${destino}/${tipo}`);

  const dim = await syncDimCliente();
  console.log(`✓ dim_cliente sincronizada: ${dim}`);

  const sample = await sequelize.query(
    'SELECT id_cliente, razon_social FROM clientes ORDER BY id_cliente LIMIT 8',
    { type: QueryTypes.SELECT }
  );
  console.log('\nMuestra clientes:');
  sample.forEach((c) => {
    console.log(`  ${c.id_cliente}. ${c.razon_social}`);
  });

  console.log('\n✅ UTF-8 reparado. Reinicie el backend si estaba corriendo.\n');
  process.exit(0);
};

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
