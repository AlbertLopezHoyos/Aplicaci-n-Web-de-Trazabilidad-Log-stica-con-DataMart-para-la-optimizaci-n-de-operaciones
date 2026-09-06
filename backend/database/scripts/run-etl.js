/**
 * Ejecuta ETL staging hacia el DataMart desde línea de comandos
 * Uso: npm run db:etl
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const etlService = require('../../src/datamart/etl.service');

const run = async () => {
  try {
    console.log('Iniciando ETL staging → DataMart...');
    const result = await etlService.runStaging();
    const preview = await etlService.getPreview();
    const analytics = await etlService.getAnalytics();
    console.log(`✓ ETL completado — ${result.filasCargadas} filas nuevas en hechos`);
    console.log(`  Total hechos: ${preview.totalHechos}`);
    preview.dimensiones.forEach((d) => console.log(`  ${d.tabla}: ${d.registros}`));
    if (analytics) {
      console.log('\nKPIs analíticos:');
      console.log(`  OTIF: ${analytics.otif_pct ?? '—'}%`);
      console.log(`  Lead time promedio: ${analytics.lead_time_promedio ?? '—'} días`);
      console.log(`  Tasa incidencias: ${analytics.tasa_incidencias ?? '—'}%`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error ETL:', err.message);
    process.exit(1);
  }
};

run();
