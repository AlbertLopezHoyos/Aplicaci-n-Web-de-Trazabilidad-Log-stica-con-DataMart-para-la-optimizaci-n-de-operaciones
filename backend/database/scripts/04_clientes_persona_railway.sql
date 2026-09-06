USE railway;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE dim_cliente;
DELETE FROM clientes;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE clientes MODIFY COLUMN dni VARCHAR(8) NOT NULL;
ALTER TABLE clientes ADD UNIQUE INDEX idx_clientes_dni (dni);

INSERT INTO clientes (razon_social, dni, telefono) VALUES
('Albert López Hoyos', '72345678', NULL),
('María García Ruiz', '45678901', NULL),
('Carlos Mendoza Vela', '73451289', NULL),
('Rosa Quispe Huamán', '47892345', NULL),
('José Torres Ramírez', '70123456', NULL);

INSERT INTO dim_cliente (id_cliente_origen, razon_social, ruc, ciudad, distrito, vigente_desde, es_actual)
SELECT id_cliente, razon_social, dni, NULL, NULL, CURDATE(), 1 FROM clientes;
