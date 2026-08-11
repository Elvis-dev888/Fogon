-- ============================================================
-- FOGÓN — Etapa 5: reclamar un negocio que ya existe (como El Rincón)
-- ------------------------------------------------------------
-- Soluciona esto: "El Rincón" se creó directo por SQL de prueba,
-- así que no tiene ningún usuario/contraseña asociado todavía.
-- Con esto, el dueño real se registra normal (correo + contraseña,
-- confirma su correo) y en vez de llenar el formulario de negocio
-- nuevo, elige "Reclamar un negocio ya registrado" y selecciona
-- El Rincón — queda vinculado a su cuenta, sin duplicar nada.
-- ============================================================

-- Lista los negocios que TODAVÍA no tienen ningún admin vinculado.
-- Solo expone nombre/slogan/emoji — no expone quién es nadie.
create or replace function negocios_sin_admin()
returns setof negocios
language sql security definer stable as $$
  select n.* from negocios n
  where not exists (select 1 from perfiles p where p.negocio_id = n.id)
  order by n.creado_en;
$$;

grant execute on function negocios_sin_admin() to authenticated;

-- El usuario 'pendiente' reclama uno de esos negocios como suyo.
-- Se bloquea solo si: no está 'pendiente', o el negocio ya tiene dueño.
create or replace function reclamar_negocio_existente(p_negocio_id uuid)
returns negocios
language plpgsql security definer as $$
declare
  v_rol text;
  v_ya_tiene_dueno boolean;
  v_negocio negocios;
begin
  select rol into v_rol from perfiles where id = auth.uid();
  if v_rol is distinct from 'pendiente' then
    raise exception 'Esta cuenta ya tiene un negocio asignado o no tiene permiso.';
  end if;

  select exists(select 1 from perfiles where negocio_id = p_negocio_id) into v_ya_tiene_dueno;
  if v_ya_tiene_dueno then
    raise exception 'Ese negocio ya tiene un administrador asignado.';
  end if;

  select * into v_negocio from negocios where id = p_negocio_id;
  if v_negocio.id is null then
    raise exception 'No encontramos ese negocio.';
  end if;

  update perfiles set rol = 'admin', negocio_id = p_negocio_id where id = auth.uid();

  -- si el negocio no tenía código de acceso para empleados (por venir de un seed viejo), se lo creamos
  insert into negocio_codigos (negocio_id, codigo)
  select p_negocio_id, upper(substr(md5(random()::text || p_negocio_id::text), 1, 6))
  where not exists (select 1 from negocio_codigos where negocio_id = p_negocio_id);

  return v_negocio;
end;
$$;

grant execute on function reclamar_negocio_existente(uuid) to authenticated;
