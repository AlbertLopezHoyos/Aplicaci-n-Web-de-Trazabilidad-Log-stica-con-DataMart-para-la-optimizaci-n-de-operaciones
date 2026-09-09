/**
 * Equipo operativo y administrador — usuarios del sistema.
 * Ejecutar: npm run db:usuarios-equipo
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, Usuario, Rol } = require('../../src/models');

const EQUIPO = [
  {
    nombres: 'Jorge',
    apellidos: 'Rudbel Salazar',
    email: 'jorge.salazar@salazarlogistica.pe',
    password: 'Jorge2026!',
    rol: 'Administrador',
    telefono: null,
  },
  {
    nombres: 'Luis Ronaldo',
    apellidos: 'Mesia',
    email: 'luis.mesia@salazarlogistica.pe',
    password: 'Luis2026!',
    rol: 'Operador logístico',
    telefono: null,
  },
  {
    nombres: 'Crosbin',
    apellidos: 'Salazar',
    email: 'crosbin.salazar@salazarlogistica.pe',
    password: 'Crosbin2026!',
    rol: 'Operador logístico',
    telefono: null,
  },
  {
    nombres: 'Mariela',
    apellidos: 'Arista',
    email: 'mariela.arista@salazarlogistica.pe',
    password: 'Mariela2026!',
    rol: 'Operador logístico',
    telefono: null,
  },
];

const run = async () => {
  await sequelize.authenticate();
  const roles = await Rol.findAll();
  const rolMap = Object.fromEntries(roles.map((r) => [r.nombre, r.id_rol]));

  console.log('\n=== Usuarios del sistema ===\n');

  for (const u of EQUIPO) {
    const idRol = rolMap[u.rol];
    if (!idRol) throw new Error(`Rol no encontrado: ${u.rol}`);
    const hash = await bcrypt.hash(u.password, 10);
    const existente = await Usuario.findOne({ where: { email: u.email } });
    if (existente) {
      await existente.update({
        nombres: u.nombres,
        apellidos: u.apellidos,
        id_rol: idRol,
        password_hash: hash,
        activo: true,
        telefono: u.telefono,
      });
      console.log(`✓ Actualizado: ${u.nombres} ${u.apellidos}`);
    } else {
      await Usuario.create({
        nombres: u.nombres,
        apellidos: u.apellidos,
        email: u.email,
        password_hash: hash,
        id_rol: idRol,
        activo: true,
        telefono: u.telefono,
      });
      console.log(`✓ Creado: ${u.nombres} ${u.apellidos}`);
    }
    console.log(`   Email: ${u.email}`);
    console.log(`   Contraseña: ${u.password}`);
    console.log(`   Rol: ${u.rol}\n`);
  }

  await Usuario.update(
    { activo: false },
    { where: { email: { [Op.in]: ['operador@salazarlogistica.pe', 'admin@salazarlogistica.pe'] } } }
  );

  console.log('Credenciales listas para ingresar al sistema.');
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
