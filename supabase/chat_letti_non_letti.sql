-- Messaggi letti / non letti per conversazione.
-- Esegui in Supabase → SQL Editor (dopo chat_e_allegati.sql).

alter table public.conversazioni
  add column if not exists acquirente_ultima_lettura_at timestamptz,
  add column if not exists negozio_ultima_lettura_at timestamptz;

-- Aggiorna solo la colonna del partecipante collegato (nessuna UPDATE diretta su conversazioni dal client).
create or replace function public.marca_conversazione_letta(p_conversazione_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversazioni c
  set
    acquirente_ultima_lettura_at = case
      when c.acquirente_id = (select auth.uid()) then now()
      else c.acquirente_ultima_lettura_at
    end,
    negozio_ultima_lettura_at = case
      when c.negozio_id = (select auth.uid()) then now()
      else c.negozio_ultima_lettura_at
    end
  where c.id = p_conversazione_id
    and (c.acquirente_id = (select auth.uid()) or c.negozio_id = (select auth.uid()));
end;
$$;

revoke all on function public.marca_conversazione_letta(uuid) from public;
grant execute on function public.marca_conversazione_letta(uuid) to authenticated;

-- Conteggio messaggi non letti per richiesta (somma tutte le conversazioni visibili all'utente).
create or replace function public.unread_chat_per_richiesta()
returns table (richiesta_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select c.richiesta_id, count(*)::bigint
  from public.conversazioni c
  join public.messaggi m on m.conversazione_id = c.id
  where
    (
      c.acquirente_id = auth.uid()
      and m.mittente_id is distinct from c.acquirente_id
      and (
        c.acquirente_ultima_lettura_at is null
        or m.created_at > c.acquirente_ultima_lettura_at
      )
    )
    or
    (
      c.negozio_id = auth.uid()
      and m.mittente_id is distinct from c.negozio_id
      and (
        c.negozio_ultima_lettura_at is null
        or m.created_at > c.negozio_ultima_lettura_at
      )
    )
  group by c.richiesta_id;
$$;

revoke all on function public.unread_chat_per_richiesta() from public;
grant execute on function public.unread_chat_per_richiesta() to authenticated;

-- Conteggio per singola conversazione (tab acquirente: un badge per negozio).
create or replace function public.unread_chat_per_conversazione()
returns table (conversazione_id uuid, unread_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select c.id as conversazione_id, count(*)::bigint
  from public.conversazioni c
  join public.messaggi m on m.conversazione_id = c.id
  where c.acquirente_id = auth.uid()
    and m.mittente_id is distinct from c.acquirente_id
    and (
      c.acquirente_ultima_lettura_at is null
      or m.created_at > c.acquirente_ultima_lettura_at
    )
  group by c.id
  union all
  select c.id, count(*)::bigint
  from public.conversazioni c
  join public.messaggi m on m.conversazione_id = c.id
  where c.negozio_id = auth.uid()
    and m.mittente_id is distinct from c.negozio_id
    and (
      c.negozio_ultima_lettura_at is null
      or m.created_at > c.negozio_ultima_lettura_at
    )
  group by c.id;
$$;

revoke all on function public.unread_chat_per_conversazione() from public;
grant execute on function public.unread_chat_per_conversazione() to authenticated;
