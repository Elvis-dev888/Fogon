-- ============================================================
-- FOGÓN — Etapa 3: rol "empleado" (el que atiende)
-- ------------------------------------------------------------
-- Ejecuta esto en el SQL Editor DESPUÉS de haber corrido
-- schema_v2_auth.sql. No borra nada de lo que ya tienes.
--
-- Cómo funciona: el dueño (admin) tiene un código corto de su
-- negocio (6 caracteres). Se lo pasa de palabra o por WhatsApp
-- a la persona que atiende. Esa persona crea su propia cuenta
-- en la pestaña "Empleado", pone el código UNA vez, y desde ahí
-- entra con su propio correo — sin usar el usuario del dueño.
-- El empleado solo puede VER y AVANZAR pedidos; no toca
-- productos, precios, finanzas ni trabajadores.
-- ============================================================

-- "empleado" ahora es un rol válido
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check check (rol in ('pendiente', 'admin', 'empleado', 'superadmin'));

-- Código de acceso de cada negocio — en tabla APARTE (no en `negocios`) para que
-- no quede visible en la lectura pública del catálogo. Solo el admin del negocio
-- (o el superadmin) puede leerlo.
create table if not exists negocio_codigos (
  negocio_id uuid primary key references negocios(id) on delete cascade,
  codigo text not null unique,
  actualizado_en timestamptz not null default now()
);

alter table negocio_codigos enable row level security;

drop policy if exists "negocio_codigos_admin" on negocio_codigos;
create policy "negocio_codigos_admin" on negocio_codigos for select using (es_admin_del_negocio(negocio_id) or es_superadmin());

-- Genera un código para los negocios que ya existían (como "El Rincón")
insert into negocio_codigos (negocio_id, codigo)
select id, upper(substr(md5(random()::text || id::text), 1, 6)) from negocios
where id not in (select negocio_id from negocio_codigos)
on conflict do nothing;

-- Vuelve a crear el RPC de registro de negocio para que también le genere su código
create or replace function crear_negocio_propio(p_nombre text, p_slogan text, p_emoji text)
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

  insert into negocios (nombre, slogan, emoji, estado)
  values (p_nombre, coalesce(p_slogan, ''), coalesce(p_emoji, '🍴'), 'Activo')
  returning * into v_negocio;

  insert into negocio_codigos (negocio_id, codigo)
  values (v_negocio.id, upper(substr(md5(random()::text || v_negocio.id::text), 1, 6)));

  update perfiles set rol = 'admin', negocio_id = v_negocio.id where id = auth.uid();

  return v_negocio;
end;
$$;

-- ¿Esta cuenta es admin O empleado de este negocio? (para políticas)
create or replace function es_staff_del_negocio(p_negocio_id uuid)
returns boolean language sql stable security definer as $$
  select coalesce((select rol in ('admin', 'empleado') and negocio_id = p_negocio_id from perfiles where id = auth.uid()), false);
$$;

-- RPC: el empleado se une a un negocio con el código que le dio el dueño
create or replace function unirse_como_empleado(p_codigo text)
returns negocios
language plpgsql security definer as $$
declare
  v_rol text;
  v_negocio negocios;
begin
  select rol into v_rol from perfiles where id = auth.uid();
  if v_rol is null then
    raise exception 'No encontramos tu perfil. Cierra sesión y vuelve a entrar.';
  end if;
  if v_rol <> 'pendiente' then
    raise exception 'Esta cuenta ya está asignada a un negocio, o es de otro tipo.';
  end if;

  select n.* into v_negocio
  from negocios n join negocio_codigos c on c.negocio_id = n.id
  where upper(c.codigo) = upper(trim(p_codigo));

  if v_negocio.id is null then
    raise exception 'Ese código no corresponde a ningún negocio. Pídeselo de nuevo al dueño.';
  end if;

  update perfiles set rol = 'empleado', negocio_id = v_negocio.id where id = auth.uid();
  return v_negocio;
end;
$$;

-- RPC: el dueño puede regenerar el código (por si lo compartió de más o cambia de empleado)
create or replace function regenerar_codigo_negocio()
returns text
language plpgsql security definer as $$
declare
  v_negocio_id uuid;
  v_rol text;
  v_codigo text;
begin
  select rol, negocio_id into v_rol, v_negocio_id from perfiles where id = auth.uid();
  if v_rol <> 'admin' or v_negocio_id is null then
    raise exception 'Solo el administrador de un negocio puede regenerar el código.';
  end if;
  v_codigo := upper(substr(md5(random()::text), 1, 6));
  update negocio_codigos set codigo = v_codigo, actualizado_en = now() where negocio_id = v_negocio_id;
  return v_codigo;
end;
$$;

-- El empleado puede avanzar el estado de los pedidos de su negocio (atender),
-- igual que el admin — pero sigue sin poder tocar productos, finanzas ni trabajadores
-- (esas tablas siguen restringidas solo a es_admin_del_negocio en schema_v2_auth.sql).
drop policy if exists "pedidos_actualiza_negocio" on pedidos;
create policy "pedidos_actualiza_negocio" on pedidos for update using (es_staff_del_negocio(negocio_id) or es_superadmin());
