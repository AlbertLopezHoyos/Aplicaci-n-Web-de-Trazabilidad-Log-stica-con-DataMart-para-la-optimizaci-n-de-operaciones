/**
 * Marca registros EXISTENTES como parte de la muestra de investigación.
 *
 * Este script NO genera datos: solo etiqueta envíos que ya están en la base
 * (registrados desde la aplicación web) para separarlos de los datos
 * sintéticos del DataMart.
 *
 * Muestra de la tesis: 50 registros de preprueba + 50 de posprueba
 * (100 en total, NO pareados).
 *
 * Uso:
 *   npm run db:muestra -- --estado
 *   npm run db:muestra -- --grupo=PREPRUEBA --desde=2026-03-01 --hasta=2026-03-31
 *   npm run db:muestra -- --grupo=POSPRUEBA --codigos=GLS-2026-00120,GLS-2026-00121
 *   npm run db:muestra -- --grupo=NO_MUESTRA --codigos=GLS-2026-00120   (deshacer)
 *
 * Opciones:
 *   --grupo    PREPRUEBA | POSPRUEBA | NO_MUESTRA
 *   --desde    fecha_registro >= YYYY-MM-DD
 *   --hasta    fecha_registro <= YYYY-MM-DD
 *   --codigos  lista de codigo_envio separada por comas
 *   --limite   máximo de envíos a marcar (por defecto 50)
 *   --aplicar  ejecuta los cambios (sin este flag solo simula)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, Envio, Incidencia } = require('../../src/models');
const { Op } = require('sequelize');
const {
  ORIGEN_DATO,
  GRUPO_MUESTRA,
  TAMANIO_GRUPO_MUESTRA,
  ventanaDeGrupo,
  estaEnVentana,
} = require('../../src/utils/reglasIndicadores');

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((raw) => {
    const [clave, valor] = raw.replace(/^--/, '').split('=');
    args[clave] = valor === undefined ? true : valor;
  });
  return args;
};

const mostrarEstado = async () => {
  const filas = await Envio.findAll({
    attributes: [
      'origen_dato',
      'grupo_muestra',
      [sequelize.fn('COUNT', sequelize.col('id_envio')), 'total'],
    ],
    where: { activo: true },
    group: ['origen_dato', 'grupo_muestra'],
    raw: true,
  });
  console.log('\nDistribución actual de envíos activos:');
  console.table(filas);
  const preprueba = filas.find((f) => f.origen_dato === 'REAL' && f.grupo_muestra === 'PREPRUEBA')?.total || 0;
  const posprueba = filas.find((f) => f.origen_dato === 'REAL' && f.grupo_muestra === 'POSPRUEBA')?.total || 0;
  console.log(`Preprueba: ${preprueba}/${TAMANIO_GRUPO_MUESTRA}   Posprueba: ${posprueba}/${TAMANIO_GRUPO_MUESTRA}`);
  if (Number(preprueba) !== TAMANIO_GRUPO_MUESTRA || Number(posprueba) !== TAMANIO_GRUPO_MUESTRA) {
    console.log('La muestra aún no está completa. Los indicadores se calcularán sobre lo marcado.');
  }
};

const run = async () => {
  const args = parseArgs();
  await sequelize.authenticate();

  if (args.estado || !args.grupo) {
    await mostrarEstado();
    if (!args.grupo) {
      console.log('\nIndique --grupo=PREPRUEBA|POSPRUEBA|NO_MUESTRA para marcar registros.');
    }
    process.exit(0);
  }

  const grupo = String(args.grupo).toUpperCase();
  if (!Object.values(GRUPO_MUESTRA).includes(grupo)) {
    console.error(`Grupo inválido: ${grupo}. Use PREPRUEBA, POSPRUEBA o NO_MUESTRA.`);
    process.exit(1);
  }

  const where = { activo: true };
  if (args.codigos) {
    where.codigo_envio = { [Op.in]: String(args.codigos).split(',').map((c) => c.trim()).filter(Boolean) };
  } else {
    // Sin lista explícita solo se consideran envíos reales aún no clasificados.
    where.origen_dato = ORIGEN_DATO.REAL;
    where.grupo_muestra = GRUPO_MUESTRA.NO_MUESTRA;
  }
  if (args.desde || args.hasta) {
    where.fecha_registro = {};
    if (args.desde) where.fecha_registro[Op.gte] = args.desde;
    if (args.hasta) where.fecha_registro[Op.lte] = args.hasta;
  }

  const limite = args.codigos ? undefined : Number(args.limite) || TAMANIO_GRUPO_MUESTRA;
  const candidatos = await Envio.findAll({
    where,
    order: [['fecha_registro', 'ASC'], ['id_envio', 'ASC']],
    ...(limite ? { limit: limite } : {}),
  });

  if (!candidatos.length) {
    console.log('No se encontraron envíos que cumplan el criterio. No se modificó nada.');
    await mostrarEstado();
    process.exit(0);
  }

  const sinteticos = candidatos.filter((e) => e.origen_dato === ORIGEN_DATO.SINTETICO);
  if (sinteticos.length && grupo !== GRUPO_MUESTRA.NO_MUESTRA) {
    console.error(
      `\nSe detectaron ${sinteticos.length} envíos SINTÉTICOS en la selección ` +
      '(por ejemplo ' + sinteticos.slice(0, 3).map((e) => e.codigo_envio).join(', ') + ').\n' +
      'Los datos sintéticos no pueden formar parte de la muestra de investigación. Operación cancelada.'
    );
    process.exit(1);
  }

  console.log(`\nEnvíos seleccionados: ${candidatos.length} → grupo ${grupo}`);
  console.log(candidatos.slice(0, 10).map((e) => `  ${e.codigo_envio}  ${e.fecha_registro}`).join('\n'));
  if (candidatos.length > 10) console.log(`  ... y ${candidatos.length - 10} más`);

  const ventana = ventanaDeGrupo(grupo);
  if (ventana) {
    const fuera = candidatos.filter((e) => !estaEnVentana(grupo, e.fecha_registro));
    if (fuera.length) {
      console.error(
        `\n${fuera.length} de ${candidatos.length} envíos quedan fuera del periodo de observación ` +
        `declarado en el ${ventana.anexo} (${ventana.desde} a ${ventana.hasta}), por ejemplo ` +
        fuera.slice(0, 3).map((e) => `${e.codigo_envio} (${e.fecha_registro})`).join(', ') + '.\n' +
        'Marcarlos invalidaría la ficha. Ajuste el rango de fechas. Operación cancelada.'
      );
      process.exit(1);
    }
  }

  if (!args.aplicar) {
    console.log('\nSimulación. Vuelva a ejecutar con --aplicar para guardar los cambios.');
    process.exit(0);
  }

  const ids = candidatos.map((e) => e.id_envio);
  await Envio.update({ grupo_muestra: grupo }, { where: { id_envio: { [Op.in]: ids } } });
  // Las incidencias heredan siempre la clasificación de su envío.
  await Incidencia.update(
    { grupo_muestra: grupo, origen_dato: ORIGEN_DATO.REAL },
    { where: { id_envio: { [Op.in]: ids } } }
  );

  console.log(`\n✓ ${ids.length} envíos y sus incidencias marcados como ${grupo}.`);
  await mostrarEstado();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
