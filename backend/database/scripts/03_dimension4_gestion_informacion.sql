-- =============================================================================
-- MIGRACIÓN: Dimensión 4 — Gestión de la información operativa (PIOIC)
-- Indicador: % incidencias operativas con información completa
-- Ejecutar DESPUÉS de 01_schema_completo.sql y 02_medicion_fichas.sql
-- =============================================================================

USE trazabilidad_logistica;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE incidencias
  ADD COLUMN codigo_incidencia VARCHAR(30) NULL AFTER id_incidencia,
  ADD COLUMN area VARCHAR(100) NULL AFTER tipo,
  ADD COLUMN fuente_principal VARCHAR(120) NULL AFTER area,
  ADD COLUMN informacion_completa TINYINT(1) DEFAULT 0 AFTER fuente_principal;

UPDATE incidencias
SET codigo_incidencia = CONCAT('INC-', YEAR(COALESCE(fecha_reporte, created_at)), '-', LPAD(id_incidencia, 5, '0'))
WHERE codigo_incidencia IS NULL OR codigo_incidencia = '';

UPDATE incidencias
SET informacion_completa = IF(
  area IS NOT NULL AND area <> '' AND
  fuente_principal IS NOT NULL AND fuente_principal <> '' AND
  titulo IS NOT NULL AND titulo <> '' AND
  descripcion IS NOT NULL AND descripcion <> '',
  1, 0
);

DROP VIEW IF EXISTS vw_ficha_reportes;

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
  i.descripcion AS observacion
FROM incidencias i
LEFT JOIN envios e ON i.id_envio = e.id_envio
ORDER BY i.fecha_reporte DESC;

SELECT 'Migración 03_dimension4_gestion_informacion aplicada correctamente' AS mensaje;
