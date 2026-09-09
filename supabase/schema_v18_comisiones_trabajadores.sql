-- ============================================================
-- KIOSKO — Etapa 18: Esquemas de Pago y Comisiones por Venta
-- ------------------------------------------------------------
-- Soporta 3 modalidades de compensación:
-- 1. Sueldo Fijo ('fijo'): diario, semanal, quincenal, mensual.
-- 2. Solo Comisión ('comision'): % sobre ventas o $ fijo por prenda/artículo.
-- 3. Mixto ('mixto'): Sueldo base fijo + comisión por ventas.
-- Ejecuta este archivo en el SQL Editor de Supabase.
-- ============================================================

alter table trabajadores
  add column if not exists esquema_pago text not null default 'fijo'
  check (esquema_pago in ('fijo', 'comision', 'mixto'));

alter table trabajadores
  add column if not exists tipo_comision text not null default 'porcentaje'
  check (tipo_comision in ('porcentaje', 'monto_fijo'));

alter table trabajadores
  add column if not exists valor_comision numeric not null default 0;

alter table trabajadores
  add column if not exists frecuencia_pago text not null default 'mensual'
  check (frecuencia_pago in ('diario', 'semanal', 'quincenal', 'mensual'));

-- Permite almacenar metadata opcional de pagos (ej: concepto o tipo de liquidación)
alter table pagos
  add column if not exists tipo text default 'sueldo';

