-- =============================================================================
-- MIGRACIÓN 10: Vistas de lectura para Power BI (DataMart)
-- Ejecutar DESPUÉS del ETL inicial. Idempotente (CREATE OR REPLACE VIEW).
-- Alternativa Node: npm run db:powerbi-setup
-- =============================================================================

USE trazabilidad_logistica;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW pbi_fact_operaciones AS
SELECT * FROM fact_operaciones_logisticas;

CREATE OR REPLACE VIEW pbi_dim_fecha AS
SELECT * FROM dim_fecha;

CREATE OR REPLACE VIEW pbi_dim_cliente AS
SELECT * FROM dim_cliente WHERE es_actual = 1;

CREATE OR REPLACE VIEW pbi_dim_estado AS
SELECT * FROM dim_estado WHERE es_actual = 1;

CREATE OR REPLACE VIEW pbi_dim_operador AS
SELECT * FROM dim_operador WHERE es_actual = 1;

CREATE OR REPLACE VIEW pbi_etl_ejecuciones AS
SELECT * FROM etl_ejecuciones;

SELECT 'Migración 10: vistas Power BI creadas' AS mensaje;
