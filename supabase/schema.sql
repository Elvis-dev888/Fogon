-- =========================================================
-- FOGÓN — Esquema de base de datos para Supabase (PostgreSQL)
-- Pega este archivo completo en el SQL Editor de tu proyecto
-- de Supabase y dale "Run". Crea todas las tablas del
-- documento original: negocios, productos, categorías,
-- ingredientes, compras, pedidos, ventas, trabajadores,
-- pagos, ingresos y egresos — todas separadas por negocio_id.
-- =========================================================

create extension if not exists "pgcrypto";

-- Si ya corriste este script antes y falló a mitad de camino, esto limpia
-- cualquier tabla que haya alcanzado a crearse, para empezar de cero sin errores.
drop table if exists pagos, ingresos, egresos, pedido_items, ventas, pedidos,
  compras, trabajadores, ingredientes, productos, categorias, negocios cascade;

-- ---------------------------------------------------------
-- NEGOCIOS
-- ---------------------------------------------------------
create table negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slogan text default '',
  emoji text default '🍴',
  estado text not null default 'Activo' check (estado in ('Activo','Pausado')),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- CATEGORÍAS (propias de cada negocio)
-- ---------------------------------------------------------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  creado_en timestamptz not null default now(),
  unique (negocio_id, nombre)
);

-- ---------------------------------------------------------
-- PRODUCTOS
-- adiciones se guarda como jsonb: [{ "nombre": "Queso extra", "precio": 3000 }, ...]
-- ---------------------------------------------------------
create table productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  categoria text not null,
  precio numeric not null default 0,
  "desc" text default '',
  emoji text default '🍽️',
  disponible boolean not null default true,
  adiciones jsonb not null default '[]',
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- INGREDIENTES / INVENTARIO
-- ---------------------------------------------------------
create table ingredientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  unidad text not null default 'kg',
  stock numeric not null default 0,
  minimo numeric not null default 0,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- COMPRAS (aumentan inventario y son egreso)
-- ---------------------------------------------------------
create table compras (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  ingrediente_id uuid references ingredientes(id) on delete set null,
  cantidad numeric not null,
  valor numeric not null,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- PEDIDOS + ITEMS
-- ---------------------------------------------------------
create table pedidos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  numero integer,
  cliente text not null default 'Cliente',
  total numeric not null default 0,
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','En preparación','Listo','Entregado')),
  creado_en timestamptz not null default now()
);

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  nombre text not null,
  cantidad integer not null default 1,
  adiciones jsonb not null default '[]',
  observaciones text default '',
  subtotal numeric not null default 0
);

-- numera los pedidos de forma consecutiva DENTRO de cada negocio y se reinicia cada día (#1, #2, #3...)
create or replace function set_pedido_numero()
returns trigger as $$
begin
  select coalesce(max(numero), 0) + 1 into new.numero
  from pedidos
  where negocio_id = new.negocio_id
    and date(creado_en at time zone 'America/Bogota') = date(now() at time zone 'America/Bogota');
  return new;
end;
$$ language plpgsql;

create trigger trg_pedido_numero
before insert on pedidos
for each row execute function set_pedido_numero();

-- ---------------------------------------------------------
-- VENTAS (una por cada pedido confirmado)
-- ---------------------------------------------------------
create table ventas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  pedido_id uuid references pedidos(id) on delete set null,
  total numeric not null,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- TRABAJADORES + PAGOS
-- ---------------------------------------------------------
create table trabajadores (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  cargo text not null,
  pago numeric not null default 0,
  estado text not null default 'Activo' check (estado in ('Activo','Inactivo')),
  creado_en timestamptz not null default now()
);

create table pagos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  periodo text not null,
  valor numeric not null,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------
-- INGRESOS / EGRESOS manuales (aparte de ventas, compras y pagos)
-- ---------------------------------------------------------
create table ingresos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  concepto text not null,
  valor numeric not null,
  creado_en timestamptz not null default now()
);

create table egresos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  concepto text not null,
  valor numeric not null,
  creado_en timestamptz not null default now()
);

-- =========================================================
-- REALTIME — para que el cliente vea el estado del pedido
-- cambiar en vivo sin recargar la página
-- =========================================================
alter publication supabase_realtime add table pedidos;

