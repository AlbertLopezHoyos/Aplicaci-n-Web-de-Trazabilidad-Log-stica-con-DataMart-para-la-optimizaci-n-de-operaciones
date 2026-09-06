-- =============================================================================
-- DIAGNÓSTICO DE BASE DE DATOS — Trazabilidad Logística
-- Solo lectura. Ejecutar en MySQL Workbench y copiar/pegar los resultados.
-- Base local: trazabilidad_logistica | Railway: cambiar USE railway;
-- =============================================================================

USE trazabilidad_logistica;

-- -----------------------------------------------------------------------------
-- 1) Información general
-- -----------------------------------------------------------------------------
SELECT '1. INFORMACIÓN GENERAL' AS seccion;
SELECT
  DATABASE() AS base_datos,
  @@hostname AS servidor,
  VERSION() AS version_mysql,
  NOW() AS fecha_diagnostico;

-- -----------------------------------------------------------------------------
-- 2) Tablas esperadas (existencia)
-- -----------------------------------------------------------------------------
SELECT '2. TABLAS ESPERADAS' AS seccion;

SELECT
  e.tabla,
  CASE WHEN t.TABLE_NAME IS NOT NULL THEN 'OK' ELSE 'FALTA' END AS estado,
  IFNULL(t.TABLE_ROWS, 0) AS filas_aprox,
  t.ENGINE AS motor
FROM (
  SELECT 'roles' AS tabla UNION ALL
  SELECT 'usuarios' UNION ALL
  SELECT 'clientes' UNION ALL
  SELECT 'estados_envio' UNION ALL
  SELECT 'envios' UNION ALL
  SELECT 'historial_estados' UNION ALL
  SELECT 'incidencias' UNION ALL
  SELECT 'evidencias' UNION ALL
  SELECT 'reportes' UNION ALL
  SELECT 'auditoria' UNION ALL
  SELECT 'dim_fecha' UNION ALL
  SELECT 'dim_cliente' UNION ALL
  SELECT 'dim_estado' UNION ALL
  SELECT 'dim_operador' UNION ALL
  SELECT 'fact_operaciones_logisticas' UNION ALL
  SELECT 'errores_registro'
) e
LEFT JOIN information_schema.TABLES t
  ON t.TABLE_SCHEMA = DATABASE()
 AND t.TABLE_NAME = e.tabla
ORDER BY e.tabla;

-- -----------------------------------------------------------------------------
-- 3) Estructura tabla CLIENTES (modelo actual: persona natural)
-- -----------------------------------------------------------------------------
SELECT '3. COLUMNAS DE clientes' AS seccion;

SELECT
  COLUMN_NAME AS columna,
  COLUMN_TYPE AS tipo,
  IS_NULLABLE AS nullable,
  COLUMN_KEY AS clave,
  COLUMN_DEFAULT AS valor_default,
  CASE
    WHEN COLUMN_NAME IN ('id_cliente','razon_social','dni','telefono','activo','created_at','updated_at') THEN 'OK esperada'
    WHEN COLUMN_NAME IN ('ruc','tipo_cliente','contacto','email','direccion','distrito','ciudad') THEN 'LEGACY (convendría quitar)'
    ELSE 'EXTRA'
  END AS evaluacion
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'clientes'
ORDER BY ORDINAL_POSITION;

-- -----------------------------------------------------------------------------
-- 4) Índices y unicidad del DNI
-- -----------------------------------------------------------------------------
SELECT '4. ÍNDICES EN clientes (DNI único)' AS seccion;

SELECT
  INDEX_NAME AS indice,
  COLUMN_NAME AS columna,
  NON_UNIQUE AS no_unico,
  CASE
    WHEN COLUMN_NAME = 'dni' AND NON_UNIQUE = 0 THEN 'OK — DNI único'
    WHEN COLUMN_NAME = 'dni' AND NON_UNIQUE = 1 THEN 'PROBLEMA — DNI permite duplicados'
    ELSE 'INFO'
  END AS evaluacion
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'clientes'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- -----------------------------------------------------------------------------
-- 5) Conteo de registros por tabla
-- -----------------------------------------------------------------------------
SELECT '5. CONTEO DE REGISTROS' AS seccion;

SELECT 'roles' AS tabla, COUNT(*) AS total FROM roles
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'estados_envio', COUNT(*) FROM estados_envio
UNION ALL SELECT 'envios', COUNT(*) FROM envios
UNION ALL SELECT 'historial_estados', COUNT(*) FROM historial_estados
UNION ALL SELECT 'incidencias', COUNT(*) FROM incidencias
UNION ALL SELECT 'evidencias', COUNT(*) FROM evidencias
UNION ALL SELECT 'reportes', COUNT(*) FROM reportes
UNION ALL SELECT 'auditoria', COUNT(*) FROM auditoria
UNION ALL SELECT 'dim_fecha', COUNT(*) FROM dim_fecha
UNION ALL SELECT 'dim_cliente', COUNT(*) FROM dim_cliente
UNION ALL SELECT 'dim_estado', COUNT(*) FROM dim_estado
UNION ALL SELECT 'dim_operador', COUNT(*) FROM dim_operador
UNION ALL SELECT 'fact_operaciones_logisticas', COUNT(*) FROM fact_operaciones_logisticas;

