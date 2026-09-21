-- =============================================================================
-- Kiosko - Schema v21: Correo del Dueño para Superadmin y Consulta de Negocios
-- Pega este script en el SQL Editor de tu consola de Supabase y dale "Run".
-- =============================================================================

-- 1. Agregar columna email a la tabla perfiles si no existe
alter table perfiles add column if not exists email text;

-- 2. Poblar el email de los perfiles existentes directamente desde auth.users
update perfiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 3. Actualizar el trigger para que cualquier usuario nuevo guarde su email en perfiles
create or replace function handle_new_auth_user_fogon() returns trigger as $$
begin
  insert into perfiles (id, rol, email) values (new.id, 'pendiente', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

-- 4. Función RPC para que el Superadmin consulte todos los negocios con el correo del dueño
create or replace function obtener_negocios_superadmin()
returns table (
  id uuid,
  nombre text,
  slogan text,
  emoji text,
  estado text,
  logo_url text,
  modo_operacion text,
  creado_en timestamptz,
  is_vip boolean,
  dueno_email text,
  dueno_id uuid
)
language sql security definer as $$
  select 
    n.id,
    n.nombre,
    n.slogan,
    n.emoji,
    n.estado,
    n.logo_url,
    n.modo_operacion,
    n.creado_en,
    coalesce(n.is_vip, false) as is_vip,
    coalesce(u.email, p.email, 'Sin correo vinculado') as dueno_email,
    p.id as dueno_id
  from negocios n
  left join perfiles p on p.negocio_id = n.id and p.rol = 'admin'
  left join auth.users u on u.id = p.id
  order by n.creado_en desc;
$$;

-- 5. Dar permisos de ejecución a usuarios autenticados
grant execute on function obtener_negocios_superadmin() to authenticated;