-- =========================================================
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------
-- ETAPA 1 (la que usamos para probar todo primero, sin login):
-- políticas abiertas para que puedas desarrollar y probar la
-- app tranquilo. Las vamos a CERRAR en un paso posterior, una
-- vez tengas Supabase Auth funcionando con roles reales
-- (superadmin / admin de negocio). No dejes esta versión así
-- en producción real.
-- =========================================================
alter table negocios       enable row level security;
alter table categorias     enable row level security;
alter table productos      enable row level security;
alter table ingredientes   enable row level security;
alter table compras        enable row level security;
alter table pedidos        enable row level security;
alter table pedido_items   enable row level security;
alter table ventas         enable row level security;
alter table trabajadores   enable row level security;
alter table pagos          enable row level security;
alter table ingresos       enable row level security;
alter table egresos        enable row level security;

create policy "dev_all_negocios"     on negocios     for all using (true) with check (true);
create policy "dev_all_categorias"   on categorias   for all using (true) with check (true);
create policy "dev_all_productos"    on productos    for all using (true) with check (true);
create policy "dev_all_ingredientes" on ingredientes for all using (true) with check (true);
create policy "dev_all_compras"      on compras      for all using (true) with check (true);
create policy "dev_all_pedidos"      on pedidos      for all using (true) with check (true);
create policy "dev_all_pedido_items" on pedido_items for all using (true) with check (true);
create policy "dev_all_ventas"       on ventas       for all using (true) with check (true);
create policy "dev_all_trabajadores" on trabajadores for all using (true) with check (true);
create policy "dev_all_pagos"        on pagos        for all using (true) with check (true);
create policy "dev_all_ingresos"     on ingresos     for all using (true) with check (true);
create policy "dev_all_egresos"      on egresos      for all using (true) with check (true);

-- =========================================================
-- DATOS DE PRUEBA — El Rincón, tal como en el documento
-- =========================================================
insert into negocios (nombre, slogan, emoji) values
  ('El Rincón', 'Sabor de barrio, receta de casa', '🌽');

-- Guarda el id generado para usarlo abajo
do $$
declare rincon_id uuid;
begin
  select id into rincon_id from negocios where nombre = 'El Rincón' limit 1;

  insert into categorias (negocio_id, nombre) values
    (rincon_id,'Hamburguesas'),(rincon_id,'Especiales'),(rincon_id,'Arepas'),(rincon_id,'Chuzos'),(rincon_id,'Bebidas');

  insert into productos (negocio_id, nombre, categoria, precio, "desc", emoji, adiciones) values
    (rincon_id,'Sencilla','Hamburguesas',14000,'Carne, queso, salsas de la casa.','🍔',
      '[{"nombre":"Chicharrón extra","precio":4000},{"nombre":"Queso extra","precio":3000},{"nombre":"Tocineta","precio":3000}]'),
    (rincon_id,'Especial','Hamburguesas',18000,'Doble carne, tocineta y queso fundido.','🍔',
      '[{"nombre":"Chicharrón extra","precio":4000},{"nombre":"Queso extra","precio":3000}]'),
    (rincon_id,'Marranita tradicional','Arepas',8000,'Arepa de choclo con chicharrón.','🌽','[]'),
    (rincon_id,'Arepa con cuajada','Arepas',7000,'Arepa rellena de cuajada fresca.','🧀','[]'),
    (rincon_id,'Chuzo de pollo','Chuzos',13000,'Marinado 24 horas.','🍢','[]'),
    (rincon_id,'Coca-Cola 400ml','Bebidas',5000,'Bien fría.','🥤','[]');

  insert into ingredientes (negocio_id, nombre, unidad, stock, minimo) values
    (rincon_id,'Carne de res','kg',10,5),
    (rincon_id,'Pan de hamburguesa','und',40,15),
    (rincon_id,'Queso','kg',6,3),
    (rincon_id,'Chicharrón','kg',3,4);

  insert into trabajadores (negocio_id, nombre, cargo, pago) values
    (rincon_id,'Juan Pérez','Cocinero',1500000);
end $$;
