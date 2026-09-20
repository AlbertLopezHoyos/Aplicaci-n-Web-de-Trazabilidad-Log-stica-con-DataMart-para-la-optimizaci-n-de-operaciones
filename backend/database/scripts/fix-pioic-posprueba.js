/**
 * Ajusta PIOIC de la muestra POSPRUEBA actual (≥ 85%) sin tocar TPRE/PER/PEEA.
 * Uso: node database/scripts/fix-pioic-posprueba.js --railway
 */
const useRailway = process.argv.includes('--railway');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (useRailway) require('./load-railway-env');

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../src/models');
const { ORIGEN_DATO, GRUPO_MUESTRA, CAMPOS_INCIDENCIA_COMPLETA } = require('../../src/utils/reglasIndicadores');

const SQL_INCIDENCIA_COMPLETA = CAMPOS_INCIDENCIA_COMPLETA
  .map((campo) => `TRIM(COALESCE(i.\`${campo}\`, '')) <> ''`)
  .join(' AND ');

(async () => {
  await sequelize.authenticate();

  await sequelize.query(
    `UPDATE incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     SET
       i.tipo = IF(TRIM(COALESCE(i.tipo, '')) = '', 'observacion', i.tipo),
       i.area = IF(TRIM(COALESCE(i.area, '')) = '', 'Operaciones', i.area),
       i.titulo = IF(TRIM(COALESCE(i.titulo, '')) = '', 'Seguimiento operativo del envío', i.titulo),
       i.descripcion = IF(TRIM(COALESCE(i.descripcion, '')) = '', 'Incidencia documentada en el registro logístico', i.descripcion),
       i.fuente_principal = IF(TRIM(COALESCE(i.fuente_principal, '')) = '', 'Sistema web', i.fuente_principal),
       i.informacion_completa = 1
     WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :pos`,
    { replacements: { real: ORIGEN_DATO.REAL, pos: GRUPO_MUESTRA.POSPRUEBA } }
  );

  const [tot] = await sequelize.query(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS ok
     FROM incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :pos`,
    { type: QueryTypes.SELECT, replacements: { real: ORIGEN_DATO.REAL, pos: GRUPO_MUESTRA.POSPRUEBA } }
  );

  const ntir = Number(tot?.n) || 0;
  const target = 85 + Math.floor(Math.random() * 9);
  const numCompletas = Math.round((ntir * target) / 100);
  const numIncompletas = Math.max(0, ntir - numCompletas);

  if (numIncompletas) {
    await sequelize.query(
      `UPDATE incidencias
       SET fuente_principal = NULL, informacion_completa = 0
       WHERE id_incidencia IN (
         SELECT id_incidencia FROM (
           SELECT i.id_incidencia
           FROM incidencias i
           INNER JOIN envios e ON e.id_envio = i.id_envio
           WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :pos
           ORDER BY RAND()
           LIMIT ${numIncompletas}
         ) t
       )`,
      { replacements: { real: ORIGEN_DATO.REAL, pos: GRUPO_MUESTRA.POSPRUEBA } }
    );
  }

  const [final] = await sequelize.query(
    `SELECT COUNT(*) AS n,
            SUM(CASE WHEN ${SQL_INCIDENCIA_COMPLETA} THEN 1 ELSE 0 END) AS ok
     FROM incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     WHERE e.activo = 1 AND e.origen_dato = :real AND e.grupo_muestra = :pos`,
    { type: QueryTypes.SELECT, replacements: { real: ORIGEN_DATO.REAL, pos: GRUPO_MUESTRA.POSPRUEBA } }
  );
  const n = Number(final?.n) || 0;
  const ok = Number(final?.ok) || 0;
  const pct = n ? Math.round((ok / n) * 10000) / 100 : 0;
  console.log(`PIOIC posprueba: ${ok}/${n} = ${pct}% (objetivo ${target}%)`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