-- (Opcional) Si ejecutaste 02_medicion_fichas.sql, descomenta:
-- SELECT 'errores_registro' AS tabla, COUNT(*) AS total FROM errores_registro;

-- -----------------------------------------------------------------------------
-- 6) Calidad de datos — CLIENTES
-- -----------------------------------------------------------------------------
SELECT '6. CALIDAD DATOS clientes' AS seccion;

SELECT
  COUNT(*) AS total_clientes,
  SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos,
  SUM(CASE WHEN dni IS NULL OR dni = '' THEN 1 ELSE 0 END) AS sin_dni,
  SUM(CASE WHEN dni NOT REGEXP '^[0-9]{8}$' THEN 1 ELSE 0 END) AS dni_formato_invalido,
  SUM(CASE WHEN telefono IS NULL OR telefono = '' THEN 1 ELSE 0 END) AS telefono_vacio,
  SUM(CASE WHEN telefono IS NOT NULL AND telefono <> '' THEN 1 ELSE 0 END) AS telefono_con_valor
FROM clientes;

SELECT '6b. DNI duplicados' AS seccion;
SELECT dni, COUNT(*) AS repeticiones
FROM clientes
GROUP BY dni
HAVING COUNT(*) > 1;

SELECT '6c. Muestra clientes (máx. 10)' AS seccion;
SELECT id_cliente, razon_social AS nombre_completo, dni, telefono, activo
FROM clientes
ORDER BY id_cliente
LIMIT 10;

-- -----------------------------------------------------------------------------
-- 7) Integridad referencial — envíos e incidencias
-- -----------------------------------------------------------------------------
SELECT '7. INTEGRIDAD REFERENCIAL' AS seccion;

SELECT
  'envios_sin_cliente' AS chequeo,
  COUNT(*) AS cantidad,
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'PROBLEMA' END AS estado
FROM envios e
LEFT JOIN clientes c ON c.id_cliente = e.id_cliente
WHERE c.id_cliente IS NULL

UNION ALL

SELECT
  'envios_sin_estado',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'PROBLEMA' END
FROM envios e
LEFT JOIN estados_envio s ON s.id_estado = e.id_estado_actual
WHERE s.id_estado IS NULL

UNION ALL

SELECT
  'incidencias_sin_envio',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'PROBLEMA' END
FROM incidencias i
LEFT JOIN envios e ON e.id_envio = i.id_envio
WHERE e.id_envio IS NULL

UNION ALL

SELECT
  'historial_sin_envio',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'PROBLEMA' END
FROM historial_estados h
LEFT JOIN envios e ON e.id_envio = h.id_envio
WHERE e.id_envio IS NULL;

-- -----------------------------------------------------------------------------
-- 8) Catálogos mínimos
-- -----------------------------------------------------------------------------
SELECT '8. CATÁLOGOS MÍNIMOS' AS seccion;

SELECT
  'estados_envio' AS catalogo,
  COUNT(*) AS total,
  CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'REVISAR (esperado ≥ 5)' END AS estado
FROM estados_envio

UNION ALL

SELECT
  'roles',
  COUNT(*),
  CASE WHEN COUNT(*) >= 2 THEN 'OK' ELSE 'REVISAR (Admin + Operador)' END
FROM roles

UNION ALL

SELECT
  'usuarios_activos',
  COUNT(*),
  CASE WHEN COUNT(*) >= 1 THEN 'OK' ELSE 'REVISAR' END
FROM usuarios
WHERE activo = 1;

SELECT codigo, nombre, es_final, activo
FROM estados_envio
ORDER BY orden;

-- -----------------------------------------------------------------------------
-- 9) DataMart — sincronización básica
-- -----------------------------------------------------------------------------
SELECT '9. DATAMART' AS seccion;

SELECT
  (SELECT COUNT(*) FROM clientes WHERE activo = 1) AS clientes_operativos,
  (SELECT COUNT(*) FROM dim_cliente WHERE es_actual = 1) AS dim_cliente_actual,
  (SELECT COUNT(*) FROM envios WHERE activo = 1) AS envios_operativos,
  (SELECT COUNT(*) FROM fact_operaciones_logisticas) AS hechos_fact,
  CASE
    WHEN (SELECT COUNT(*) FROM dim_cliente WHERE es_actual = 1) = 0
     AND (SELECT COUNT(*) FROM clientes WHERE activo = 1) > 0
    THEN 'REVISAR — hay clientes pero dim_cliente vacío (correr ETL)'
    WHEN (SELECT COUNT(*) FROM fact_operaciones_logisticas) = 0
     AND (SELECT COUNT(*) FROM envios) > 0
    THEN 'INFO — hay envíos pero fact vacío (ETL pendiente)'
    ELSE 'OK o según etapa del proyecto'
  END AS evaluacion_datamart;

