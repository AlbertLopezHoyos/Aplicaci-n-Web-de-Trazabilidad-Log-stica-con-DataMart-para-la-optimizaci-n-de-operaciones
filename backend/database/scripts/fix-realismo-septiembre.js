/**
 * Marca envíos desde 1-set-2026 como REAL, corrige comentarios UTF-8 del timeline
 * y recalcula estados según antigüedad (entregado solo ≥ 3 días después del registro).
 *
 * Uso: npm run db:realismo-septiembre
 *      npm run db:realismo-septiembre:railway
 */
const useRailway = process.argv.includes('--railway');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
if (useRailway) {
  require('./load-railway-env');
}

const { QueryTypes } = require('sequelize');
const { sequelize, Envio, EstadoEnvio, HistorialEstado } = require('../../src/models');
const { ORIGEN_DATO, VENTANAS_MEDICION, GRUPO_MUESTRA, capturaHastaPosprueba } = require('../../src/utils/reglasIndicadores');
const { COMENTARIO_REGISTRO, aplicarEstadoYTimeline } = require('../../src/utils/realismoEnvio');

const DESDE = VENTANAS_MEDICION[GRUPO_MUESTRA.POSPRUEBA].desde;

const fixTriggerHistorial = async () => {
  await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  await sequelize.query('DROP TRIGGER IF EXISTS trg_envio_historial_insert');
  await sequelize.query(`
    CREATE TRIGGER trg_envio_historial_insert
    AFTER INSERT ON envios
    FOR EACH ROW
    INSERT INTO historial_estados (id_envio, id_estado, id_usuario, comentario, fecha_hora)
    VALUES (NEW.id_envio, NEW.id_estado_actual, NEW.id_responsable, :comentario, NOW())
  `, { replacements: { comentario: COMENTARIO_REGISTRO } });
};

const fixComentariosHistorial = async () => {
  await sequelize.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
  const [, meta] = await sequelize.query(
    `UPDATE historial_estados
     SET comentario = :correcto
     WHERE comentario LIKE 'Registro inicial del %'
        OR comentario LIKE '%env├%'
        OR comentario LIKE '%envÃ%'`,
    { replacements: { correcto: COMENTARIO_REGISTRO } }
  );
  return meta?.affectedRows || 0;
};

const marcarReales = async () => {
  const [, metaEnvios] = await sequelize.query(
    `UPDATE envios SET origen_dato = :real
     WHERE activo = 1 AND fecha_registro >= :desde AND origen_dato <> :real`,
    { replacements: { real: ORIGEN_DATO.REAL, desde: DESDE } }
  );
  const [, metaInc] = await sequelize.query(
    `UPDATE incidencias i
     INNER JOIN envios e ON e.id_envio = i.id_envio
     SET i.origen_dato = :real
     WHERE e.fecha_registro >= :desde AND i.origen_dato <> :real`,
    { replacements: { real: ORIGEN_DATO.REAL, desde: DESDE } }
  );
  return { envios: metaEnvios?.affectedRows || 0, incidencias: metaInc?.affectedRows || 0 };
};

const run = async () => {
  await sequelize.authenticate();
  const refHasta = capturaHastaPosprueba();
  console.log(`Realismo posprueba (${process.env.DB_HOST}) · ${DESDE} a ${refHasta}\n`);

  const marcados = await marcarReales();
  console.log(`✓ Marcados REAL: ${marcados.envios} envíos, ${marcados.incidencias} incidencias`);

  await fixTriggerHistorial();
  console.log('✓ Trigger trg_envio_historial_insert actualizado');

  const historial = await fixComentariosHistorial();
  console.log(`✓ Comentarios timeline corregidos: ${historial}`);

  const estadosRows = await EstadoEnvio.findAll();
  const estadosPorCodigo = Object.fromEntries(estadosRows.map((e) => [e.codigo, e]));

  const envios = await Envio.findAll({
    where: {
      activo: true,
      fecha_registro: { [require('sequelize').Op.between]: [DESDE, refHasta] },
    },
    order: [['id_envio', 'ASC']],
  });

  let actualizados = 0;
  for (const envio of envios) {
    const fecha = String(envio.fecha_registro).slice(0, 10);
    const horaBase = envio.hora_inicio_registro || new Date(`${fecha}T09:00:00`);
    const tiempos = {
      hora_inicio_registro: horaBase,
      hora_fin_registro: envio.hora_fin_registro || horaBase,
      tiempo_registro_min: envio.tiempo_registro_min || 4,
    };
    await aplicarEstadoYTimeline({
      envio,
      HistorialEstado,
      fechaRegistro: fecha,
      tiempos,
      responsableId: envio.id_responsable,
      estadosPorCodigo,
      refHasta,
    });
    actualizados += 1;
  }

  console.log(`✓ Estados y timeline recalculados: ${actualizados} envíos`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
