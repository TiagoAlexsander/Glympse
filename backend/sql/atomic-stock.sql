-- ────────────────────────────────────────────────────────────────────────────
-- Reserva de estoque atômica (previne overselling em compras simultâneas)
-- Rode este SQL UMA VEZ no Supabase: Dashboard → SQL Editor → cole → Run.
--
-- Recebe um array JSON [{ "variant_id": 1, "quantity": 2 }, ...] e reserva tudo
-- numa única transação. Se algum item não tiver estoque suficiente, NADA é
-- reservado (a transação é revertida) e retorna false.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function reservar_carrinho(p_items jsonb)
returns boolean
language plpgsql
as $$
declare
  it     jsonb;
  v_id   int;
  v_qty  int;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    v_id  := (it->>'variant_id')::int;
    v_qty := (it->>'quantity')::int;

    update inventory
      set reserved_quantity = reserved_quantity + v_qty
      where variant_id = v_id
        and (quantity - reserved_quantity) >= v_qty;

    -- Se nenhuma linha foi atualizada, não havia estoque suficiente
    if not found then
      raise exception 'estoque insuficiente para variante %', v_id;
    end if;
  end loop;
  return true;
exception when others then
  -- Qualquer falha reverte todas as reservas feitas acima
  return false;
end;
$$;
