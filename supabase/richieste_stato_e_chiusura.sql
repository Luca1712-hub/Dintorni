-- Esegui in Supabase → SQL Editor (dopo aver creato la tabella `richieste`).
-- Aggiunge stato aperta/chiusa, data chiusura, policy UPDATE e vincolo: si può solo chiudere.

alter table public.richieste add column if not exists stato text;
update public.richieste set stato = 'aperta' where stato is null;
alter table public.richieste alter column stato set default 'aperta';
alter table public.richieste alter column stato set not null;

alter table public.richieste drop constraint if exists richieste_stato_check;
alter table public.richieste add constraint richieste_stato_check check (stato in ('aperta', 'chiusa'));

alter table public.richieste add column if not exists chiusa_at timestamptz null;

drop policy if exists "richieste_update_own" on public.richieste;

create policy "richieste_update_own"
  on public.richieste for update
  using (auth.uid() = acquirente_id)
  with check (auth.uid() = acquirente_id);

grant update on table public.richieste to authenticated;

create or replace function public.richieste_allow_close_only()
returns trigger
language plpgsql
as $fn$
begin
  if old.stato = 'chiusa' then
    raise exception 'Richiesta gia` chiusa.';
  end if;
  if new.stato <> 'chiusa' then
    raise exception 'Puoi solo chiudere la richiesta.';
  end if;
  if new.testo is distinct from old.testo
     or new.zona_tipo is distinct from old.zona_tipo
     or new.raggio_km is distinct from old.raggio_km
     or new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.comune is distinct from old.comune
     or new.categorie is distinct from old.categorie
     or new.acquirente_id is distinct from old.acquirente_id
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Non puoi modificare il contenuto della richiesta.';
  end if;
  if new.chiusa_at is null then
    new.chiusa_at := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists richieste_update_close_only on public.richieste;

create trigger richieste_update_close_only
  before update on public.richieste
  for each row
  execute function public.richieste_allow_close_only();
