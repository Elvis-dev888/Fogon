-- ============================================================
-- FOGÓN — Etapa 12: editar y cancelar pedidos
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v11_adiciones.sql. No borra nada.
--
-- Agrega el estado "Cancelado" a los pedidos, y dos columnas para
-- guardar cuándo se canceló y quién lo hizo (para el historial).
-- Los pedidos cancelados NUNCA se borran, solo cambian de estado.
-- ============================================================

alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('Pendiente','En preparación','Listo','Entregado','Cancelado'));

alter table pedidos add column if not exists cancelado_en timestamptz;
alter table pedidos add column if not exists cancelado_por text;