-- ============================================================
-- FOGÓN — Etapa 9: costo y valor del inventario
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v8_finanzas.sql. No borra nada.
--
-- Agrega costo_unitario a ingredientes. Cada vez que se registra
-- una compra, este costo se recalcula solo como un promedio
-- ponderado entre lo que ya había en existencia y lo nuevo que
-- se compró — así, si un mismo ingrediente se compra a precios
-- distintos en fechas distintas, el "valor del inventario" sigue
-- siendo una cifra realista.
-- ============================================================

alter table ingredientes add column if not exists costo_unitario numeric not null default 0;