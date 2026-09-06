/**
 * ETL de staging - Carga inicial hacia tablas del DataMart
 * Ejecutable vía API (Administrador) o cron futuro
 */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const runStaging = async () => {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(
      `INSERT INTO dim_cliente (id_cliente_origen, razon_social, ruc, ciudad, distrito, vigente_desde, es_actual)
       SELECT c.id_cliente, c.razon_social, c.dni, NULL, NULL, CURDATE(), 1
       FROM clientes c
       WHERE c.activo = 1
       AND NOT EXISTS (
         SELECT 1 FROM dim_cliente d WHERE d.id_cliente_origen = c.id_cliente AND d.es_actual = 1
       )`,
      { transaction }
    );

    await sequelize.query(
      `INSERT INTO dim_estado (id_estado_origen, codigo, nombre, es_final, categoria, vigente_desde, es_actual)
       SELECT e.id_estado, e.codigo, e.nombre, e.es_final, 'logistico', CURDATE(), 1
       FROM estados_envio e
       WHERE e.activo = 1
       AND NOT EXISTS (
         SELECT 1 FROM dim_estado d WHERE d.id_estado_origen = e.id_estado AND d.es_actual = 1
       )`,
      { transaction }
    );

    await sequelize.query(
      `INSERT INTO dim_operador (id_usuario_origen, nombre_completo, rol, vigente_desde, es_actual)
       SELECT u.id_usuario, CONCAT(u.nombres, ' ', u.apellidos), r.nombre, CURDATE(), 1
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.activo = 1
       AND NOT EXISTS (
         SELECT 1 FROM dim_operador d WHERE d.id_usuario_origen = u.id_usuario AND d.es_actual = 1
       )`,
      { transaction }
    );

    const [inserted] = await sequelize.query(
      `INSERT INTO fact_operaciones_logisticas (
         id_envio, id_fecha_registro, id_fecha_entrega, id_dim_cliente, id_dim_estado,
         id_dim_operador, codigo_envio, peso_kg, tipo_carga, dias_transito,
         cantidad_incidencias, tuvo_retraso, entregado_a_tiempo
       )
       SELECT e.id_envio,
         DATE_FORMAT(e.fecha_registro, '%Y%m%d'),
         IF(e.fecha_entrega_real IS NOT NULL, DATE_FORMAT(e.fecha_entrega_real, '%Y%m%d'), NULL),
         dc.id_dim_cliente, de.id_dim_estado, dop.id_dim_operador,
         e.codigo_envio, e.peso_kg, e.tipo_carga,
         IF(e.fecha_entrega_real IS NOT NULL, DATEDIFF(e.fecha_entrega_real, e.fecha_registro), NULL),
         (SELECT COUNT(*) FROM incidencias i WHERE i.id_envio = e.id_envio),
         IF(EXISTS (SELECT 1 FROM incidencias i WHERE i.id_envio = e.id_envio AND i.tipo = 'retraso'), 1, 0),
         IF(e.fecha_entrega_real IS NOT NULL AND e.fecha_estimada_entrega IS NOT NULL,
            IF(e.fecha_entrega_real <= e.fecha_estimada_entrega, 1, 0), NULL)
       FROM envios e
       JOIN dim_cliente dc ON dc.id_cliente_origen = e.id_cliente AND dc.es_actual = 1
       JOIN dim_estado de ON de.id_estado_origen = e.id_estado_actual AND de.es_actual = 1
       LEFT JOIN dim_operador dop ON dop.id_usuario_origen = e.id_responsable AND dop.es_actual = 1
       WHERE e.activo = 1
       AND NOT EXISTS (SELECT 1 FROM fact_operaciones_logisticas f WHERE f.id_envio = e.id_envio)`,
      { transaction }
    );

    await sequelize.query(
      `UPDATE fact_operaciones_logisticas f
       JOIN envios e ON f.id_envio = e.id_envio
       SET f.dias_transito = IF(e.fecha_entrega_real IS NOT NULL,
           DATEDIFF(e.fecha_entrega_real, e.fecha_registro), NULL),
           f.entregado_a_tiempo = IF(e.fecha_entrega_real IS NOT NULL AND e.fecha_estimada_entrega IS NOT NULL,
           IF(e.fecha_entrega_real <= e.fecha_estimada_entrega, 1, 0), NULL),
           f.cantidad_incidencias = (SELECT COUNT(*) FROM incidencias i WHERE i.id_envio = e.id_envio),
           f.tuvo_retraso = IF(EXISTS (SELECT 1 FROM incidencias i WHERE i.id_envio = e.id_envio AND i.tipo = 'retraso'), 1, 0)
       WHERE e.activo = 1`,
      { transaction }
    );

    await transaction.commit();
    return { ok: true, filasCargadas: inserted?.affectedRows ?? 0, mensaje: 'ETL completado' };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const getPreview = async () => {
  try {
    const [facts, dims] = await Promise.all([
      sequelize.query('SELECT COUNT(*) AS total FROM fact_operaciones_logisticas', { type: QueryTypes.SELECT }),
      sequelize.query(
        `SELECT 'dim_fecha' AS tabla, COUNT(*) AS registros FROM dim_fecha
         UNION SELECT 'dim_cliente', COUNT(*) FROM dim_cliente
         UNION SELECT 'dim_estado', COUNT(*) FROM dim_estado
         UNION SELECT 'dim_operador', COUNT(*) FROM dim_operador`,
        { type: QueryTypes.SELECT }
      ),
    ]);
    return { totalHechos: facts[0]?.total || 0, dimensiones: dims, datamartReady: true };
  } catch {
    return { totalHechos: 0, dimensiones: [], datamartReady: false };
  }
};

const getAnalytics = async () => {
  try {
    const [row] = await sequelize.query(
      `SELECT
         COUNT(*) AS total_hechos,
         ROUND(AVG(dias_transito), 1) AS lead_time_promedio,
         ROUND(
           SUM(CASE WHEN entregado_a_tiempo = 1 THEN 1 ELSE 0 END) * 100.0 /
           NULLIF(SUM(CASE WHEN entregado_a_tiempo IS NOT NULL THEN 1 ELSE 0 END), 0),
           1
         ) AS otif_pct,
         ROUND(SUM(cantidad_incidencias) * 100.0 / NULLIF(COUNT(*), 0), 1) AS tasa_incidencias,
         SUM(tuvo_retraso) AS envios_con_retraso,
         ROUND(AVG(peso_kg), 1) AS peso_promedio_kg
       FROM fact_operaciones_logisticas`,
      { type: QueryTypes.SELECT }
    );
    return row || null;
  } catch {
    return null;
  }
};

module.exports = { runStaging, getPreview, getAnalytics };
