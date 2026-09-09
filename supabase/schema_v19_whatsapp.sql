-- =============================================================================
-- Kiosko - Schema v19: Telefono / WhatsApp de atencion al cliente para Negocios
-- Ejecuta este script en el SQL Editor de tu consola de Supabase.
-- =============================================================================

alter table negocios add column if not exists telefono text default '';
