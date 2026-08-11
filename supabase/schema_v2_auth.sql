-- ============================================================
-- FOGÓN — Etapa 2: login real con roles (superadmin / admin / pendiente)
-- ------------------------------------------------------------
-- Pega este archivo COMPLETO en el SQL Editor de tu proyecto de
-- Supabase y dale "Run". A diferencia de schema.sql, este NO
-- borra tus tablas ni tus datos — solo agrega lo que falta para
-- que el login funcione: la tabla `perfiles`, la función que crea
-- el negocio de cada admin, y cierra los permisos abiertos
-- ("dev_all_...") por permisos reales basados en el rol de quien
-- hace la petición.
-- ============================================================

-- ---------- PERFILES (uno por cada cuenta de Supabase Auth) ----------
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null default 'pendiente' check (rol in ('pendiente', 'admin', 'superadmin')),
  negocio_id uuid references negocios(id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table perfiles enable row level security;

-- ---------- Funciones de apoyo (evitan recursión en las políticas) ----------
create or replace function auth_rol()
returns text language sql stable security definer as $$
  select rol from perfiles where id = auth.uid();
$$;

create or replace function auth_negocio_id()
returns uuid language sql stable security definer as $$
  select negocio_id from perfiles where id = auth.uid();
$$;

create or replace function es_superadmin()
returns boolean language sql stable security definer as $$
  select coalesce((select rol = 'superadmin' from perfiles where id = auth.uid()), false);
$$;

create or replace function es_admin_del_negocio(p_negocio_id uuid)
returns boolean language sql stable security definer as $$
  select coalesce((select rol = 'admin' and negocio_id = p_negocio_id from perfiles where id = auth.uid()), false);
$$;

-- ---------- Trigger: cada cuenta nueva de Supabase Auth arranca "pendiente" ----------
create or replace function handle_new_auth_user_fogon() returns trigger as $$
begin
  insert into perfiles (id, rol) values (new.id, 'pendiente')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_fogon on auth.users;
create trigger on_auth_user_created_fogon
after insert on auth.users
for each row execute function handle_new_auth_user_fogon();

-- ---------- RPC: crea el negocio del admin que se acaba de registrar ----------
-- Solo funciona UNA vez por cuenta (si ya tiene negocio o es superadmin, falla).
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

  update perfiles set rol = 'admin', negocio_id = v_negocio.id where id = auth.uid();

  return v_negocio;
end;
$$;

-- ---------- Políticas de `perfiles` ----------
drop policy if exists "perfiles_propio" on perfiles;
create policy "perfiles_propio" on perfiles for select using (id = auth.uid());

drop policy if exists "perfiles_superadmin_todo" on perfiles;
create policy "perfiles_superadmin_todo" on perfiles for all using (es_superadmin()) with check (es_superadmin());

-- ============================================================
-- CERRAR LOS PERMISOS ABIERTOS ("dev_all_...") DE schema.sql
-- Regla: lectura sigue abierta donde el cliente la necesita
-- (catálogo público, seguimiento de pedidos); ESCRITURA queda
-- restringida al admin dueño del negocio o al superadmin.
-- ============================================================

-- NEGOCIOS: lectura pública (para el listado de clientes y el panel superadmin),
-- solo el superadmin crea/edita/pausa negocios directamente en la tabla
-- (el admin lo hace una vez, a través del RPC de arriba, que sí tiene permiso).
drop policy if exists "dev_all_negocios" on negocios;
create policy "negocios_lectura_publica" on negocios for select using (true);
create policy "negocios_superadmin_escribe" on negocios for insert with check (es_superadmin());
create policy "negocios_superadmin_actualiza" on negocios for update using (es_superadmin());
create policy "negocios_superadmin_borra" on negocios for delete using (es_superadmin());

-- CATEGORÍAS / PRODUCTOS: lectura pública (catálogo del cliente),
-- escritura solo del admin dueño del negocio o superadmin.
drop policy if exists "dev_all_categorias" on categorias;
create policy "categorias_lectura_publica" on categorias for select using (true);
create policy "categorias_gestion" on categorias for insert with check (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "categorias_actualiza" on categorias for update using (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "categorias_borra" on categorias for delete using (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_productos" on productos;
create policy "productos_lectura_publica" on productos for select using (true);
create policy "productos_gestion" on productos for insert with check (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "productos_actualiza" on productos for update using (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "productos_borra" on productos for delete using (es_admin_del_negocio(negocio_id) or es_superadmin());

-- INGREDIENTES / COMPRAS / TRABAJADORES / PAGOS / INGRESOS / EGRESOS:
-- son internos del negocio — nada de esto se muestra al cliente,
-- así que lectura Y escritura quedan solo para el admin dueño o superadmin.
drop policy if exists "dev_all_ingredientes" on ingredientes;
create policy "ingredientes_negocio" on ingredientes for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_compras" on compras;
create policy "compras_negocio" on compras for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_trabajadores" on trabajadores;
create policy "trabajadores_negocio" on trabajadores for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_pagos" on pagos;
create policy "pagos_negocio" on pagos for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_ingresos" on ingresos;
create policy "ingresos_negocio" on ingresos for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_egresos" on egresos;
create policy "egresos_negocio" on egresos for all
  using (es_admin_del_negocio(negocio_id) or es_superadmin())
  with check (es_admin_del_negocio(negocio_id) or es_superadmin());

-- PEDIDOS / PEDIDO_ITEMS / VENTAS: el cliente NO inicia sesión, así que
-- necesitan seguir aceptando lectura y creación públicas (para poder pedir
-- y seguir su pedido sin cuenta). Lo que sí se cierra es quién puede
-- CAMBIAR EL ESTADO de un pedido (solo cocina/admin del negocio).
drop policy if exists "dev_all_pedidos" on pedidos;
create policy "pedidos_lectura_publica" on pedidos for select using (true);
create policy "pedidos_creacion_publica" on pedidos for insert with check (true);
create policy "pedidos_actualiza_negocio" on pedidos for update using (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "pedidos_borra_negocio" on pedidos for delete using (es_admin_del_negocio(negocio_id) or es_superadmin());

drop policy if exists "dev_all_pedido_items" on pedido_items;
create policy "pedido_items_lectura_publica" on pedido_items for select using (true);
create policy "pedido_items_creacion_publica" on pedido_items for insert with check (true);

drop policy if exists "dev_all_ventas" on ventas;
create policy "ventas_lectura_negocio" on ventas for select using (es_admin_del_negocio(negocio_id) or es_superadmin());
create policy "ventas_creacion_publica" on ventas for insert with check (true);

-- ============================================================
-- Realtime para pedido_items también (para que el tablero del
-- admin se refresque solo cuando llegan los productos del pedido)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pedido_items'
  ) then
    alter publication supabase_realtime add table pedido_items;
  end if;
end $$;
