alter table productos add column if not exists stock integer;
alter table pedido_items add column if not exists producto_id uuid references productos(id) on delete set null;

create or replace function sync_disponible_por_stock() returns trigger as $$
begin
  if new.stock is not null then
    new.disponible := new.stock > 0;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_disponible on productos;
create trigger trg_sync_disponible
before update on productos
for each row execute function sync_disponible_por_stock();

create or replace function descontar_stock_producto() returns trigger as $$
begin
  if new.producto_id is not null then
    update productos
    set stock = greatest(coalesce(stock, 0) - new.cantidad, 0)
    where id = new.producto_id and stock is not null;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_descontar_stock on pedido_items;
create trigger trg_descontar_stock
after insert on pedido_items
for each row execute function descontar_stock_producto();