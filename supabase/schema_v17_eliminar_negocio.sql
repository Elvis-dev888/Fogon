-- ========================================================================
-- Schema v17: Función para eliminación completa de negocios por Superadmin
-- ========================================================================

-- 1. Política para borrado en negocios (si no existía)
drop policy if exists "negocios_superadmin_borra" on negocios;
create policy "negocios_superadmin_borra" on negocios
  for delete using (es_superadmin());

-- 2. Función segura con elevación de privilegios (security definer)
create or replace function eliminar_negocio_superadmin(p_negocio_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Verificar que quien llama es superadmin
  if not es_superadmin() then
    raise exception 'Solo el superadministrador puede eliminar negocios.';
  end if;

  -- Desvincular perfiles asociados para que no queden huérfanos
  update perfiles 
  set negocio_id = null, rol = 'pendiente' 
  where negocio_id = p_negocio_id;

  -- Eliminar el negocio. Todas las tablas hijas (productos, categorías,
  -- ingredientes, compras, pedidos, pedido_items, ventas, trabajadores,
  -- pagos, ingresos, egresos, sugerencias, negocio_codigos)
  -- se eliminarán automáticamente por ON DELETE CASCADE.
  delete from negocios where id = p_negocio_id;
end;
$$;

grant execute on function eliminar_negocio_superadmin(uuid) to authenticated;
