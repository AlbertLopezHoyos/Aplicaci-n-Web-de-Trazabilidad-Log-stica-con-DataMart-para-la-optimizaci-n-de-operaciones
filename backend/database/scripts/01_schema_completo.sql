-- =============================================================================
-- TRAZABILIDAD LOGÍSTICA - GRUPO LOGÍSTICO SALAZAR S.A.C.
-- Script completo: BD, tablas, relaciones, datos, SP, vistas, triggers, DataMart
-- Ejecutar en MySQL Workbench o phpMyAdmin (MySQL 8.0+)
-- =============================================================================

DROP DATABASE IF EXISTS trazabilidad_logistica;
CREATE DATABASE trazabilidad_logistica
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trazabilidad_logistica;

-- -----------------------------------------------------------------------------
-- TABLAS OPERACIONALES
-- -----------------------------------------------------------------------------

CREATE TABLE roles (
  id_rol INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255),
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  id_rol INT NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  activo TINYINT(1) DEFAULT 1,
  ultimo_acceso DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  ruc VARCHAR(11) UNIQUE,
  contacto VARCHAR(150),
  email VARCHAR(150),
  telefono VARCHAR(20),
  direccion VARCHAR(255),
  distrito VARCHAR(100),
  ciudad VARCHAR(100) DEFAULT 'Lima',
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE estados_envio (
  id_estado INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(80) NOT NULL,
  descripcion VARCHAR(255),
  color_hex VARCHAR(7) DEFAULT '#64748b',
  orden INT DEFAULT 0,
  es_final TINYINT(1) DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE envios (
  id_envio INT AUTO_INCREMENT PRIMARY KEY,
  codigo_envio VARCHAR(30) NOT NULL UNIQUE,
  id_cliente INT NOT NULL,
  id_estado_actual INT NOT NULL,
  id_responsable INT NULL,
  origen VARCHAR(255) NOT NULL,
  destino VARCHAR(255) NOT NULL,
  fecha_registro DATE NOT NULL,
  fecha_estimada_entrega DATE NULL,
  fecha_entrega_real DATE NULL,
  tipo_carga VARCHAR(100) NOT NULL,
  peso_kg DECIMAL(10,2) DEFAULT 0,
  observaciones TEXT,
  prioridad ENUM('baja','normal','alta','urgente') DEFAULT 'normal',
  activo TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_envio_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
  CONSTRAINT fk_envio_estado FOREIGN KEY (id_estado_actual) REFERENCES estados_envio(id_estado),
  CONSTRAINT fk_envio_responsable FOREIGN KEY (id_responsable) REFERENCES usuarios(id_usuario)
    ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_envio_codigo (codigo_envio),
  INDEX idx_envio_fecha (fecha_registro),
  INDEX idx_envio_estado (id_estado_actual)
) ENGINE=InnoDB;

CREATE TABLE historial_estados (
  id_historial INT AUTO_INCREMENT PRIMARY KEY,
  id_envio INT NOT NULL,
  id_estado INT NOT NULL,
  id_usuario INT NULL,
  ubicacion VARCHAR(255),
  comentario TEXT,
  fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_envio FOREIGN KEY (id_envio) REFERENCES envios(id_envio) ON DELETE CASCADE,
  CONSTRAINT fk_hist_estado FOREIGN KEY (id_estado) REFERENCES estados_envio(id_estado),
  CONSTRAINT fk_hist_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_hist_envio (id_envio),
  INDEX idx_hist_fecha (fecha_hora)
) ENGINE=InnoDB;

CREATE TABLE incidencias (
  id_incidencia INT AUTO_INCREMENT PRIMARY KEY,
  id_envio INT NOT NULL,
  id_usuario_reporta INT NULL,
  tipo ENUM('error','retraso','dano','perdida','observacion','otro') NOT NULL DEFAULT 'observacion',
  severidad ENUM('baja','media','alta','critica') DEFAULT 'media',
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado_incidencia ENUM('abierta','en_revision','resuelta','cerrada') DEFAULT 'abierta',
  fecha_reporte DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion DATETIME NULL,
  resolucion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_incidencia_envio FOREIGN KEY (id_envio) REFERENCES envios(id_envio) ON DELETE CASCADE,
  CONSTRAINT fk_incidencia_usuario FOREIGN KEY (id_usuario_reporta) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE evidencias (
  id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
  id_envio INT NOT NULL,
  id_usuario INT NULL,
  id_incidencia INT NULL,
  tipo ENUM('imagen','comprobante','documento','firma','otro') DEFAULT 'imagen',
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta_archivo VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  tamano_bytes INT,
  descripcion VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evidencia_envio FOREIGN KEY (id_envio) REFERENCES envios(id_envio) ON DELETE CASCADE,
  CONSTRAINT fk_evidencia_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_evidencia_incidencia FOREIGN KEY (id_incidencia) REFERENCES incidencias(id_incidencia) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE reportes (
  id_reporte INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  tipo_reporte VARCHAR(80) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  parametros JSON,
  ruta_archivo VARCHAR(500),
  formato ENUM('pdf','excel','json') DEFAULT 'pdf',
  estado ENUM('generado','error','pendiente') DEFAULT 'generado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reporte_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE auditoria (
  id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  tabla_afectada VARCHAR(80),
  accion ENUM('INSERT','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','OTRO') NOT NULL,
  registro_id VARCHAR(50),
  datos_anteriores JSON,
  datos_nuevos JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_auditoria_fecha (created_at),
  INDEX idx_auditoria_tabla (tabla_afectada)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- TABLAS PREPARADAS PARA DATAMART (Esquema estrella - staging)
-- -----------------------------------------------------------------------------

CREATE TABLE dim_fecha (
  id_fecha INT PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  anio SMALLINT NOT NULL,
  trimestre TINYINT NOT NULL,
  mes TINYINT NOT NULL,
  nombre_mes VARCHAR(20) NOT NULL,
  dia TINYINT NOT NULL,
  dia_semana TINYINT NOT NULL,
  nombre_dia VARCHAR(15) NOT NULL,
  es_fin_semana TINYINT(1) DEFAULT 0,
  semana_anio TINYINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE dim_cliente (
  id_dim_cliente INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente_origen INT NOT NULL,
  razon_social VARCHAR(200) NOT NULL,
  ruc VARCHAR(11),
  ciudad VARCHAR(100),
  distrito VARCHAR(100),
  segmento VARCHAR(50) DEFAULT 'general',
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE NULL,
  es_actual TINYINT(1) DEFAULT 1,
  INDEX idx_dim_cliente_origen (id_cliente_origen)
) ENGINE=InnoDB;

CREATE TABLE dim_estado (
  id_dim_estado INT AUTO_INCREMENT PRIMARY KEY,
  id_estado_origen INT NOT NULL,
  codigo VARCHAR(30) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  es_final TINYINT(1) DEFAULT 0,
  categoria VARCHAR(50),
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE NULL,
  es_actual TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE dim_operador (
  id_dim_operador INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario_origen INT NOT NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  rol VARCHAR(50),
  vigente_desde DATE NOT NULL,
  vigente_hasta DATE NULL,
  es_actual TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE fact_operaciones_logisticas (
  id_fact BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_envio INT NOT NULL,
  id_fecha_registro INT NOT NULL,
  id_fecha_entrega INT NULL,
  id_dim_cliente INT NOT NULL,
  id_dim_estado INT NOT NULL,
  id_dim_operador INT NULL,
  codigo_envio VARCHAR(30) NOT NULL,
  peso_kg DECIMAL(10,2) DEFAULT 0,
  tipo_carga VARCHAR(100),
  dias_transito INT NULL,
  cantidad_incidencias INT DEFAULT 0,
  tuvo_retraso TINYINT(1) DEFAULT 0,
  entregado_a_tiempo TINYINT(1) NULL,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fact_fecha_reg FOREIGN KEY (id_fecha_registro) REFERENCES dim_fecha(id_fecha),
  CONSTRAINT fk_fact_fecha_ent FOREIGN KEY (id_fecha_entrega) REFERENCES dim_fecha(id_fecha),
  CONSTRAINT fk_fact_dim_cliente FOREIGN KEY (id_dim_cliente) REFERENCES dim_cliente(id_dim_cliente),
  CONSTRAINT fk_fact_dim_estado FOREIGN KEY (id_dim_estado) REFERENCES dim_estado(id_dim_estado),
  CONSTRAINT fk_fact_dim_operador FOREIGN KEY (id_dim_operador) REFERENCES dim_operador(id_dim_operador),
  INDEX idx_fact_envio (id_envio),
  INDEX idx_fact_fecha (id_fecha_registro)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- DATOS INICIALES
-- -----------------------------------------------------------------------------

INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema, configuración y reportes'),
('Operador logístico', 'Gestión de envíos, seguimiento e incidencias');

-- Password: Admin123! y Operador123! (bcrypt generado en seeder Node; aquí placeholders)
INSERT INTO usuarios (id_rol, nombres, apellidos, email, password_hash, telefono) VALUES
(1, 'Carlos', 'Salazar Mendoza', 'admin@salazarlogistica.pe',
 '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxPLACEHOLDER_ADMIN_HASH_REPLACE_IN_SEED', '999111000'),
(2, 'María', 'Torres Vega', 'operador@salazarlogistica.pe',
 '$2b$10$rQZ8K8Y5Y5Y5Y5Y5Y5Y5YuGKxPLACEHOLDER_OPER_HASH_REPLACE_IN_SEED', '999222000');

INSERT INTO estados_envio (codigo, nombre, descripcion, color_hex, orden, es_final) VALUES
('recibido', 'Recibido', 'Envío registrado en almacén origen', '#3b82f6', 1, 0),
('en_transito', 'En tránsito', 'Mercadería en ruta hacia destino', '#f59e0b', 2, 0),
('entregado', 'Entregado', 'Entrega confirmada al destinatario', '#22c55e', 3, 1),
('retrasado', 'Retrasado', 'Fuera del plazo estimado', '#ef4444', 4, 0),
('cancelado', 'Cancelado', 'Envío cancelado', '#6b7280', 5, 1);

INSERT INTO clientes (razon_social, ruc, contacto, email, telefono, direccion, distrito) VALUES
('Comercial Andina S.A.C.', '20123456789', 'Juan Pérez', 'contacto@andina.pe', '014567890', 'Av. Javier Prado 1234', 'La Molina'),
('Distribuidora Norte E.I.R.L.', '20987654321', 'Ana Gómez', 'ventas@norte.pe', '014321098', 'Av. Túpac Amaru 567', 'Los Olivos'),
('Importaciones del Pacífico S.A.', '20456789123', 'Luis Ramírez', 'logistica@pacifico.pe', '013456789', 'Calle Los Pinos 89', 'Miraflores'),
('Grupo Industrial Sur S.A.C.', '20111222333', 'Rosa Mendoza', 'compras@industrial.pe', '016789012', 'Av. Industrial 456', 'Villa El Salvador'),
('Tech Solutions Perú S.A.C.', '20555666777', 'Pedro Castillo', 'admin@techsol.pe', '012345678', 'Av. Arequipa 2100', 'Lince');

-- Procedimiento para generar código de envío
DELIMITER //
CREATE PROCEDURE sp_generar_codigo_envio(OUT p_codigo VARCHAR(30))
BEGIN
  DECLARE v_anio CHAR(4);
  DECLARE v_seq INT;
  SET v_anio = YEAR(CURDATE());
  SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_envio, 10) AS UNSIGNED)), 0) + 1 INTO v_seq
  FROM envios WHERE codigo_envio LIKE CONCAT('GLS-', v_anio, '-%');
  SET p_codigo = CONCAT('GLS-', v_anio, '-', LPAD(v_seq, 5, '0'));
END //
DELIMITER ;

-- Procedimiento: KPIs dashboard
DELIMITER //
CREATE PROCEDURE sp_kpis_dashboard()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM envios WHERE activo = 1) AS total_envios,
    (SELECT COUNT(*) FROM envios e JOIN estados_envio s ON e.id_estado_actual = s.id_estado
     WHERE s.codigo = 'entregado' AND e.activo = 1) AS envios_entregados,
    (SELECT COUNT(*) FROM envios e JOIN estados_envio s ON e.id_estado_actual = s.id_estado
     WHERE s.codigo IN ('recibido','en_transito','retrasado') AND e.activo = 1) AS envios_pendientes,
    (SELECT COUNT(*) FROM incidencias WHERE estado_incidencia IN ('abierta','en_revision')) AS incidencias_abiertas,
    (SELECT ROUND(AVG(DATEDIFF(fecha_entrega_real, fecha_registro)), 1)
     FROM envios WHERE fecha_entrega_real IS NOT NULL AND activo = 1) AS dias_promedio_entrega;
END //
DELIMITER ;

-- Vista: resumen envíos por estado
CREATE OR REPLACE VIEW vw_envios_por_estado AS
SELECT s.codigo, s.nombre AS estado, s.color_hex, COUNT(e.id_envio) AS cantidad
FROM estados_envio s
LEFT JOIN envios e ON e.id_estado_actual = s.id_estado AND e.activo = 1
GROUP BY s.id_estado, s.codigo, s.nombre, s.color_hex
ORDER BY s.orden;

-- Vista: línea de tiempo por envío
CREATE OR REPLACE VIEW vw_timeline_envio AS
SELECT h.id_historial, h.id_envio, e.codigo_envio, s.nombre AS estado,
       s.color_hex, h.ubicacion, h.comentario, h.fecha_hora,
       CONCAT(u.nombres, ' ', u.apellidos) AS operador
FROM historial_estados h
JOIN envios e ON h.id_envio = e.id_envio
JOIN estados_envio s ON h.id_estado = s.id_estado
LEFT JOIN usuarios u ON h.id_usuario = u.id_usuario
ORDER BY h.fecha_hora DESC;

-- Vista: productividad operadores
CREATE OR REPLACE VIEW vw_productividad_operadores AS
SELECT u.id_usuario, CONCAT(u.nombres, ' ', u.apellidos) AS operador,
       COUNT(DISTINCT e.id_envio) AS envios_gestionados,
       SUM(CASE WHEN s.codigo = 'entregado' THEN 1 ELSE 0 END) AS entregas,
       COUNT(DISTINCT i.id_incidencia) AS incidencias_reportadas
FROM usuarios u
LEFT JOIN envios e ON e.id_responsable = u.id_usuario AND e.activo = 1
LEFT JOIN estados_envio s ON e.id_estado_actual = s.id_estado
LEFT JOIN incidencias i ON i.id_usuario_reporta = u.id_usuario
WHERE u.activo = 1
GROUP BY u.id_usuario, u.nombres, u.apellidos;

-- Trigger: auditoría en cambio de estado de envío
DELIMITER //
CREATE TRIGGER trg_envio_estado_audit
AFTER UPDATE ON envios
FOR EACH ROW
BEGIN
  IF OLD.id_estado_actual <> NEW.id_estado_actual THEN
    INSERT INTO auditoria (tabla_afectada, accion, registro_id, datos_anteriores, datos_nuevos)
    VALUES ('envios', 'UPDATE', NEW.id_envio,
      JSON_OBJECT('id_estado_actual', OLD.id_estado_actual),
      JSON_OBJECT('id_estado_actual', NEW.id_estado_actual));
  END IF;
END //
DELIMITER ;

-- Trigger: historial automático al insertar envío
DELIMITER //
CREATE TRIGGER trg_envio_historial_insert
AFTER INSERT ON envios
FOR EACH ROW
BEGIN
  INSERT INTO historial_estados (id_envio, id_estado, id_usuario, comentario, fecha_hora)
  VALUES (NEW.id_envio, NEW.id_estado_actual, NEW.id_responsable, 'Registro inicial del envío', NOW());
END //
DELIMITER ;

-- Poblar dim_fecha (2024-2027)
DELIMITER //
CREATE PROCEDURE sp_poblar_dim_fecha(IN p_desde DATE, IN p_hasta DATE)
BEGIN
  DECLARE v_fecha DATE;
  SET v_fecha = p_desde;
  WHILE v_fecha <= p_hasta DO
    INSERT IGNORE INTO dim_fecha (id_fecha, fecha, anio, trimestre, mes, nombre_mes, dia, dia_semana, nombre_dia, es_fin_semana, semana_anio)
    VALUES (
      DATE_FORMAT(v_fecha, '%Y%m%d'),
      v_fecha, YEAR(v_fecha), QUARTER(v_fecha), MONTH(v_fecha),
      MONTHNAME(v_fecha), DAY(v_fecha), DAYOFWEEK(v_fecha),
      DAYNAME(v_fecha), IF(DAYOFWEEK(v_fecha) IN (1,7), 1, 0), WEEK(v_fecha, 1)
    );
    SET v_fecha = DATE_ADD(v_fecha, INTERVAL 1 DAY);
  END WHILE;
END //
DELIMITER ;

CALL sp_poblar_dim_fecha('2024-01-01', '2027-12-31');

-- Sincronizar dimensiones iniciales desde tablas operacionales
INSERT INTO dim_estado (id_estado_origen, codigo, nombre, es_final, categoria, vigente_desde, es_actual)
SELECT id_estado, codigo, nombre, es_final, 'logistico', CURDATE(), 1 FROM estados_envio;

INSERT INTO dim_cliente (id_cliente_origen, razon_social, ruc, ciudad, distrito, vigente_desde, es_actual)
SELECT id_cliente, razon_social, ruc, ciudad, distrito, CURDATE(), 1 FROM clientes;

INSERT INTO dim_operador (id_usuario_origen, nombre_completo, rol, vigente_desde, es_actual)
SELECT u.id_usuario, CONCAT(u.nombres, ' ', u.apellidos), r.nombre, CURDATE(), 1
FROM usuarios u JOIN roles r ON u.id_rol = r.id_rol;

-- Envíos de ejemplo (ejecutar después de usuarios con hash válido vía seeder)
-- Se insertan desde seed.js de Node.js para hashes bcrypt correctos

SELECT 'Base de datos creada correctamente' AS mensaje;
