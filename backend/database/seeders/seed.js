/**
 * Seeder Node.js - Actualiza contraseñas bcrypt e inserta envíos de ejemplo
 * Ejecutar: npm run db:seed (después del script SQL)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { sequelize, Usuario, Envio, EstadoEnvio, Cliente, Incidencia } = require('../../src/models');

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a MySQL');

    const adminHash = await bcrypt.hash('Admin123!', 10);
    const operHash = await bcrypt.hash('Operador123!', 10);

    await Usuario.update({ password_hash: adminHash }, { where: { email: 'admin@salazarlogistica.pe' } });
    await Usuario.update({ password_hash: operHash }, { where: { email: 'operador@salazarlogistica.pe' } });
    console.log('✓ Contraseñas actualizadas');

    const count = await Envio.count();
    if (count > 0) {
      console.log('Envíos ya existen, omitiendo datos demo');
      process.exit(0);
    }

    const estados = await EstadoEnvio.findAll();
    const map = Object.fromEntries(estados.map((e) => [e.codigo, e.id_estado]));
    const clientes = await Cliente.findAll({ limit: 5 });
    const operador = await Usuario.findOne({ where: { email: 'operador@salazarlogistica.pe' } });

    const samples = [
      { codigo: 'GLS-2026-00001', cliente: 0, estado: 'entregado', origen: 'Lima - Surquillo', destino: 'Arequipa Centro', tipo: 'Carga general', peso: 450 },
      { codigo: 'GLS-2026-00002', cliente: 1, estado: 'en_transito', origen: 'Callao', destino: 'Trujillo', tipo: 'Encomienda', peso: 25 },
      { codigo: 'GLS-2026-00003', cliente: 2, estado: 'recibido', origen: 'Lima - Ate', destino: 'Cusco', tipo: 'Mudanza parcial', peso: 1200 },
      { codigo: 'GLS-2026-00004', cliente: 3, estado: 'retrasado', origen: 'Villa El Salvador', destino: 'Piura', tipo: 'Carga refrigerada', peso: 800 },
      { codigo: 'GLS-2026-00005', cliente: 4, estado: 'en_transito', origen: 'Lince', destino: 'Ica', tipo: 'Equipos tecnológicos', peso: 150 },
      { codigo: 'GLS-2026-00006', cliente: 0, estado: 'recibido', origen: 'La Molina', destino: 'Huancayo', tipo: 'Documentación', peso: 5 },
      { codigo: 'GLS-2026-00007', cliente: 1, estado: 'entregado', origen: 'Los Olivos', destino: 'Chiclayo', tipo: 'Repuestos', peso: 320 },
      { codigo: 'GLS-2026-00008', cliente: 2, estado: 'cancelado', origen: 'Miraflores', destino: 'Tacna', tipo: 'Muebles', peso: 600 },
    ];

    const hoy = new Date().toISOString().split('T')[0];
    for (const s of samples) {
      const c = clientes[s.cliente % clientes.length];
      await Envio.create({
        codigo_envio: s.codigo,
        id_cliente: c.id_cliente,
        id_estado_actual: map[s.estado],
        id_responsable: operador?.id_usuario,
        origen: s.origen,
        destino: s.destino,
        fecha_registro: hoy,
        fecha_estimada_entrega: hoy,
        tipo_carga: s.tipo,
        peso_kg: s.peso,
        total_envio: Math.round((35 + s.peso * 2.2 + 8) * 100) / 100,
        nombre_destinatario: `Destinatario ${s.destino}`,
        dni_destinatario: String(10000000 + (samples.indexOf(s) * 7919) % 89999999).padStart(8, '0').slice(0, 8),
        telefono_destinatario: `9${String(10000000 + (samples.indexOf(s) * 3571) % 89999999).padStart(8, '0').slice(0, 8)}`,
        observaciones: 'Envío de demostración - Tesis 2026',
        // Datos de demostración: no forman parte de la muestra de investigación.
        origen_dato: 'SINTETICO',
        grupo_muestra: 'NO_MUESTRA',
      });
    }
    console.log(`✓ ${samples.length} envíos de ejemplo creados`);

    const envioRetrasado = await Envio.findOne({ where: { codigo_envio: 'GLS-2026-00004' } });
    if (envioRetrasado) {
      await Incidencia.bulkCreate([
        {
          id_envio: envioRetrasado.id_envio,
          id_usuario_reporta: operador?.id_usuario,
          codigo_incidencia: 'INC-2026-00001',
          tipo: 'retraso',
          severidad: 'alta',
          area: 'Transporte',
          fuente_principal: 'Llamada telefónica',
          informacion_completa: true,
          titulo: 'Retraso por congestión en Panamericana Norte',
          descripcion: 'Demora estimada de 24 horas por obras viales.',
          origen_dato: 'SINTETICO',
          grupo_muestra: 'NO_MUESTRA',
        },
        {
          id_envio: envioRetrasado.id_envio,
          id_usuario_reporta: operador?.id_usuario,
          codigo_incidencia: 'INC-2026-00002',
          tipo: 'observacion',
          severidad: 'media',
          area: 'Atención al cliente',
          fuente_principal: 'Correo electrónico',
          informacion_completa: true,
          titulo: 'Cliente notificado',
          descripcion: 'Se informó al cliente sobre nueva fecha estimada.',
          estado_incidencia: 'resuelta',
          fecha_resolucion: new Date(),
          origen_dato: 'SINTETICO',
          grupo_muestra: 'NO_MUESTRA',
        },
      ]);
      console.log('✓ Incidencias de ejemplo creadas');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
