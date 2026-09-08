-- =============================================================================
-- MIGRACIÓN 07: Separación entre muestra de investigación y datos sintéticos
-- Ejecutar DESPUÉS de 01, 02 y 03.
--
-- Objetivo:
--   * Marcar el ORIGEN del dato (REAL | SINTETICO).
--   * Marcar el GRUPO de la muestra de investigación
--     (PREPRUEBA | POSPRUEBA | NO_MUESTRA).
--   * Registrar las ejecuciones del proceso ETL del DataMart.
--
-- Los indicadores de investigación (TPRE, PER, PEEA, PIOIC) SOLO deben
-- calcularse sobre registros con origen_dato = 'REAL' y
-- grupo_muestra IN ('PREPRUEBA','POSPRUEBA').
--
-- Esta migración es idempotente y NO elimina registros existentes.
-- =============================================================================

USE trazabilidad_logistica;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Helper idempotente para agregar columnas (MySQL 8 no soporta IF NOT EXISTS)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_add_column_if_missing;
DELIMITER //
CREATE PROCEDURE sp_add_column_if_missing(
  IN p_tabla VARCHAR(64),
  IN p_columna VARCHAR(64),
  IN p_definicion TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND COLUMN_NAME = p_columna
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_columna, '` ', p_definicion);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 1) Trazabilidad de la muestra en envíos e incidencias
-- -----------------------------------------------------------------------------
CALL sp_add_column_if_missing('envios', 'origen_dato',
  "ENUM('REAL','SINTETICO') NOT NULL DEFAULT 'REAL' COMMENT 'Procedencia del registro'");
CALL sp_add_column_if_missing('envios', 'grupo_muestra',
  "ENUM('PREPRUEBA','POSPRUEBA','NO_MUESTRA') NOT NULL DEFAULT 'NO_MUESTRA' COMMENT 'Grupo de la muestra de investigacion'");

CALL sp_add_column_if_missing('incidencias', 'origen_dato',
  "ENUM('REAL','SINTETICO') NOT NULL DEFAULT 'REAL' COMMENT 'Procedencia del registro'");
CALL sp_add_column_if_missing('incidencias', 'grupo_muestra',
  "ENUM('PREPRUEBA','POSPRUEBA','NO_MUESTRA') NOT NULL DEFAULT 'NO_MUESTRA' COMMENT 'Grupo de la muestra de investigacion'");

-- La tabla de hechos arrastra el origen para que Power BI pueda separar
-- los datos sintéticos de prueba de los datos reales.
CALL sp_add_column_if_missing('fact_operaciones_logisticas', 'origen_dato',
  "ENUM('REAL','SINTETICO') NOT NULL DEFAULT 'SINTETICO' COMMENT 'Procedencia del envio de origen'");

DROP PROCEDURE IF EXISTS sp_add_column_if_missing;

-- Índices de apoyo para las consultas de indicadores
DROP PROCEDURE IF EXISTS sp_add_index_if_missing;
DELIMITER //
CREATE PROCEDURE sp_add_index_if_missing(
  IN p_tabla VARCHAR(64),
  IN p_indice VARCHAR(64),
  IN p_columnas VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_tabla AND INDEX_NAME = p_indice
  ) THEN
    SET @ddl = CONCAT('CREATE INDEX `', p_indice, '` ON `', p_tabla, '` (', p_columnas, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL sp_add_index_if_missing('envios', 'idx_envios_muestra', 'origen_dato, grupo_muestra');
CALL sp_add_index_if_missing('incidencias', 'idx_incidencias_muestra', 'origen_dato, grupo_muestra');

DROP PROCEDURE IF EXISTS sp_add_index_if_missing;

-- -----------------------------------------------------------------------------
-- 1b) Grano de la tabla de hechos: una fila por operación de envío.
--     La restricción UNIQUE hace que el ETL sea idempotente a nivel de motor.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_asegurar_grano_hechos;
DELIMITER //
CREATE PROCEDURE sp_asegurar_grano_hechos()
BEGIN
  DECLARE v_duplicados INT DEFAULT 0;
  DECLARE v_existe INT DEFAULT 0;

  SELECT COUNT(*) INTO v_existe FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fact_operaciones_logisticas'
    AND INDEX_NAME = 'uk_fact_envio';

  IF v_existe = 0 THEN
    SELECT COUNT(*) INTO v_duplicados FROM (
      SELECT id_envio FROM fact_operaciones_logisticas
      GROUP BY id_envio HAVING COUNT(*) > 1
    ) d;

    IF v_duplicados = 0 THEN
      ALTER TABLE fact_operaciones_logisticas ADD UNIQUE KEY uk_fact_envio (id_envio);
      SELECT 'Grano garantizado: UNIQUE(id_envio) creado en fact_operaciones_logisticas' AS aviso;
    ELSE
      SELECT CONCAT('AVISO: existen ', v_duplicados,
        ' id_envio duplicados en fact_operaciones_logisticas. Depure la tabla y vuelva a ejecutar.') AS aviso;
    END IF;
  END IF;
END //
DELIMITER ;

CALL sp_asegurar_grano_hechos();
DROP PROCEDURE IF EXISTS sp_asegurar_grano_hechos;

-- -----------------------------------------------------------------------------
-- 2) Clasificación de los registros ya existentes
--
-- Los envíos generados por `npm run db:seed-bulk` llevan la observación
-- "carga masiva DataMart"; los de `npm run db:seed` llevan "demostración".
-- Ambos son DATOS SINTÉTICOS de prueba técnica, no muestra de investigación.
-- -----------------------------------------------------------------------------
UPDATE envios
SET origen_dato = 'SINTETICO', grupo_muestra = 'NO_MUESTRA'
WHERE observaciones LIKE '%carga masiva DataMart%'
   OR observaciones LIKE '%demostración%'
   OR observaciones LIKE '%demostracion%';

