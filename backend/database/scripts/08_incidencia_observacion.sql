-- =============================================================================
-- MIGRACIÓN 08: Campo opcional `observacion` en incidencias (ficha Dimensión 4)
-- Ejecutar DESPUÉS de 07_muestra_investigacion.sql.
--
-- La ficha de tesis de la Dimensión 4 exige Título, Descripción y Observación
-- como campos distintos. PIOIC NO usa `observacion`: sigue dependiendo solo de
-- tipo, area, titulo, descripcion y fuente_principal.
--
-- Idempotente. No altera registros existentes (la columna nace NULL).
-- =============================================================================

USE trazabilidad_logistica;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

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

CALL sp_add_column_if_missing(
  'incidencias',
  'observacion',
  "TEXT NULL COMMENT 'Observacion de ficha Dim. 4. No interviene en PIOIC'"
);

DROP PROCEDURE IF EXISTS sp_add_column_if_missing;

-- Recalcula completitud con los cinco campos de PIOIC (sin observacion).
CREATE OR REPLACE VIEW vw_ficha_informacion_operativa AS
SELECT
  DATE(i.fecha_reporte) AS fecha,
  i.codigo_incidencia,
  i.tipo AS tipo_incidencia,
  i.area,
  e.codigo_envio,
  i.estado_incidencia,
  i.titulo,
  i.descripcion,
  IF(
    TRIM(COALESCE(i.tipo, '')) <> '' AND
    TRIM(COALESCE(i.area, '')) <> '' AND
    TRIM(COALESCE(i.titulo, '')) <> '' AND
    TRIM(COALESCE(i.descripcion, '')) <> '' AND
    TRIM(COALESCE(i.fuente_principal, '')) <> '',
    'Sí', 'No'
  ) AS informacion_completa,
  i.fuente_principal,
  i.observacion,
  i.origen_dato,
  i.grupo_muestra
FROM incidencias i
LEFT JOIN envios e ON e.id_envio = i.id_envio;

SELECT 'Migración 08_incidencia_observacion aplicada correctamente' AS mensaje;
