/**
 * Normaliza los 50 envíos de POSPRUEBA al nuevo catálogo operativo:
 * - origen = Lima
 * - tipo_carga ∈ { frágil, general, vulnerable }
 * - detalle anterior en observaciones (si aplica)
 *
 * NO modifica datos SINTETICO (5500 del DataMart).
 *
 * Uso: npm run db:posprueba-actualizar
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, Envio } = require('../../src/models');
const { ORIGEN_DATO, GRUPO_MUESTRA } = require('../../src/utils/reglasIndicadores');
const {
  ORIGEN_ENVIO_FIJO,
  TIPOS_CARGA_OPERATIVOS,
  pick,
  especificacionAleatoria,
} = require('../../src/utils/tiposCarga');

const run = async () => {
  await sequelize.authenticate();

  const envios = await Envio.findAll({
    where: {
      activo: true,
      origen_dato: ORIGEN_DATO.REAL,
      grupo_muestra: GRUPO_MUESTRA.POSPRUEBA,
    },
    order: [['id_envio', 'ASC']],
  });

  if (!envios.length) {
    console.log('No hay envíos marcados como POSPRUEBA.');
    process.exit(0);
  }

  let actualizados = 0;
  for (const envio of envios) {
    const tipoAnterior = envio.tipo_carga;
    const tipo = TIPOS_CARGA_OPERATIVOS.includes(tipoAnterior) ? tipoAnterior : pick(TIPOS_CARGA_OPERATIVOS);
    const spec = especificacionAleatoria(tipo);
    const partes = [];
    if (spec) partes.push(spec);
    if (tipoAnterior && tipoAnterior !== tipo && !TIPOS_CARGA_OPERATIVOS.includes(tipoAnterior)) {
      partes.push(`Detalle anterior: ${tipoAnterior}`);
    }
    if (envio.observaciones && !partes.some((p) => p.includes(envio.observaciones))) {
      partes.push(envio.observaciones);
    }

    await envio.update({
      origen: ORIGEN_ENVIO_FIJO,
      tipo_carga: tipo,
      observaciones: partes.join('. ').trim() || null,
    });
    actualizados += 1;
  }

  console.log(`✓ ${actualizados} envíos POSPRUEBA actualizados (origen Lima, tipos frágil/general/vulnerable).`);
  console.log('Los 5500 sintéticos no fueron modificados.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
