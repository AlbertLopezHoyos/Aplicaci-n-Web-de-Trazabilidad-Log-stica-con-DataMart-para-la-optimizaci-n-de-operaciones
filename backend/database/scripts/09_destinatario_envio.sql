-- =============================================================================
-- MIGRACIÓN 09: Destinatario del envío (nombre + DNI + teléfono obligatorios)
-- Ejecutar DESPUÉS de 08_incidencia_observacion.sql.
-- Idempotente. Rellena filas existentes con valores derivados del cliente.
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
  'envios',
  'nombre_destinatario',
  "VARCHAR(150) NULL COMMENT 'Persona que recibe el envío'"
);
CALL sp_add_column_if_missing(
  'envios',
  'dni_destinatario',
  "VARCHAR(8) NULL COMMENT 'DNI del destinatario (8 dígitos)'"
);
CALL sp_add_column_if_missing(
  'envios',
  'telefono_destinatario',
  "VARCHAR(20) NULL COMMENT 'Teléfono del destinatario'"
);

DROP PROCEDURE IF EXISTS sp_add_column_if_missing;

UPDATE envios e
JOIN clientes c ON c.id = e.cliente_id
SET
  e.nombre_destinatario = COALESCE(NULLIF(TRIM(e.nombre_destinatario), ''), CONCAT('Destinatario ', c.razon_social)),
  e.dni_destinatario = COALESCE(
    NULLIF(TRIM(e.dni_destinatario), ''),
    LPAD(MOD(e.id * 7919, 89999999) + 10000000, 8, '0')
  ),
  e.telefono_destinatario = COALESCE(
    NULLIF(TRIM(e.telefono_destinatario), ''),
    COALESCE(NULLIF(TRIM(c.telefono), ''), '999000000')
  )
WHERE e.nombre_destinatario IS NULL
   OR TRIM(e.nombre_destinatario) = ''
   OR e.dni_destinatario IS NULL
   OR TRIM(e.dni_destinatario) = ''
   OR e.telefono_destinatario IS NULL
   OR TRIM(e.telefono_destinatario) = '';

ALTER TABLE envios
  MODIFY COLUMN nombre_destinatario VARCHAR(150) NOT NULL,
  MODIFY COLUMN dni_destinatario VARCHAR(8) NOT NULL,
  MODIFY COLUMN telefono_destinatario VARCHAR(20) NOT NULL;

SELECT 'Migración 09: destinatario en envios aplicada' AS mensaje;
