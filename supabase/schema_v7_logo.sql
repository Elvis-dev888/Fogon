-- ============================================================
-- FOGÓN — Etapa 7: logo del negocio
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v6_stock.sql. No borra nada.
--
-- Agrega la columna logo_url a negocios. El dueño sube su imagen
-- desde el panel de Admin negocio (botón de cámara junto al
-- nombre del negocio); la imagen se guarda en el mismo bucket de
-- Storage "productos" que ya se usa para las fotos de productos
-- (bucket público para lectura, solo el admin del negocio puede
-- subir/actualizar/borrar — políticas creadas en schema_v4_extras.sql).
-- ============================================================

alter table negocios add column if not exists logo_url text;