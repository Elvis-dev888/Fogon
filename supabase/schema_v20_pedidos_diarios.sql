-- =============================================================================
-- Kiosko - Schema v20: Reinicio de pedidos diarios y Cancelación desde la Web
-- Pega este archivo completo en el SQL Editor de tu consola de Supabase y dale "Run".
-- =============================================================================

-- 1. Reiniciar contador de pedidos cada nuevo día (#1, #2, #3...) por negocio
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

drop trigger if exists trg_pedido_numero on pedidos;
create trigger trg_pedido_numero
before insert on pedidos
for each row execute function set_pedido_numero();

-- 2. Permitir que el cliente cancele su pedido desde la web si aún está 'Pendiente'
--    Restaura automáticamente el stock y cancela el pedido en la base de datos.
create or replace function cancelar_pedido(p_pedido_id uuid, p_cancelado_por text default 'Cliente')
returns jsonb
language plpgsql
security definer
as $$
declare
  v_pedido pedidos%rowtype;
  v_item record;
begin
  select * into v_pedido from pedidos where id = p_pedido_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Pedido no encontrado');
  end if;

  if v_pedido.estado = 'Cancelado' then
    return jsonb_build_object('success', true, 'message', 'Ya estaba cancelado');
  end if;

  -- Seguridad: si no es empleado ni administrador, solo puede cancelar si sigue en estado Pendiente
  if v_pedido.estado != 'Pendiente' and not (
    auth.role() = 'authenticated' and (
      exists (select 1 from perfiles where id = auth.uid() and rol = 'superadmin') or
      exists (select 1 from perfiles where id = auth.uid() and (negocio_id = v_pedido.negocio_id or rol = 'admin'))
    )
  ) then
    return jsonb_build_object('success', false, 'error', 'El pedido ya está en preparación y no puede cancelarse');
  end if;

  -- Restaurar stock de los productos del pedido si tenían control de existencias
  for v_item in select producto_id, cantidad from pedido_items where pedido_id = p_pedido_id loop
    if v_item.producto_id is not null then
      update productos
      set stock = coalesce(stock, 0) + v_item.cantidad
      where id = v_item.producto_id and stock is not null;
    end if;
  end loop;

  -- Eliminar la venta asociada si existía
  delete from ventas where pedido_id = p_pedido_id;

  -- Marcar como Cancelado
  update pedidos
  set estado = 'Cancelado',
      cancelado_en = now(),
      cancelado_por = coalesce(nullif(trim(p_cancelado_por), ''), 'Cliente')
  where id = p_pedido_id;

  return jsonb_build_object('success', true);
end;
$$;

-- Otorgar permiso de ejecución a clientes anónimos de la web y a usuarios autenticados
grant execute on function cancelar_pedido(uuid, text) to anon, authenticated;

-- 3. Política RLS complementaria para permitir actualización directa a Cancelado si está Pendiente
drop policy if exists "pedidos_cliente_cancela_pendiente" on pedidos;
create policy "pedidos_cliente_cancela_pendiente"
  on pedidos
  for update
  using (estado = 'Pendiente')
  with check (estado = 'Cancelado');
