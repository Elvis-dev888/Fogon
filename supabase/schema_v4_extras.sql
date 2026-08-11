-- ============================================================
-- FOGÓN — Etapa 4: fotos de producto + registro del primer superadmin
-- ------------------------------------------------------------
-- Corre esto DESPUÉS de schema_v3_empleados.sql. No borra nada.
-- ============================================================

-- ---------- 1) Columna para la foto del producto ----------
alter table productos add column if not exists imagen_url text;

-- ---------- 2) Bucket de Storage para las fotos ----------
-- (si ya existe, esto no lo duplica)
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do nothing;

-- Cualquiera puede VER las fotos (catálogo público)
drop policy if exists "productos_fotos_lectura_publica" on storage.objects;
create policy "productos_fotos_lectura_publica" on storage.objects
  for select using (bucket_id = 'productos');

-- Solo el admin dueño del negocio (según la carpeta negocio_id/archivo.jpg)
-- o el superadmin pueden subir, reemplazar o borrar fotos.
drop policy if exists "productos_fotos_sube_dueno" on storage.objects;
create policy "productos_fotos_sube_dueno" on storage.objects
  for insert with check (
    bucket_id = 'productos'
    and (es_superadmin() or es_admin_del_negocio(((storage.foldername(name))[1])::uuid))
  );

drop policy if exists "productos_fotos_actualiza_dueno" on storage.objects;
create policy "productos_fotos_actualiza_dueno" on storage.objects
  for update using (
    bucket_id = 'productos'
    and (es_superadmin() or es_admin_del_negocio(((storage.foldername(name))[1])::uuid))
  );

drop policy if exists "productos_fotos_borra_dueno" on storage.objects;
create policy "productos_fotos_borra_dueno" on storage.objects
  for delete using (
    bucket_id = 'productos'
    and (es_superadmin() or es_admin_del_negocio(((storage.foldername(name))[1])::uuid))
  );

-- ---------- 3) Registro del PRIMER superadmin (una sola vez, nunca más) ----------
-- Cualquiera con una cuenta 'pendiente' puede llamar esto, PERO solo funciona
-- si todavía no existe ningún superadmin en la plataforma. En cuanto exista
-- uno (tú), esta función queda inútil para siempre — nadie más puede usarla.
create or replace function reclamar_superadmin()
returns void
language plpgsql security definer as $$
declare
  v_rol text;
begin
  if exists (select 1 from perfiles where rol = 'superadmin') then
    raise exception 'Ya existe un superadministrador registrado en esta plataforma.';
  end if;

  select rol into v_rol from perfiles where id = auth.uid();
  if v_rol is distinct from 'pendiente' then
    raise exception 'Esta cuenta ya está asignada a un negocio y no puede convertirse en superadmin.';
  end if;

  update perfiles set rol = 'superadmin', negocio_id = null where id = auth.uid();
end;
$$;

grant execute on function reclamar_superadmin() to authenticated;

-- ---------- 4) Más datos del negocio al registrarlo (tipo + descripción) ----------
alter table negocios add column if not exists tipo text;
alter table negocios add column if not exists descripcion text;

-- Reemplaza la función de registro para que reciba también tipo y descripción
-- (la versión anterior de 3 parámetros se elimina para que no quede ambigüedad)
drop function if exists crear_negocio_propio(text, text, text);

create or replace function crear_negocio_propio(
  p_nombre text, p_slogan text, p_emoji text,
  p_tipo text default null, p_descripcion text default null
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

  insert into negocios (nombre, slogan, emoji, estado, tipo, descripcion)
  values (p_nombre, coalesce(p_slogan, ''), coalesce(p_emoji, '🍴'), 'Activo', p_tipo, p_descripcion)
  returning * into v_negocio;

  insert into negocio_codigos (negocio_id, codigo)
  values (v_negocio.id, upper(substr(md5(random()::text || v_negocio.id::text), 1, 6)));

  update perfiles set rol = 'admin', negocio_id = v_negocio.id where id = auth.uid();

  return v_negocio;
end;
$$;
