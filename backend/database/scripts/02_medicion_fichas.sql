-- =============================================================================
-- MIGRACIÓN: Campos de medición para fichas de observación (Tesis 2026)
-- Ejecutar DESPUÉS de 01_schema_completo.sql en MySQL Workbench / phpMyAdmin
-- =============================================================================

USE trazabilidad_logistica;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Dimensión 1: Eficiencia operativa (TPRE)
ALTER TABLE envios
  ADD COLUMN numero_paquetes INT DEFAULT 1 AFTER peso_kg,
  ADD COLUMN hora_inicio_registro DATETIME NULL AFTER numero_paquetes,
  ADD COLUMN hora_fin_registro DATETIME NULL AFTER hora_inicio_registro,
  ADD COLUMN tiempo_registro_min DECIMAL(8,2) NULL AFTER hora_fin_registro,
  ADD COLUMN registro_correcto TINYINT(1) DEFAULT 1 AFTER tiempo_registro_min;

-- Dimensión 2: Calidad de información (PER)
CREATE TABLE IF NOT EXISTS errores_registro (
  id_error INT AUTO_INCREMENT PRIMARY KEY,
  id_envio INT NULL,
  id_usuario INT NULL,
  codigo_envio VARCHAR(30) NULL,
  tipo_error VARCHAR(80) NOT NULL,
  campo_afectado VARCHAR(80) NOT NULL,
  descripcion TEXT,
  corregido TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_error_envio FOREIGN KEY (id_envio) REFERENCES envios(id_envio) ON DELETE SET NULL,
  CONSTRAINT fk_error_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_error_envio (id_envio),
  INDEX idx_error_fecha (created_at)
) ENGINE=InnoDB;

-- Dimensión 4: Toma de decisiones (TPGRO)
ALTER TABLE reportes
  ADD COLUMN hora_inicio DATETIME NULL,
  ADD COLUMN hora_fin DATETIME NULL,
  ADD COLUMN tiempo_generacion_min DECIMAL(8,2) NULL,
  ADD COLUMN area_solicitante VARCHAR(100) NULL,
  ADD COLUMN cantidad_registros INT NULL,
  ADD COLUMN observaciones TEXT NULL;

-- Vistas para exportación de fichas
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
  e.tiempo_registro_min AS tiempo_registro_min,
  CONCAT(u.nombres, ' ', u.apellidos) AS usuario_responsable,
  e.observaciones
FROM envios e
LEFT JOIN usuarios u ON e.id_responsable = u.id_usuario
WHERE e.activo = 1
ORDER BY e.created_at DESC;

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
  COALESCE(
    (SELECT er.campo_afectado FROM errores_registro er WHERE er.id_envio = e.id_envio ORDER BY er.created_at DESC LIMIT 1),
    NULL
  ) AS campo_afectado,
  e.observaciones
FROM envios e
WHERE e.activo = 1
ORDER BY e.created_at DESC;

CREATE OR REPLACE VIEW vw_ficha_control AS
SELECT
  e.codigo_envio,
  DATE(e.fecha_registro) AS fecha,
  e.tipo_carga AS tipo_mercaderia,
  e.origen,
  e.destino,
  s.nombre AS estado_actual,
  IF(ult.id_estado IS NOT NULL AND ult.id_estado = e.id_estado_actual, 'Sí', 'No') AS estado_actualizado,
  DATE(COALESCE(ult.fecha_hora, e.hora_fin_registro, e.hora_inicio_registro)) AS fecha_actualizacion,
  TIME(COALESCE(ult.fecha_hora, e.hora_fin_registro, e.hora_inicio_registro)) AS hora_actualizacion,
  CONCAT(u.nombres, ' ', u.apellidos) AS responsable_actualizacion,
  e.observaciones
FROM envios e
JOIN estados_envio s ON e.id_estado_actual = s.id_estado
LEFT JOIN (
  SELECT id_envio, id_estado, fecha_hora, id_usuario
  FROM (
    SELECT
      h.*,
      ROW_NUMBER() OVER (
        PARTITION BY h.id_envio
        ORDER BY h.fecha_hora DESC, h.id_historial DESC
      ) AS rn
    FROM historial_estados h
  ) x
  WHERE x.rn = 1
) ult ON ult.id_envio = e.id_envio
LEFT JOIN usuarios u ON ult.id_usuario = u.id_usuario
WHERE e.activo = 1
ORDER BY e.created_at DESC;

CREATE OR REPLACE VIEW vw_ficha_reportes AS
SELECT
  DATE(r.hora_inicio) AS fecha,
  r.tipo_reporte AS tipo_reporte,
  r.area_solicitante,
  TIME(r.hora_inicio) AS hora_inicio,
  TIME(r.hora_fin) AS hora_fin,
  r.tiempo_generacion_min AS tiempo_generacion_min,
  r.cantidad_registros AS cantidad_registros_analizados,
  ROUND(r.cantidad_registros / NULLIF(r.tiempo_generacion_min / 60, 0), 2) AS productividad_registros_hora,
  ROUND(60 / NULLIF(r.tiempo_generacion_min, 0), 2) AS productividad_tiempos_registro,
  CONCAT(u.nombres, ' ', u.apellidos) AS usuario_genera,
  r.observaciones
FROM reportes r
LEFT JOIN usuarios u ON r.id_usuario = u.id_usuario
WHERE r.estado = 'generado'
ORDER BY r.hora_inicio DESC;

SELECT 'Migración 02_medicion_fichas aplicada correctamente' AS mensaje;
