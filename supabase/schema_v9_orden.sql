-- ============================================================
-- FOGÓN — Etapa 9: orden fijo de los productos
-- ============================================================

alter table productos add column if not exists orden integer;

with numerados as (
  select id, row_number() over (partition by negocio_id, categoria order by creado_en) as rn
  from productos
  where orden is null
)
update productos p set orden = numerados.rn
from numerados
where p.id = numerados.id;

alter table productos alter column orden set default 0;
alter table productos alter column orden set not null;