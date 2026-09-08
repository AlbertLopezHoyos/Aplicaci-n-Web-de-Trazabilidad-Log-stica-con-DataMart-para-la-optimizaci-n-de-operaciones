/**
 * ETL del DataMart de operaciones logísticas.
 *
 * Fases:
 *   EXTRACCIÓN     — lectura de las tablas operacionales (OLTP): envios,
 *                    clientes, estados_envio, usuarios, incidencias.
 *   TRANSFORMACIÓN — resolución de claves de dimensión, tratamiento de nulos
 *                    y cálculo de métricas derivadas (dias_transito,
 *                    cantidad_incidencias, tuvo_retraso, entregado_a_tiempo).
 *   CARGA          — inserción en dimensiones y en fact_operaciones_logisticas.
 *
 * Idempotencia: la carga de dimensiones y hechos usa NOT EXISTS y la tabla de
 * hechos tiene UNIQUE(id_envio) (migración 07), de modo que reejecutar el ETL
 * actualiza métricas pero nunca duplica filas. El grano es
 * "una fila = una operación de envío"; no hay snapshots periódicos.
 *
 * Cada ejecución queda registrada en la tabla `etl_ejecuciones`.
 */
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/** Crea la fila de bitácora. Si la tabla no existe, el ETL sigue funcionando. */
const abrirBitacora = async (proceso) => {
  try {
    const [id] = await sequelize.query(
      `INSERT INTO etl_ejecuciones (proceso, fecha_inicio, estado)
       VALUES (:proceso, NOW(), 'EN_PROCESO')`,
      { replacements: { proceso }, type: QueryTypes.INSERT }
    );
    return id || null;
  } catch {
    return null;
  }
};

const cerrarBitacora = async (id, datos) => {
  if (!id) return;
  try {
    await sequelize.query(
      `UPDATE etl_ejecuciones
       SET fecha_fin = NOW(), estado = :estado,
           registros_extraidos = :extraidos,
           registros_transformados = :transformados,
           registros_cargados = :cargados,
           mensaje_error = :error
       WHERE id_ejecucion = :id`,
      {
        replacements: {
          id,
          estado: datos.estado,
          extraidos: datos.extraidos || 0,
          transformados: datos.transformados || 0,
          cargados: datos.cargados || 0,
          error: datos.error || null,
        },
      }
    );
  } catch {
    /* la bitácora no debe romper el ETL */
  }
};

/** EXTRACCIÓN: volumen disponible en el origen operacional. */
const extraer = async (transaction) => {
  const [row] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM envios WHERE activo = 1) AS envios,
       (SELECT COUNT(*) FROM clientes WHERE activo = 1) AS clientes,
       (SELECT COUNT(*) FROM estados_envio WHERE activo = 1) AS estados,
       (SELECT COUNT(*) FROM usuarios WHERE activo = 1) AS usuarios,
       (SELECT COUNT(*) FROM incidencias) AS incidencias`,
    { type: QueryTypes.SELECT, transaction }
  );
  const detalle = {
    envios: Number(row?.envios) || 0,
    clientes: Number(row?.clientes) || 0,
    estados: Number(row?.estados) || 0,
    usuarios: Number(row?.usuarios) || 0,
    incidencias: Number(row?.incidencias) || 0,
  };
  return { detalle, total: Object.values(detalle).reduce((a, b) => a + b, 0) };
};

/** CARGA de dimensiones (conformadas, comportamiento tipo 1 / insert-once). */
const cargarDimensiones = async (transaction) => {
  const [cliente] = await sequelize.query(
    `INSERT INTO dim_cliente (id_cliente_origen, razon_social, ruc, ciudad, distrito, vigente_desde, es_actual)
     SELECT c.id_cliente, TRIM(c.razon_social), c.dni, NULL, NULL, CURDATE(), 1
     FROM clientes c
     WHERE c.activo = 1
     AND NOT EXISTS (
       SELECT 1 FROM dim_cliente d WHERE d.id_cliente_origen = c.id_cliente AND d.es_actual = 1
     )`,
    { transaction }
  );

  const [estado] = await sequelize.query(
    `INSERT INTO dim_estado (id_estado_origen, codigo, nombre, es_final, categoria, vigente_desde, es_actual)
     SELECT e.id_estado, e.codigo, e.nombre, e.es_final, 'logistico', CURDATE(), 1
     FROM estados_envio e
     WHERE e.activo = 1
     AND NOT EXISTS (
       SELECT 1 FROM dim_estado d WHERE d.id_estado_origen = e.id_estado AND d.es_actual = 1
     )`,
    { transaction }
  );

  const [operador] = await sequelize.query(
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

  // Refresco de atributos descriptivos: sobrescritura tipo 1, sin historial.
  await sequelize.query(
    `UPDATE dim_cliente d
     JOIN clientes c ON c.id_cliente = d.id_cliente_origen
     SET d.razon_social = TRIM(c.razon_social), d.ruc = c.dni
     WHERE d.es_actual = 1`,
    { transaction }
  );
  await sequelize.query(
    `UPDATE dim_estado d
     JOIN estados_envio e ON e.id_estado = d.id_estado_origen
     SET d.nombre = e.nombre, d.es_final = e.es_final
     WHERE d.es_actual = 1`,
    { transaction }
  );
  await sequelize.query(
    `UPDATE dim_operador d
     JOIN usuarios u ON u.id_usuario = d.id_usuario_origen
     JOIN roles r ON u.id_rol = r.id_rol
     SET d.nombre_completo = CONCAT(u.nombres, ' ', u.apellidos), d.rol = r.nombre
     WHERE d.es_actual = 1`,
    { transaction }
  );

  return {
    dim_cliente: cliente?.affectedRows ?? 0,
    dim_estado: estado?.affectedRows ?? 0,
    dim_operador: operador?.affectedRows ?? 0,
  };
};

/** Filas del origen que superan las validaciones mínimas para pasar a hechos. */
const contarTransformables = async (transaction) => {
  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS total
     FROM envios e
     JOIN dim_cliente dc ON dc.id_cliente_origen = e.id_cliente AND dc.es_actual = 1
     JOIN dim_estado de ON de.id_estado_origen = e.id_estado_actual AND de.es_actual = 1
     WHERE e.activo = 1 AND e.fecha_registro IS NOT NULL`,
    { type: QueryTypes.SELECT, transaction }
  );
  return Number(row?.total) || 0;
};

