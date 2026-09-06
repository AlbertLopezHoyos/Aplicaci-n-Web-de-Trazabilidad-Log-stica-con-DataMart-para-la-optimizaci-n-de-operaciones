/**
 * Recalcula estados y fechas de entrega según antigüedad (datos históricos realistas)
 * Uso: npm run db:fix-estados
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, Envio, EstadoEnvio } = require('../../src/models');
const { resolveEstadoOperativo, REF_DATE } = require('./bulk-data');

const BATCH = 500;

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Recalculando estados según fecha (referencia: ${REF_DATE})...`);

    const estados = await EstadoEnvio.findAll();
    const estadoMap = Object.fromEntries(estados.map((e) => [e.codigo, e.id_estado]));

    const envios = await Envio.findAll({
      where: { activo: true },
      attributes: ['id_envio', 'fecha_registro'],
      raw: true,
    });

    const counts = { entregado: 0, cancelado: 0, en_transito: 0, recibido: 0, retrasado: 0 };
    let updated = 0;

    for (let i = 0; i < envios.length; i += BATCH) {
      const chunk = envios.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async ({ id_envio, fecha_registro }) => {
          const fechaRegistro = typeof fecha_registro === 'string'
            ? fecha_registro.slice(0, 10)
            : fecha_registro.toISOString().slice(0, 10);
          const { estadoCodigo, fechaEstimada, fechaEntregaReal } = resolveEstadoOperativo(fechaRegistro);
          counts[estadoCodigo] = (counts[estadoCodigo] || 0) + 1;
          await Envio.update(
            {
              id_estado_actual: estadoMap[estadoCodigo],
              fecha_estimada_entrega: fechaEstimada,
              fecha_entrega_real: fechaEntregaReal,
            },
            { where: { id_envio } }
          );
        })
      );
      updated += chunk.length;
      process.stdout.write(`\r  Actualizados: ${updated}/${envios.length}`);
    }

    console.log('\n✓ Estados recalculados');
    console.log('Distribución:');
    Object.entries(counts).forEach(([k, v]) => {
      const pct = ((v / envios.length) * 100).toFixed(1);
      console.log(`  ${k}: ${v} (${pct}%)`);
    });
    const cerrados = counts.entregado + counts.cancelado;
    console.log(`  → Cerrados (entregado+cancelado): ${cerrados} (${((cerrados / envios.length) * 100).toFixed(1)}%)`);
    console.log('\nSiguiente paso: npm run db:etl');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
