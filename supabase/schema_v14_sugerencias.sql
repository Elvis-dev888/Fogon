-- =============================================================================
-- Kiosko - Schema v14: Buzón de sugerencias e ideas de negocios
-- Ejecuta este script en el SQL Editor de tu consola de Supabase.
-- =============================================================================

create table if not exists sugerencias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid references negocios(id) on delete cascade,
  negocio_nombre text not null default '',
  usuario_email text not null default '',
  tipo text not null default 'idea', -- 'idea', 'mejora', 'error', 'otro'
  titulo text not null default '',
  mensaje text not null,
  estado text not null default 'Pendiente', -- 'Pendiente', 'En revisión', 'Planeada', 'Implementada'
  creado_en timestamptz not null default now()
);

-- Habilitar RLS
alter table sugerencias enable row level security;

-- Políticas de acceso
drop policy if exists "Cualquier usuario autenticado puede enviar sugerencias" on sugerencias;
create policy "Cualquier usuario autenticado puede enviar sugerencias"
on sugerencias for insert to authenticated with check (true);

drop policy if exists "Usuarios autenticados pueden ver sugerencias" on sugerencias;
create policy "Usuarios autenticados pueden ver sugerencias"
on sugerencias for select to authenticated using (true);

drop policy if exists "Usuarios autenticados pueden actualizar sugerencias" on sugerencias;
create policy "Usuarios autenticados pueden actualizar sugerencias"
on sugerencias for update to authenticated using (true);

drop policy if exists "Usuarios autenticados pueden eliminar sugerencias" on sugerencias;
create policy "Usuarios autenticados pueden eliminar sugerencias"
on sugerencias for delete to authenticated using (true);

