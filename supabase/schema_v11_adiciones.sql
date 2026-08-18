-- ============================================================
-- FOGÓN — Etapa 11: adiciones como su propio producto
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v10_inventario.sql. No borra nada.
--
-- Agrega es_adicion a productos. Un producto con es_adicion = true
-- (ej: "Bolita de helado extra", "Coca-Cola 400ml") no aparece en
-- el catálogo normal que ve el cliente — en cambio, se ofrece como
-- opción extra al personalizar CUALQUIER otro producto del menú,
-- junto con las adiciones específicas que ya tenía cada producto
-- (el campo "adiciones" jsonb, que sigue funcionando igual).
-- ============================================================

alter table productos add column if not exists es_adicion boolean not null default false;