/** TRANSFORMACIÓN + CARGA de la tabla de hechos. */
const cargarHechos = async (transaction) => {
  const [inserted] = await sequelize.query(
    `INSERT INTO fact_operaciones_logisticas (
       id_envio, id_fecha_registro, id_fecha_entrega, id_dim_cliente, id_dim_estado,
       id_dim_operador, codigo_envio, peso_kg, tipo_carga, dias_transito,
       cantidad_incidencias, tuvo_retraso, entregado_a_tiempo, origen_dato
     )
     SELECT e.id_envio,
       DATE_FORMAT(e.fecha_registro, '%Y%m%d'),
       IF(e.fecha_entrega_real IS NOT NULL, DATE_FORMAT(e.fecha_entrega_real, '%Y%m%d'), NULL),
       dc.id_dim_cliente, de.id_dim_estado, dop.id_dim_operador,
       e.codigo_envio, COALESCE(e.peso_kg, 0), COALESCE(e.tipo_carga, 'No especificado'),
       IF(e.fecha_entrega_real IS NOT NULL, DATEDIFF(e.fecha_entrega_real, e.fecha_registro), NULL),
       (SELECT COUNT(*) FROM incidencias i WHERE i.id_envio = e.id_envio),
       IF(EXISTS (SELECT 1 FROM incidencias i WHERE i.id_envio = e.id_envio AND i.tipo = 'retraso'), 1, 0),
       IF(e.fecha_entrega_real IS NOT NULL AND e.fecha_estimada_entrega IS NOT NULL,
          IF(e.fecha_entrega_real <= e.fecha_estimada_entrega, 1, 0), NULL),
       e.origen_dato
     FROM envios e
     JOIN dim_cliente dc ON dc.id_cliente_origen = e.id_cliente AND dc.es_actual = 1
     JOIN dim_estado de ON de.id_estado_origen = e.id_estado_actual AND de.es_actual = 1
     LEFT JOIN dim_operador dop ON dop.id_usuario_origen = e.id_responsable AND dop.es_actual = 1
     WHERE e.activo = 1
       AND e.fecha_registro IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM fact_operaciones_logisticas f WHERE f.id_envio = e.id_envio)`,
    { transaction }
  );

  // Refresco de métricas y claves de los hechos ya existentes (sin duplicar).
  const [actualizados] = await sequelize.query(
    `UPDATE fact_operaciones_logisticas f
     JOIN envios e ON f.id_envio = e.id_envio
     JOIN dim_estado de ON de.id_estado_origen = e.id_estado_actual AND de.es_actual = 1
     SET f.id_dim_estado = de.id_dim_estado,
         f.id_fecha_entrega = IF(e.fecha_entrega_real IS NOT NULL, DATE_FORMAT(e.fecha_entrega_real, '%Y%m%d'), NULL),
         f.dias_transito = IF(e.fecha_entrega_real IS NOT NULL,
             DATEDIFF(e.fecha_entrega_real, e.fecha_registro), NULL),
         f.entregado_a_tiempo = IF(e.fecha_entrega_real IS NOT NULL AND e.fecha_estimada_entrega IS NOT NULL,
             IF(e.fecha_entrega_real <= e.fecha_estimada_entrega, 1, 0), NULL),
         f.cantidad_incidencias = (SELECT COUNT(*) FROM incidencias i WHERE i.id_envio = e.id_envio),
         f.tuvo_retraso = IF(EXISTS (SELECT 1 FROM incidencias i WHERE i.id_envio = e.id_envio AND i.tipo = 'retraso'), 1, 0),
         f.origen_dato = e.origen_dato
     WHERE e.activo = 1`,
    { transaction }
  );

  return {
    insertados: inserted?.affectedRows ?? 0,
    actualizados: actualizados?.affectedRows ?? 0,
  };
};