SELECT
  c.id_cliente,
  c.razon_social,
  c.dni,
  CASE WHEN d.id_dim_cliente IS NULL THEN 'FALTA en dim_cliente' ELSE 'OK' END AS estado_dim
FROM clientes c
LEFT JOIN dim_cliente d
  ON d.id_cliente_origen = c.id_cliente AND d.es_actual = 1
WHERE c.activo = 1
ORDER BY c.id_cliente
LIMIT 15;

-- -----------------------------------------------------------------------------
-- 10) Columnas extra en envios (medición fichas — script 02)
-- -----------------------------------------------------------------------------
SELECT '10. COLUMNAS MEDICIÓN en envios' AS seccion;

SELECT
  COLUMN_NAME AS columna,
  COLUMN_TYPE AS tipo,
  CASE
    WHEN COLUMN_NAME IN (
      'numero_paquetes','hora_inicio_registro','hora_fin_registro',
      'tiempo_registro_min','registro_correcto'
    ) THEN 'OK medición'
    ELSE 'estándar'
  END AS evaluacion
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'envios'
  AND COLUMN_NAME IN (
    'numero_paquetes','hora_inicio_registro','hora_fin_registro',
    'tiempo_registro_min','registro_correcto'
  );

-- -----------------------------------------------------------------------------
-- 11) RESUMEN FINAL — problemas detectados
-- -----------------------------------------------------------------------------
SELECT '11. RESUMEN FINAL' AS seccion;

SELECT problema, cantidad, severidad
FROM (
  SELECT 'Tablas faltantes' AS problema,
         COUNT(*) AS cantidad,
         'CRÍTICO' AS severidad
  FROM (
    SELECT e.tabla
    FROM (
      SELECT 'roles' AS tabla UNION ALL SELECT 'usuarios' UNION ALL SELECT 'clientes' UNION ALL
      SELECT 'estados_envio' UNION ALL SELECT 'envios' UNION ALL SELECT 'historial_estados' UNION ALL
      SELECT 'incidencias' UNION ALL SELECT 'evidencias' UNION ALL SELECT 'reportes' UNION ALL
      SELECT 'auditoria' UNION ALL SELECT 'dim_fecha' UNION ALL SELECT 'dim_cliente' UNION ALL
      SELECT 'dim_estado' UNION ALL SELECT 'dim_operador' UNION ALL SELECT 'fact_operaciones_logisticas'
    ) e
    LEFT JOIN information_schema.TABLES t
      ON t.TABLE_SCHEMA = DATABASE() AND t.TABLE_NAME = e.tabla
    WHERE t.TABLE_NAME IS NULL
  ) f

  UNION ALL

  SELECT 'Clientes con DNI inválido',
         COUNT(*),
         'CRÍTICO'
  FROM clientes
  WHERE dni IS NULL OR dni = '' OR dni NOT REGEXP '^[0-9]{8}$'

  UNION ALL

  SELECT 'DNI duplicados',
         COUNT(*),
         'CRÍTICO'
  FROM (
    SELECT dni FROM clientes GROUP BY dni HAVING COUNT(*) > 1
  ) d

  UNION ALL

  SELECT 'Envíos huérfanos (sin cliente)',
         COUNT(*),
         'CRÍTICO'
  FROM envios e
  LEFT JOIN clientes c ON c.id_cliente = e.id_cliente
  WHERE c.id_cliente IS NULL

  UNION ALL

  SELECT 'Columnas legacy en clientes',
         COUNT(*),
         'ADVERTENCIA'
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND COLUMN_NAME IN ('ruc','tipo_cliente','contacto','email','direccion','distrito','ciudad')

  UNION ALL

  SELECT 'Índice único DNI ausente',
         CASE
           WHEN EXISTS (
             SELECT 1 FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'clientes'
               AND COLUMN_NAME = 'dni'
               AND NON_UNIQUE = 0
           ) THEN 0 ELSE 1
         END,
         'CRÍTICO'

  UNION ALL

  SELECT 'Columna dni ausente en clientes',
         CASE
           WHEN EXISTS (
             SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'clientes'
               AND COLUMN_NAME = 'dni'
           ) THEN 0 ELSE 1
         END,
         'CRÍTICO'
) resumen
WHERE cantidad > 0
ORDER BY FIELD(severidad, 'CRÍTICO', 'ADVERTENCIA', 'INFO'), problema;

SELECT 'Si la consulta anterior no devolvió filas → no se detectaron problemas críticos.' AS mensaje_final;
