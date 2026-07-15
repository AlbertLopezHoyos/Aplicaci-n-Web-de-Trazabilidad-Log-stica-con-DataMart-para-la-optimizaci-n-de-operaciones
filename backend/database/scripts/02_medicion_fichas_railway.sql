-- =============================================================================
-- MIGRACIÃ“N: Campos de mediciÃ³n para fichas de observaciÃ³n (Tesis 2026)
-- Ejecutar DESPUÃ‰S de 01_schema_completo.sql en MySQL Workbench / phpMyAdmin
-- =============================================================================

USE railway;

-- DimensiÃ³n 1: Eficiencia operativa (TPRE)
ALTER TABLE envios
  ADD COLUMN numero_paquetes INT DEFAULT 1 AFTER peso_kg,
  ADD COLUMN hora_inicio_registro DATETIME NULL AFTER numero_paquetes,
  ADD COLUMN hora_fin_registro DATETIME NULL AFTER hora_inicio_registro,
  ADD COLUMN tiempo_registro_min DECIMAL(8,2) NULL AFTER hora_fin_registro,
  ADD COLUMN registro_correcto TINYINT(1) DEFAULT 1 AFTER tiempo_registro_min;

-- DimensiÃ³n 2: Calidad de informaciÃ³n (PER)
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

-- DimensiÃ³n 4: Toma de decisiones (TPGRO)
ALTER TABLE reportes
  ADD COLUMN hora_inicio DATETIME NULL,
  ADD COLUMN hora_fin DATETIME NULL,
  ADD COLUMN tiempo_generacion_min DECIMAL(8,2) NULL,
  ADD COLUMN area_solicitante VARCHAR(100) NULL,
  ADD COLUMN cantidad_registros INT NULL,
  ADD COLUMN observaciones TEXT NULL;

-- Vistas para exportaciÃ³n de fichas
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
  ), 'No', 'SÃ­') AS error_en_registro,
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
  e.fecha_registro AS fecha,
  e.tipo_carga AS tipo_mercaderia,
  e.origen,
  e.destino,
  s.nombre AS estado_actual,
  IF(COUNT(h.id_historial) > 1 OR s.codigo NOT IN ('recibido'), 'SÃ­', 'No') AS estado_actualizado,
  DATE(MAX(h.fecha_hora)) AS fecha_actualizacion,
  TIME(MAX(h.fecha_hora)) AS hora_actualizacion,
  CONCAT(u.nombres, ' ', u.apellidos) AS responsable_actualizacion,
  e.observaciones
FROM envios e
JOIN estados_envio s ON e.id_estado_actual = s.id_estado
LEFT JOIN historial_estados h ON h.id_envio = e.id_envio
LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
WHERE e.activo = 1
GROUP BY e.id_envio, e.codigo_envio, e.fecha_registro, e.tipo_carga, e.origen, e.destino,
         s.nombre, s.codigo, u.nombres, u.apellidos, e.observaciones
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

SELECT 'MigraciÃ³n 02_medicion_fichas aplicada correctamente' AS mensaje;

