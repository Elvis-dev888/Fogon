-- ============================================================
-- KIOSKO — Etapa 13: modo Inventario y utilidades
-- ------------------------------------------------------------
-- No modifica negocios existentes: todos conservan el modo
-- "catalogo" con sus productos, clientes y pedidos actuales.
-- Ejecuta este archivo una sola vez en el SQL Editor de Supabase.
-- ============================================================

alter table negocios
  add column if not exists modo_operacion text not null default 'catalogo'
  check (modo_operacion in ('catalogo', 'inventario'));

alter table ingredientes
  add column if not exists precio_venta numeric not null default 0;

-- La función anterior tiene cinco argumentos. Se reemplaza para que
-- los negocios nuevos puedan elegir el modo sin crear ambigüedad.
drop function if exists crear_negocio_propio(text, text, text, text, text);

create function crear_negocio_propio(
  p_nombre text,
  p_slogan text,
  p_emoji text,
  p_tipo text default null,
  p_descripcion text default null,
  p_modo_operacion text default 'catalogo'
)
returns negocios
language plpgsql security definer as $$
declare
  v_rol text;
  v_negocio negocios;
begin
  select rol into v_rol from perfiles where id = auth.uid();

  if v_rol is null then
    raise exception 'No encontramos tu perfil. Cierra sesión, vuelve a entrar e inténtalo de nuevo.';
  end if;
  if v_rol <> 'pendiente' then
    raise exception 'Esta cuenta ya tiene un negocio registrado o es de superadministrador.';
  end if;

  insert into negocios (nombre, slogan, emoji, estado, tipo, descripcion, modo_operacion)
  values (
    p_nombre,
    coalesce(p_slogan, ''),
    coalesce(p_emoji, '🍴'),
    'Activo',
    p_tipo,
    p_descripcion,
    case when p_modo_operacion = 'inventario' then 'inventario' else 'catalogo' end
  )
  returning * into v_negocio;

  insert into negocio_codigos (negocio_id, codigo)
  values (v_negocio.id, upper(substr(md5(random()::text || v_negocio.id::text), 1, 6)));

  update perfiles set rol = 'admin', negocio_id = v_negocio.id where id = auth.uid();

  return v_negocio;
end;
$$;

grant execute on function crear_negocio_propio(text, text, text, text, text, text) to authenticated;
