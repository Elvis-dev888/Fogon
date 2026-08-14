-- ============================================================
-- FOGÓN — Etapa 8: base inicial del negocio
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v7_logo.sql. No borra nada.
--
-- Agrega capital_inicial a negocios: el dinero con el que arrancó
-- el negocio antes de empezar a registrar ingresos y egresos en
-- Fogón. Junto con todos los movimientos ya existentes (ventas,
-- compras, pagos, ingresos y egresos manuales) sirve para calcular
-- el saldo actual del negocio en la pestaña "Ingresos / Egresos".
-- ============================================================

alter table negocios add column if not exists capital_inicial numeric not null default 0;
