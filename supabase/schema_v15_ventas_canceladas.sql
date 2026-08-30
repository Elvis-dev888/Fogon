-- =============================================================================
-- Kiosko - Schema v15: Corrección de ventas en pedidos cancelados
-- =============================================================================

-- 1. Habilitar políticas completas de borrado y actualización en la tabla ventas
drop policy if exists "ventas_borrado_publico" on ventas;
create policy "ventas_borrado_publico" on ventas for delete using (true);

drop policy if exists "ventas_actualiza_publica" on ventas;
create policy "ventas_actualiza_publica" on ventas for update using (true) with check (true);

-- 2. Gatillo en base de datos: Cada vez que un pedido pase a 'Cancelado',
-- elimina automáticamente cualquier registro en 'ventas' asociado a ese pedido.
create or replace function trg_limpiar_venta_pedido_cancelado()
returns trigger as $$
begin
  if NEW.estado = 'Cancelado' then
    delete from ventas where pedido_id = NEW.id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_pedidos_cancelado_limpia_ventas on pedidos;
create trigger trg_pedidos_cancelado_limpia_ventas
after update on pedidos
for each row
when (NEW.estado = 'Cancelado')
execute function trg_limpiar_venta_pedido_cancelado();

-- 3. Limpieza inmediata: Borrar cualquier venta existente que pertenezca a un pedido ya cancelado
delete from ventas where pedido_id in (select id from pedidos where estado = 'Cancelado');