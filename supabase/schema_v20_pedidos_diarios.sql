-- =============================================================================
-- Kiosko - Schema v20: Reinicio de pedidos (#1, #2, #3...) cada nuevo día
-- Pega este archivo completo en el SQL Editor de tu consola de Supabase y dale "Run".
-- =============================================================================

-- Actualiza la función del disparador para que cada negocio numere sus pedidos
-- empezando desde 1 con el primer pedido de cada nuevo día según la hora local de Colombia (America/Bogota).
create or replace function set_pedido_numero()
returns trigger as $$
begin
  select coalesce(max(numero), 0) + 1 into new.numero
  from pedidos
  where negocio_id = new.negocio_id
    and date(creado_en at time zone 'America/Bogota') = date(coalesce(new.creado_en, now()) at time zone 'America/Bogota');
  return new;
end;
$$ language plpgsql;

-- Asegura que el disparador esté activo antes de cada inserción en pedidos
drop trigger if exists trg_pedido_numero on pedidos;
create trigger trg_pedido_numero
before insert on pedidos
for each row execute function set_pedido_numero();
