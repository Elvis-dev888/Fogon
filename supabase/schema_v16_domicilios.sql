-- =============================================================================
-- Kiosko - Schema v16: Datos de entrega y soporte para domicilios
-- Ejecuta este script en el SQL Editor de tu consola de Supabase.
-- =============================================================================

alter table pedidos add column if not exists tipo_entrega text not null default 'local'; -- 'local' o 'domicilio'
alter table pedidos add column if not exists direccion text default '';
alter table pedidos add column if not exists telefono text default '';
alter table pedidos add column if not exists notas_entrega text default '';