const runStaging = async () => {
  const idEjecucion = await abrirBitacora('staging_datamart');
  const transaction = await sequelize.transaction();
  try {
    const extraccion = await extraer(transaction);
    const dimensiones = await cargarDimensiones(transaction);
    const transformados = await contarTransformables(transaction);
    const hechos = await cargarHechos(transaction);

    await transaction.commit();

    await cerrarBitacora(idEjecucion, {
      estado: 'EXITOSO',
      extraidos: extraccion.total,
      transformados,
      cargados: hechos.insertados,
    });

    return {
      ok: true,
      idEjecucion,
      extraccion: extraccion.detalle,
      registrosExtraidos: extraccion.total,
      registrosTransformados: transformados,
      dimensiones,
      filasCargadas: hechos.insertados,
      filasActualizadas: hechos.actualizados,
      mensaje: hechos.insertados
        ? `ETL completado: ${hechos.insertados} hechos nuevos, ${hechos.actualizados} actualizados`
        : `ETL completado sin hechos nuevos: ${hechos.actualizados} métricas actualizadas (proceso idempotente)`,
    };
  } catch (err) {
    await transaction.rollback();
    await cerrarBitacora(idEjecucion, { estado: 'FALLIDO', error: err.message });
    throw err;
  }
};

const getPreview = async () => {
  try {
    const [facts, dims] = await Promise.all([
      sequelize.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN origen_dato = 'SINTETICO' THEN 1 ELSE 0 END) AS sinteticos,
                SUM(CASE WHEN origen_dato = 'REAL' THEN 1 ELSE 0 END) AS reales
         FROM fact_operaciones_logisticas`,
        { type: QueryTypes.SELECT }
      ),
      sequelize.query(
        `SELECT 'dim_fecha' AS tabla, COUNT(*) AS registros FROM dim_fecha
         UNION SELECT 'dim_cliente', COUNT(*) FROM dim_cliente
         UNION SELECT 'dim_estado', COUNT(*) FROM dim_estado
         UNION SELECT 'dim_operador', COUNT(*) FROM dim_operador`,
        { type: QueryTypes.SELECT }
      ),
    ]);
    return {
      totalHechos: Number(facts[0]?.total) || 0,
      hechosSinteticos: Number(facts[0]?.sinteticos) || 0,
      hechosReales: Number(facts[0]?.reales) || 0,
      dimensiones: dims,
      datamartReady: true,
      ultimasEjecuciones: await getUltimasEjecuciones(),
    };
  } catch {
    return { totalHechos: 0, dimensiones: [], datamartReady: false, ultimasEjecuciones: [] };
  }
};

const getUltimasEjecuciones = async (limite = 5) => {
  try {
    return await sequelize.query(
      `SELECT id_ejecucion, proceso, fecha_inicio, fecha_fin, estado,
              registros_extraidos, registros_transformados, registros_cargados, mensaje_error
       FROM etl_ejecuciones
       ORDER BY id_ejecucion DESC
       LIMIT ${Number(limite) || 5}`,
      { type: QueryTypes.SELECT }
    );
  } catch {
    return [];
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

module.exports = { runStaging, getPreview, getAnalytics, getUltimasEjecuciones };