UPDATE incidencias i
JOIN envios e ON e.id_envio = i.id_envio
SET i.origen_dato = 'SINTETICO', i.grupo_muestra = 'NO_MUESTRA'
WHERE e.origen_dato = 'SINTETICO';

-- Una incidencia hereda siempre el origen del envío al que pertenece
UPDATE incidencias i
JOIN envios e ON e.id_envio = i.id_envio
SET i.origen_dato = e.origen_dato, i.grupo_muestra = e.grupo_muestra;

-- -----------------------------------------------------------------------------
-- 3) Bitácora de ejecuciones del ETL
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_ejecuciones (
  id_ejecucion INT AUTO_INCREMENT PRIMARY KEY,
  proceso VARCHAR(80) NOT NULL DEFAULT 'staging_datamart',
  fecha_inicio DATETIME NOT NULL,
  fecha_fin DATETIME NULL,
  estado ENUM('EN_PROCESO','EXITOSO','FALLIDO') NOT NULL DEFAULT 'EN_PROCESO',
  registros_extraidos INT NOT NULL DEFAULT 0,
  registros_transformados INT NOT NULL DEFAULT 0,
  registros_cargados INT NOT NULL DEFAULT 0,
  mensaje_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_etl_fecha (fecha_inicio)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4) Vistas de fichas con la marca de muestra
--    (el backend filtra explícitamente, estas vistas son para Workbench/BI)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_ficha_eficiencia AS
SELECT
  e.codigo_envio,
  e.fecha_registro AS fecha,
  e.tipo_carga AS tipo_mercaderia,
  e.peso_kg,
  e.numero_paquetes,
  e.origen,
  e.destino,
  TIME(e.hora_inicio_registro) AS hora_inicio,
  TIME(e.hora_fin_registro) AS hora_fin,
  e.tiempo_registro_min,
  CONCAT(u.nombres, ' ', u.apellidos) AS usuario_responsable,
  e.observaciones,
  e.origen_dato,
  e.grupo_muestra
FROM envios e
LEFT JOIN usuarios u ON e.id_responsable = u.id_usuario
WHERE e.activo = 1;

CREATE OR REPLACE VIEW vw_ficha_calidad AS
SELECT
  e.codigo_envio,
  e.fecha_registro AS fecha,
  e.tipo_carga AS tipo_mercaderia,
  e.destino,
  e.numero_paquetes,
  IF(e.registro_correcto = 1 AND NOT EXISTS (
    SELECT 1 FROM errores_registro er WHERE er.id_envio = e.id_envio
  ), 'No', 'Sí') AS error_en_registro,
  COALESCE(
    (SELECT er.tipo_error FROM errores_registro er WHERE er.id_envio = e.id_envio ORDER BY er.created_at DESC LIMIT 1),
    IF(e.registro_correcto = 0, 'validacion', NULL)
  ) AS tipo_error,
  (SELECT er.campo_afectado FROM errores_registro er WHERE er.id_envio = e.id_envio ORDER BY er.created_at DESC LIMIT 1) AS campo_afectado,
  e.observaciones,
  e.origen_dato,
  e.grupo_muestra
FROM envios e
WHERE e.activo = 1;

-- PEEA: el estado está actualizado cuando el estado actual del envío coincide
-- con el último estado registrado en su historial.
CREATE OR REPLACE VIEW vw_ficha_control AS
SELECT
  e.codigo_envio,
  e.fecha_registro AS fecha,
  e.tipo_carga AS tipo_mercaderia,
  e.origen,
  e.destino,
  s.nombre AS estado_actual,
  IF(ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual, 'Sí', 'No') AS estado_actualizado,
  DATE(ult.fecha_hora) AS fecha_actualizacion,
  TIME(ult.fecha_hora) AS hora_actualizacion,
  CONCAT(u.nombres, ' ', u.apellidos) AS responsable_actualizacion,
  e.observaciones,
  e.origen_dato,
  e.grupo_muestra
FROM envios e
JOIN estados_envio s ON e.id_estado_actual = s.id_estado
LEFT JOIN (
  SELECT h1.id_envio, h1.id_estado, h1.fecha_hora, h1.id_usuario
  FROM historial_estados h1
  JOIN (
    SELECT id_envio, MAX(id_historial) AS id_historial
    FROM historial_estados
    GROUP BY id_envio
  ) hm ON hm.id_historial = h1.id_historial
) ult ON ult.id_envio = e.id_envio
LEFT JOIN usuarios u ON ult.id_usuario = u.id_usuario
WHERE e.activo = 1;

CREATE OR REPLACE VIEW vw_ficha_informacion_operativa AS
SELECT
  DATE(i.fecha_reporte) AS fecha,
  i.codigo_incidencia,
  i.tipo AS tipo_incidencia,
  i.area,
  e.codigo_envio,
  i.estado_incidencia,
  IF(i.informacion_completa = 1, 'Sí', 'No') AS informacion_completa,
  i.fuente_principal,
  i.descripcion AS observacion,
  i.origen_dato,
  i.grupo_muestra
FROM incidencias i
LEFT JOIN envios e ON e.id_envio = i.id_envio;

SELECT 'Migración 07_muestra_investigacion aplicada correctamente' AS mensaje;
SELECT origen_dato, grupo_muestra, COUNT(*) AS envios FROM envios GROUP BY origen_dato, grupo_muestra;
