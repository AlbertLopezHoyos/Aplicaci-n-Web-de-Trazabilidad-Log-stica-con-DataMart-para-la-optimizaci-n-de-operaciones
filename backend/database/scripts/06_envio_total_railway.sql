USE railway;

ALTER TABLE envios
  ADD COLUMN total_envio DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER peso_kg;
